# Platform Health — Setup Guide

> Đi kèm spec [06-platform-health.md](./06-platform-health.md). Hướng dẫn từng bước bro tự apply toàn bộ hạ tầng.

Estimated time: **30-45 phút** (không tính chờ verify domain).

---

## 0. Prereqs đã có (mình đã code)

- Migration `20260526200000_platform_health.sql` (tables + RLS + RPCs)
- Edge function `supabase/functions/poll-platform-metrics/`
- Edge function `supabase/functions/send-alert-email/`
- Trang admin `apps/admin/src/pages/platform-health/PlatformHealthPage.tsx`
- Nav entry trong sidebar admin: **Platform health**

---

## 1. Apply migration (5 phút)

```bash
cd "/Volumes/TPA DISK/01. TUAN PA/Jun AI/1. Project/22. MatchUp/MatchUp x ClaudeCode/matchupvn-ClaudeCode"
npx supabase db push
```

Verify trong Supabase Dashboard → Table Editor → thấy 2 bảng mới: `platform_metrics`, `platform_alerts`.

---

## 2. Tạo Resend account & API key (5 phút)

1. Vào **https://resend.com** → Sign up bằng email `jun.gedvn@gmail.com`.
2. Verify email.
3. **Add Domain** → nhập `matchup.asia` → Resend cho 4 DNS records (1 MX + 3 TXT/CNAME).
4. Vào nhà cung cấp DNS hiện tại (Cloudflare?) của `matchup.asia` → add 4 records đó.
5. Chờ DNS propagate (5-30 phút) → ở Resend nhấn **Verify**.
6. **API Keys** → **Create API Key** → đặt tên `matchup-alerts` → quyền **Sending access** → copy key (`re_...`). Đây là `RESEND_API_KEY`.

> Nếu chưa muốn chờ domain verify ngay: Resend cho gửi từ `onboarding@resend.dev` (free, không cần verify). Dùng tạm để test, đổi sau.

---

## 3. Tạo Supabase Management API token (3 phút)

1. https://app.supabase.com/account/tokens
2. **Generate new token** → đặt tên `matchup-health-monitor` → copy. Đây là `SUPABASE_MGMT_TOKEN`.
3. Project ref: trong `supabase/config.toml` đã có: `fehyeonotpdkxfdtjaen` (hoặc lấy từ URL Supabase Dashboard). Đây là `SUPABASE_PROJECT_REF`.

---

## 4. Tạo Vercel token (3 phút)

1. https://vercel.com/account/tokens
2. **Create Token** → name `matchup-health-monitor` → scope **Full access** (hoặc team-scoped nếu team) → expiry **No expiration** → copy. Đây là `VERCEL_TOKEN`.
3. Nếu app deploy dưới Team: vào Team Settings → **General** → copy Team ID. Đây là `VERCEL_TEAM_ID` (có thể bỏ qua nếu deploy cá nhân).

---

## 5. Set secrets cho edge functions (5 phút)

```bash
cd "/Volumes/TPA DISK/01. TUAN PA/Jun AI/1. Project/22. MatchUp/MatchUp x ClaudeCode/matchupvn-ClaudeCode"

# Replace <...> với giá trị thật:
npx supabase secrets set \
  SUPABASE_MGMT_TOKEN=<paste_token_from_step_3> \
  SUPABASE_PROJECT_REF=fehyeonotpdkxfdtjaen \
  VERCEL_TOKEN=<paste_token_from_step_4> \
  VERCEL_TEAM_ID=<paste_or_omit> \
  MONITOR_DOMAINS=matchup.asia,app.matchup.asia,admin.matchup.asia \
  PLAN_SUPABASE=free \
  PLAN_VERCEL=hobby \
  RESEND_API_KEY=<paste_re_key_from_step_2> \
  ALERT_EMAIL_FROM="alerts@matchup.asia" \
  ALERT_EMAIL_TO=jun.gedvn@gmail.com \
  ADMIN_BASE_URL=https://admin.matchup.asia
```

> Nếu chưa verify domain Resend, đặt `ALERT_EMAIL_FROM=onboarding@resend.dev`.

> Khi nâng cấp Supabase Pro / Vercel Pro, đổi `PLAN_SUPABASE=pro` / `PLAN_VERCEL=pro` để recompute thresholds.

Verify: `npx supabase secrets list` → thấy đủ các key.

---

## 6. Deploy edge functions (3 phút)

```bash
npx supabase functions deploy poll-platform-metrics
npx supabase functions deploy send-alert-email
```

---

## 7. Test thủ công (5 phút)

Test poll function chạy được:

```bash
# Lấy anon key từ supabase/.env hoặc Dashboard → API
ANON_KEY="<anon_key>"

curl -X POST "https://fehyeonotpdkxfdtjaen.supabase.co/functions/v1/poll-platform-metrics" \
  -H "Authorization: Bearer $ANON_KEY"
```

Phản hồi nên có:
```json
{
  "ok": true,
  "duration_ms": 1234,
  "ran": ["supabase.db_size", "supabase.auth_mau", "domain.matchup.asia", ...],
  "skipped": [],
  "errors": []
}
```

Vào Supabase → Table Editor → `platform_metrics` → thấy rows mới.

Vào `admin.matchup.asia/platform-health` → thấy các metric card hiện ra.

---

## 8. Schedule cron tự động (5 phút)

Vào Supabase Dashboard → **Database** → **Extensions** → bật `pg_cron` và `pg_net`.

Sau đó SQL Editor, paste:

```sql
-- Lấy URL function + 1 secret để cron verify (tạo 1 secret trong vault)
-- Cách đơn giản nhất: pass anon key qua header (giống test thủ công)

select cron.schedule(
  'poll-platform-metrics-every-15min',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://fehyeonotpdkxfdtjaen.supabase.co/functions/v1/poll-platform-metrics',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key' limit 1),
        'Content-Type', 'application/json'
      )
    ) as request_id;
  $$
);

-- Daily prune (giữ data 90 ngày)
select cron.schedule(
  'prune-platform-history',
  '0 3 * * *',  -- 3h sáng UTC
  $$ select public.prune_platform_history(); $$
);
```

Trước khi chạy SQL trên, cần lưu anon key vào vault:

```sql
select vault.create_secret('<paste_anon_key>', 'anon_key');
```

Verify cron đã register:
```sql
select * from cron.job;
```

Xem run history:
```sql
select * from cron.job_run_details order by start_time desc limit 10;
```

---

## 9. Trigger alert test (5 phút)

Để chắc email alert hoạt động, tạm hạ threshold cho 1 metric trong [poll-platform-metrics/index.ts](../../supabase/functions/poll-platform-metrics/index.ts), redeploy, chạy poll. Hoặc insert thủ công 1 alert giả:

```sql
insert into platform_alerts (metric_key, severity, pct_used, value_num, limit_num, message)
values ('supabase.db_size', 'critical', 95, 475000000, 500000000, 'TEST ALERT — please ignore');
```

Rồi gọi send-alert-email trực tiếp:
```bash
curl -X POST "https://fehyeonotpdkxfdtjaen.supabase.co/functions/v1/send-alert-email" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": 1,
    "metric_key": "supabase.db_size",
    "label": "Supabase DB size",
    "severity": "critical",
    "formatted": "475 MB / 500 MB (95%)"
  }'
```

Check inbox `jun.gedvn@gmail.com` → có email.

---

## 10. Sau khi setup xong

- ✅ Cron chạy mỗi 15 phút → metric mới ghi vào DB.
- ✅ Khi metric vượt threshold → alert tạo + email gửi.
- ✅ `admin.matchup.asia/platform-health` xem dashboard.
- ✅ Bấm "Ack" trên alert → ngừng ping email.
- ✅ Khi metric về dưới threshold → alert auto-resolve.

---

## Troubleshooting

| Vấn đề | Xử lý |
|---|---|
| Email không tới | Check `select * from cron.job_run_details order by start_time desc limit 5;`. Verify Resend domain. Check `ALERT_EMAIL_FROM` không bị Resend reject. |
| Metric `supabase.egress` luôn null | Mgmt API endpoint có thể đổi shape. Check log function: `npx supabase functions logs poll-platform-metrics`. Cần map lại `j?.egress?.usage` → trường mới. |
| `vercel.bandwidth` null | Tương tự — Vercel usage API trả nhiều shape khác nhau cho hobby/pro/team. Check log. |
| `domain.expiry_days.matchup.asia` null | RDAP của `.asia` registry có thể không expose expiration. Fallback: cron job riêng dùng WHOIS python script hoặc API như `whoisxmlapi.com`. |
| Cron không chạy | Kiểm tra extension `pg_cron`, `pg_net` đã bật. Vault có secret `anon_key` chưa. |

---

## Sprint 2 sẽ thêm

- Cloudflare GraphQL Analytics (cache hit, 5xx rate)
- Anthropic / OpenAI billing usage
- GitHub Actions minutes
- p95 latency từ browser RUM
- Public status page `status.matchup.asia`
