# Platform Health Monitor — Spec V1

**Version**: 2026-05-26
**Status**: Specced, ready to build
**Owner**: Master
**Location**: `admin.matchup.asia/platform-health`

---

## 1. Mục tiêu

Cung cấp **một trang duy nhất** cho master/founder thấy được:
1. Các quota/limit của providers (Supabase, Vercel, Cloudflare, GitHub, domain) đang dùng bao nhiêu % so với trần plan hiện tại.
2. Cảnh báo **trước khi** đụng trần (gây sập app) hoặc trước khi bị **charge bất ngờ**.
3. Lịch sử usage để biết khi nào nên **nâng plan** hoặc tối ưu.

**Không phải**:
- Application performance monitoring (APM) — đó là việc của Sentry / Datadog.
- Public status page cho end-user — sẽ làm sau ở subdomain `status.matchup.asia`.
- Real-time log streaming — không cần ở giai đoạn này.

---

## 2. Quyết định kiến trúc

### 2.1 Vị trí: `admin.matchup.asia`, KHÔNG đặt trong app user

Lý do:
- Bundle size: charts + API tokens không pollute user bundle.
- Secret safety: tokens có quyền cao, không được tới browser của user.
- Permission: admin app đã có `RequireMaster` sẵn.
- Blast radius: lỗi monitor không ảnh hưởng user app.

### 2.2 Pull model qua Supabase Edge Function

```
┌──────────────────────┐
│  Supabase Edge Fn    │   cron mỗi 15 phút
│  poll-platform       │   ←─── pg_cron schedule
│  -metrics            │
└──┬───────────────────┘
   │ HTTP với secret tokens
   ├──→ Supabase Management API
   ├──→ Vercel REST API
   ├──→ Cloudflare GraphQL Analytics
   ├──→ GitHub Billing API
   ├──→ Domain WHOIS / RDAP
   └──→ Anthropic / OpenAI usage (sprint 2)

   ↓ insert
┌──────────────────────┐
│  platform_metrics    │   bảng snapshot, 1 row/poll/metric
│  platform_alerts     │   bảng alert lịch sử
└──┬───────────────────┘
   │ select (RLS master-only)
   ↓
┌──────────────────────┐
│  admin.matchup.asia  │   React, hiển thị charts + alerts
│  /platform-health    │
└──────────────────────┘

   ↓ khi alert mới
┌──────────────────────┐
│  send-alert-email Fn │   gửi email qua Resend / Supabase SMTP
└──────────────────────┘
```

### 2.3 Tại sao pull, không push?
Không provider nào có webhook báo "sắp đụng quota". Tất cả phải poll API. 15 phút là sweet spot:
- Đủ kịp thời cho metric thay đổi chậm (DB size, MAU).
- Không tốn quá nhiều edge function invocations (~3000/tháng — không đáng kể).

---

## 3. Metrics theo dõi (Sprint 1)

| # | Metric | Source | Polling | Warn | Critical |
|---|---|---|---|---|---|
| 1 | Supabase DB size | Mgmt API `/projects/{ref}/database/stats` hoặc SQL `pg_database_size()` | 15m | 70% | 90% |
| 2 | Supabase Auth MAU | Mgmt API `/projects/{ref}/usage` | 1h | 70% | 85% |
| 3 | Supabase egress bandwidth (tháng hiện tại) | Mgmt API usage endpoint | 1h | 60% (giữa tháng) hoặc 80% (cuối tháng) | 90% |
| 4 | Vercel bandwidth (tháng hiện tại) | `api.vercel.com/v1/usage` | 1h | 60% / 80% | 90% |
| 5 | Domain expiry (`matchup.asia`, `app.matchup.asia`) | RDAP `rdap.org/domain/{domain}` | 24h | < 60 ngày | < 14 ngày |
| 6 | Payment webhook success rate (24h rolling) | SQL aggregate trên `payment_events` table | 15m | < 99% | < 95% |

**Sprint 2** sẽ thêm:
- Cloudflare cache hit ratio, requests/sec
- AI provider token spend (Anthropic + OpenAI) — quan trọng để chống token storm
- GitHub Actions minutes (nếu CI dùng nhiều)
- App p95 latency (RUM browser-side)
- 5xx rate từ Supabase logs

---

## 4. Schema database

### 4.1 `platform_metrics` — snapshot mỗi poll
```sql
create table public.platform_metrics (
  id            bigserial primary key,
  metric_key    text not null,            -- 'supabase.db_size', 'vercel.bandwidth', ...
  value_num     numeric,                  -- giá trị raw (bytes, count, ...)
  limit_num     numeric,                  -- trần plan (NULL nếu không có)
  pct_used      numeric,                  -- value_num / limit_num * 100
  unit          text,                     -- 'bytes', 'count', 'days', 'percent'
  meta          jsonb,                    -- extra: { plan: 'pro', period_start: ... }
  collected_at  timestamptz not null default now()
);
create index on platform_metrics (metric_key, collected_at desc);
create index on platform_metrics (collected_at desc);
```

### 4.2 `platform_alerts` — lịch sử alert
```sql
create table public.platform_alerts (
  id           bigserial primary key,
  metric_key   text not null,
  severity     text not null check (severity in ('warn','critical')),
  pct_used     numeric,
  value_num    numeric,
  limit_num    numeric,
  message      text not null,
  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,             -- master bấm "ack" trong UI
  resolved_at     timestamptz              -- auto: khi metric < threshold trong N poll liên tiếp
);
create index on platform_alerts (triggered_at desc) where resolved_at is null;
```

### 4.3 RLS
```sql
alter table platform_metrics enable row level security;
alter table platform_alerts  enable row level security;

create policy "master read metrics" on platform_metrics for select using (is_master());
create policy "master read alerts"  on platform_alerts  for select using (is_master());
create policy "master ack alerts"   on platform_alerts  for update using (is_master());
-- INSERT chỉ qua service role từ edge function, không cần policy
```

### 4.4 Retention
- `platform_metrics`: giữ 90 ngày. Cron `delete from platform_metrics where collected_at < now() - interval '90 days'` chạy daily.
- `platform_alerts`: giữ 1 năm (acknowledged), 3 năm (critical).

---

## 5. Edge Function `poll-platform-metrics`

### 5.1 Secrets cần (set qua `supabase secrets set`)
```
SUPABASE_MGMT_TOKEN        # https://app.supabase.com/account/tokens
SUPABASE_PROJECT_REF       # fehyeonotpdkxfdtjaen
SUPABASE_ORG_ID            # cho usage endpoint
VERCEL_TOKEN               # https://vercel.com/account/tokens
VERCEL_TEAM_ID             # nếu có team
VERCEL_PROJECT_ID
CLOUDFLARE_API_TOKEN       # Sprint 2
CLOUDFLARE_ACCOUNT_ID      # Sprint 2
GITHUB_TOKEN               # PAT có quyền billing — Sprint 2
RESEND_API_KEY             # gửi alert email
ALERT_EMAIL_TO             # email nhận alert
```

### 5.2 Logic pseudo-code
```ts
export const handler = async () => {
  const collectors = [
    collectSupabaseDbSize,
    collectSupabaseAuthMAU,
    collectSupabaseEgress,
    collectVercelBandwidth,
    collectDomainExpiry,   // chỉ chạy nếu giờ chia hết 24
    collectWebhookSuccess,
  ];

  for (const collect of collectors) {
    try {
      const metric = await collect();        // { metric_key, value_num, limit_num, pct_used, meta }
      await insertMetric(metric);

      // Check threshold
      const severity = evalSeverity(metric);
      if (severity) {
        const existing = await findOpenAlert(metric.metric_key, severity);
        if (!existing) {
          await insertAlert(metric, severity);
          await sendAlertEmail(metric, severity);
        }
      } else {
        // Auto-resolve open alerts nếu metric đã trở về dưới threshold 3 poll liền
        await maybeResolveAlerts(metric.metric_key);
      }
    } catch (e) {
      console.error(`Collector ${collect.name} failed:`, e);
      // Không throw — 1 collector lỗi không nên kill cả cron
    }
  }
};
```

### 5.3 Threshold evaluator
```ts
const THRESHOLDS: Record<string, { warn: number; critical: number }> = {
  'supabase.db_size':       { warn: 70, critical: 90 },
  'supabase.auth_mau':      { warn: 70, critical: 85 },
  'supabase.egress':        { warn: 60, critical: 90 },
  'vercel.bandwidth':       { warn: 60, critical: 90 },
  'domain.matchup_asia':    { warn: 60, critical: 14 },     // ngày còn lại, ngược chiều
  'payment.webhook_success':{ warn: 99, critical: 95 },     // %, ngược chiều
};
```

### 5.4 Cron schedule
Dùng `pg_cron`:
```sql
select cron.schedule(
  'poll-platform-metrics',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://fehyeonotpdkxfdtjaen.supabase.co/functions/v1/poll-platform-metrics',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
     ); $$
);
```

---

## 6. UI: `admin.matchup.asia/platform-health`

### 6.1 Layout
```
┌────────────────────────────────────────────────────────┐
│ ← Admin · Platform Health                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│ [Hero summary]                                         │
│   2 critical · 1 warning · last poll: 3 min ago        │
│                                                        │
│ ── ACTIVE ALERTS ──                                    │
│ ⚠ critical  Supabase egress 92%  (since 4h)  [Ack]    │
│ ⚠ warn      Vercel bandwidth 65% (since 2d)  [Ack]    │
│                                                        │
│ ── METRICS ──                            [Refresh]    │
│ ┌──────────────────┐ ┌──────────────────┐             │
│ │ Supabase DB      │ │ Supabase MAU     │             │
│ │ ████░░░░ 320MB   │ │ ███░░░░░ 12.4K   │             │
│ │ 64% of 500MB     │ │ 24% of 50K       │             │
│ │ [sparkline 30d]  │ │ [sparkline 30d]  │             │
│ └──────────────────┘ └──────────────────┘             │
│ ┌──────────────────┐ ┌──────────────────┐             │
│ │ Supabase egress  │ │ Vercel bandwidth │             │
│ │ ███████░ 4.6GB   │ │ ███░░░░░ 28GB    │             │
│ │ 92% of 5GB ⚠     │ │ 28% of 100GB     │             │
│ └──────────────────┘ └──────────────────┘             │
│ ┌──────────────────┐ ┌──────────────────┐             │
│ │ Domain expiry    │ │ Webhook success  │             │
│ │ matchup.asia     │ │ 99.7% (24h)      │             │
│ │ 287 days left    │ │ 1247 ok / 4 fail │             │
│ └──────────────────┘ └──────────────────┘             │
│                                                        │
│ ── ALERT HISTORY (30d) ──                              │
│ [table: metric · severity · triggered · resolved]      │
└────────────────────────────────────────────────────────┘
```

### 6.2 Components
- `<MetricCard>`: progress bar + sparkline (recharts), color theo severity.
- `<AlertRow>`: severity icon + message + ack button.
- `<AlertHistoryTable>`: tanstack-table với filter severity + date range.

### 6.3 Data fetching
- `useQuery(['platform-metrics', '24h'])` — latest value mỗi metric + 30 ngày sparkline.
- `useQuery(['platform-alerts', 'open'])` — alerts chưa resolved.
- Auto-refetch mỗi 60s.

### 6.4 Ack action
Master bấm "Ack" → set `acknowledged_at = now()` qua RPC `ack_alert(alert_id)`. Alert vẫn open nhưng không ping email lại.

---

## 7. Email alert template

**Subject**: `[MatchUp Health · critical] Supabase egress 92%`

**Body** (HTML đơn giản):
```
Platform Health Alert
─────────────────────
Severity: CRITICAL
Metric:   Supabase egress bandwidth
Current:  4.6 GB / 5 GB (92%)
Triggered: 2026-05-26 14:32 UTC+7

Action: Upgrade Supabase plan to Pro before hitting 100%
        https://app.supabase.com/project/.../settings/billing

View dashboard: https://admin.matchup.asia/platform-health
```

Gửi qua **Resend** (free tier 3000 email/tháng — dư dùng).

---

## 8. Sprint plan

### Sprint 1 — Foundation (target: 2 ngày)
- [ ] Migration: `platform_metrics`, `platform_alerts`, RLS, retention cron
- [ ] Edge function `poll-platform-metrics` với 6 collector cơ bản
- [ ] Edge function `send-alert-email` (Resend)
- [ ] Secrets setup
- [ ] `pg_cron` schedule mỗi 15m
- [ ] Trang `admin.matchup.asia/platform-health` với MetricCards + AlertList
- [ ] Ack alert RPC + UI
- [ ] Smoke test: trigger 1 metric vượt threshold, confirm email + DB row

### Sprint 2 — Coverage (target: +2 ngày)
- [ ] Cloudflare metrics
- [ ] AI provider spend (Anthropic + OpenAI)
- [ ] GitHub Actions minutes
- [ ] Browser RUM cho p95 latency (chèn snippet vào app user)
- [ ] Alert history table với filter

### Sprint 3 — Polish (target: +1 ngày)
- [ ] Public status page `status.matchup.asia` (static, không auth)
- [ ] Slack/Discord webhook (optional ngoài email)
- [ ] Anomaly detection cho DAU drop > 30%

---

## 9. Non-goals
- KHÔNG làm APM (latency per-route, flame graphs) — dùng Sentry nếu cần.
- KHÔNG làm log search — dùng Supabase Logs Explorer trực tiếp.
- KHÔNG làm SLA/SLO dashboards cho user-facing — quá sớm.
- KHÔNG tracking per-user metrics — đã có Investor BI.

---

## 10. Open questions

| # | Câu hỏi | Default nếu không trả lời |
|---|---|---|
| 1 | Alert đi đâu? | Email tới `jun.gedvn@gmail.com` qua Resend |
| 2 | Có Slack/Discord không? | Không trong sprint 1 |
| 3 | Public status page? | Để sprint 3 |
| 4 | Provider thêm? (AI cost, GitHub) | Sprint 2 |
| 5 | Retention 90 ngày metrics OK? | Yes |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Edge function timeout (>10s) | Mỗi collector trong try/catch, không block |
| Provider API rate limit | 15m polling rất nhẹ; cache token gần expire |
| Token bị leak | Lưu trong Supabase Function secrets, không commit, RLS chặn read từ frontend |
| Alert email spam | Open-alert dedup; chỉ gửi lần đầu khi trigger, không gửi lại mỗi poll |
| Provider đổi API shape | Mỗi collector wrap try/catch, log to console, không kill cron |
| `pg_cron` không chạy | Backup: cron-job.org ping endpoint mỗi 15m (free) |

---

## 12. References

- [Supabase Management API](https://supabase.com/docs/reference/api/introduction)
- [Vercel REST API — Usage](https://vercel.com/docs/rest-api/endpoints/projects#get-project-usage)
- [Cloudflare GraphQL Analytics](https://developers.cloudflare.com/analytics/graphql-api/)
- [GitHub Billing API](https://docs.github.com/en/rest/billing)
- [Resend API](https://resend.com/docs/api-reference/introduction)
- [pg_cron docs](https://github.com/citusdata/pg_cron)
- RDAP for domain expiry: `https://rdap.org/domain/matchup.asia`
