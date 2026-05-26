-- Platform health monitor (admin.matchup.asia/platform-health)
-- See docs/admin/06-platform-health.md

-- ── platform_metrics: snapshot mỗi poll ──────────────────────────────────
create table if not exists public.platform_metrics (
  id            bigserial primary key,
  metric_key    text not null,
  value_num     numeric,
  limit_num     numeric,
  pct_used      numeric,
  unit          text,
  meta          jsonb,
  collected_at  timestamptz not null default now()
);
create index if not exists idx_platform_metrics_key_time on public.platform_metrics (metric_key, collected_at desc);
create index if not exists idx_platform_metrics_time     on public.platform_metrics (collected_at desc);

-- ── platform_alerts: lịch sử alert ──────────────────────────────────────
create table if not exists public.platform_alerts (
  id              bigserial primary key,
  metric_key      text not null,
  severity        text not null check (severity in ('warn','critical')),
  pct_used        numeric,
  value_num       numeric,
  limit_num       numeric,
  message         text not null,
  triggered_at    timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at     timestamptz
);
create index if not exists idx_platform_alerts_open
  on public.platform_alerts (triggered_at desc)
  where resolved_at is null;
create index if not exists idx_platform_alerts_key_open
  on public.platform_alerts (metric_key, severity)
  where resolved_at is null;

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.platform_metrics enable row level security;
alter table public.platform_alerts  enable row level security;

drop policy if exists "master read metrics" on public.platform_metrics;
create policy "master read metrics"
  on public.platform_metrics for select
  using (public.current_user_is_master());

drop policy if exists "master read alerts" on public.platform_alerts;
create policy "master read alerts"
  on public.platform_alerts for select
  using (public.current_user_is_master());

drop policy if exists "master update alerts" on public.platform_alerts;
create policy "master update alerts"
  on public.platform_alerts for update
  using (public.current_user_is_master())
  with check (public.current_user_is_master());

-- INSERT chỉ qua service role từ edge function (bypass RLS) — không cần policy.

-- ── ack_platform_alert RPC ─────────────────────────────────────────────
create or replace function public.ack_platform_alert(p_alert_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_master() then
    raise exception 'forbidden';
  end if;

  update public.platform_alerts
     set acknowledged_at = coalesce(acknowledged_at, now())
   where id = p_alert_id
     and resolved_at is null;
end;
$$;

revoke all on function public.ack_platform_alert(bigint) from public;
grant execute on function public.ack_platform_alert(bigint) to authenticated;

-- ── Retention: xóa metrics > 90 ngày, alerts > 1 năm ────────────────────
create or replace function public.prune_platform_history()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.platform_metrics where collected_at < now() - interval '90 days';
  delete from public.platform_alerts  where resolved_at  < now() - interval '365 days';
$$;

revoke all on function public.prune_platform_history() from public;
-- chỉ gọi từ cron / service role, không grant cho authenticated

-- ── Helper RPCs cho edge function (gọi qua service role) ────────────────

-- DB size hiện tại (bytes)
create or replace function public.pg_database_size_current()
returns bigint
language sql
security definer
set search_path = public, pg_catalog
as $$
  select pg_database_size(current_database());
$$;
revoke all on function public.pg_database_size_current() from public;

-- MAU 30 ngày: số user distinct có last_sign_in_at trong 30 ngày
create or replace function public.platform_auth_mau()
returns bigint
language sql
security definer
set search_path = public, auth
as $$
  select count(distinct id)::bigint
  from auth.users
  where last_sign_in_at >= now() - interval '30 days';
$$;
revoke all on function public.platform_auth_mau() from public;

-- Webhook success 24h: { total, ok }
create or replace function public.platform_webhook_success_24h()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*),
    'ok',    count(*) filter (where processed = true and error_message is null)
  )
  from public.payment_webhooks_log
  where created_at >= now() - interval '24 hours';
$$;
revoke all on function public.platform_webhook_success_24h() from public;
