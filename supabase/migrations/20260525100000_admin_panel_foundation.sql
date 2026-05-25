-- =============================================================================
-- Admin Panel Foundation
-- Created: 2026-05-25
-- Purpose: Bảng nền tảng cho Admin Panel (admin.matchup.asia) — quản trị toàn bộ
--          platform: users, venues, payments, content, broadcasts, audit log.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADMIN USERS & RBAC
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists admin_users (
  user_id        uuid primary key references auth.users(id) on delete restrict,
  role           text not null check (role in (
                   'super_admin','ops_manager','finance','support','moderator','analyst'
                 )),
  status         text not null default 'active' check (status in ('active','suspended')),
  mfa_enrolled   boolean not null default false,
  last_login_at  timestamptz,
  last_login_ip  inet,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  notes          text
);
create index if not exists admin_users_role_idx
  on admin_users(role) where status = 'active';

-- Helper: kiểm tra current user có phải admin (optionally required role)
create or replace function is_admin(required_role text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where user_id = auth.uid()
      and status  = 'active'
      and (
        required_role is null
        or role = required_role
        or role = 'super_admin'
      )
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AUDIT LOG (append-only, partition theo tháng)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists admin_audit_logs (
  id           bigserial,
  actor_id     uuid not null references auth.users(id),
  actor_role   text not null,
  action       text not null,
  target_type  text not null,
  target_id    text not null,
  before       jsonb,
  after        jsonb,
  reason       text,
  ip           inet,
  user_agent   text,
  created_at   timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

create table if not exists admin_audit_logs_2026_05
  partition of admin_audit_logs for values from ('2026-05-01') to ('2026-06-01');
create table if not exists admin_audit_logs_2026_06
  partition of admin_audit_logs for values from ('2026-06-01') to ('2026-07-01');
create table if not exists admin_audit_logs_2026_07
  partition of admin_audit_logs for values from ('2026-07-01') to ('2026-08-01');

create index if not exists audit_actor_idx
  on admin_audit_logs(actor_id, created_at desc);
create index if not exists audit_target_idx
  on admin_audit_logs(target_type, target_id, created_at desc);

-- Immutable: chặn UPDATE / DELETE kể cả super_admin
create or replace rule no_update_audit as
  on update to admin_audit_logs do instead nothing;
create or replace rule no_delete_audit as
  on delete to admin_audit_logs do instead nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. USER MODERATION
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists user_suspensions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  reason        text not null,
  reason_code   text not null check (reason_code in (
                  'spam','fraud','abuse','tos_violation','impersonation','other'
                )),
  suspended_by  uuid not null references auth.users(id),
  suspended_at  timestamptz not null default now(),
  expires_at    timestamptz,
  lifted_at     timestamptz,
  lifted_by     uuid references auth.users(id),
  lift_reason   text
);
create index if not exists user_suspensions_active_idx
  on user_suspensions(user_id) where lifted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VENUE MODERATION
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists venue_documents (
  id                 uuid primary key default gen_random_uuid(),
  venue_id           uuid not null references venues(id) on delete cascade,
  doc_type           text not null check (doc_type in (
                       'business_license','owner_id','contract','tax_cert','other'
                     )),
  storage_path       text not null,
  uploaded_by        uuid not null references auth.users(id),
  uploaded_at        timestamptz not null default now(),
  verified_at        timestamptz,
  verified_by        uuid references auth.users(id),
  rejection_reason   text
);
create index if not exists venue_documents_venue_idx on venue_documents(venue_id);

-- Mở rộng bảng venues với cột moderation
alter table venues
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected','suspended')),
  add column if not exists verified_at        timestamptz,
  add column if not exists verified_by        uuid references auth.users(id),
  add column if not exists suspended_reason   text;
-- (commission_rate đã có từ migration 20260524150000_venue_payment_commission)

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. REPORTS (user → user/venue/group/tournament/store/post/booking)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references auth.users(id),
  target_type   text not null check (target_type in (
                  'user','venue','group','tournament','store','product','post','booking','event'
                )),
  target_id     uuid not null,
  category      text not null check (category in (
                  'spam','abuse','fraud','inappropriate','misleading','copyright','other'
                )),
  description   text,
  evidence_urls text[],
  status        text not null default 'open' check (status in (
                  'open','investigating','resolved','dismissed'
                )),
  assigned_to   uuid references auth.users(id),
  resolution    text,
  resolved_at   timestamptz,
  resolved_by   uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists reports_status_idx on reports(status, created_at desc);
create index if not exists reports_target_idx on reports(target_type, target_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FINANCE — REFUNDS, DISPUTES, RECONCILIATION
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists refunds (
  id                uuid primary key default gen_random_uuid(),
  payment_id        uuid not null,                                 -- reference payments(id)
  booking_id        uuid,                                          -- reference court_bookings/paid_tickets
  source_type       text not null check (source_type in (
                      'court_booking','paid_ticket','store_order','wallet_topup','tournament_fee'
                    )),
  amount            numeric(12,2) not null check (amount > 0),
  currency          text not null default 'VND',
  reason_code       text not null check (reason_code in (
                      'cancel_by_user','cancel_by_owner','no_show','dispute',
                      'duplicate','quality_issue','platform_error','other'
                    )),
  reason_note       text,
  status            text not null default 'pending' check (status in (
                      'pending','transferred','failed','cancelled'
                    )),
  bank_transfer_ref text,
  transferred_at    timestamptz,
  initiated_by      uuid not null references auth.users(id),
  approved_by       uuid references auth.users(id),
  idempotency_key   text unique not null,
  created_at        timestamptz not null default now()
);
create index if not exists refunds_payment_idx on refunds(payment_id);
create index if not exists refunds_status_idx  on refunds(status, created_at desc);
create index if not exists refunds_source_idx  on refunds(source_type, booking_id);

create table if not exists disputes (
  id              uuid primary key default gen_random_uuid(),
  source_type     text not null check (source_type in (
                    'court_booking','paid_ticket','store_order','tournament','referee_service'
                  )),
  source_id       uuid not null,
  opened_by       uuid not null references auth.users(id),
  against_party   text not null check (against_party in ('owner','player','platform','referee','host')),
  category        text not null check (category in (
                    'no_show','wrong_court','quality','payment','communication','other'
                  )),
  description     text not null,
  evidence_urls   text[],
  status          text not null default 'open' check (status in (
                    'open','investigating','resolved_player','resolved_owner',
                    'resolved_split','dismissed'
                  )),
  resolution_note text,
  refund_id       uuid references refunds(id),
  assigned_to     uuid references auth.users(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists disputes_status_idx on disputes(status, created_at desc);
create index if not exists disputes_source_idx on disputes(source_type, source_id);

create table if not exists reconciliation_daily (
  date                     date primary key,
  total_bookings           int not null default 0,
  total_tickets            int not null default 0,
  total_store_orders       int not null default 0,
  total_gmv                numeric(14,2) not null default 0,
  total_payments_received  numeric(14,2) not null default 0,
  total_refunds            numeric(14,2) not null default 0,
  commission_collected     numeric(14,2) not null default 0,
  wallet_topups            numeric(14,2) not null default 0,
  discrepancy              numeric(14,2) not null default 0,
  generated_at             timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. BROADCASTS, FEATURE FLAGS, BANNERS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists broadcasts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  title_en      text,
  body          text not null,
  body_en       text,
  channel       text not null check (channel in ('push','email','in_app','all')),
  segment       jsonb not null,           -- {"role":"player","region":"hcm",...}
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  sent_count    int default 0,
  status        text not null default 'draft' check (status in (
                  'draft','scheduled','sending','sent','failed','cancelled'
                )),
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists broadcasts_status_idx on broadcasts(status, scheduled_at);

create table if not exists feature_flags (
  key          text primary key,
  enabled      boolean not null default false,
  rollout_pct  int not null default 0 check (rollout_pct between 0 and 100),
  segment      jsonb,
  description  text,
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now()
);

create table if not exists banners (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  title_en    text,
  body        text,
  body_en     text,
  image_url   text,
  link_url    text,
  placement   text not null check (placement in (
                'home_top','booking_page','tournament_list','marketplace','health_hub','wallet'
              )),
  segment     jsonb,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  priority    int not null default 0,
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index if not exists banners_active_idx
  on banners(placement, priority desc) where is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. IMPERSONATION (read-only sessions, audit)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists impersonation_sessions (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid not null references auth.users(id),
  target_user_id  uuid not null references auth.users(id),
  reason          text not null,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  ip              inet
);
create index if not exists impersonation_admin_idx
  on impersonation_sessions(admin_id, started_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RLS — đóng cứng tất cả bảng admin, chỉ admin được access
-- ─────────────────────────────────────────────────────────────────────────────

alter table admin_users            enable row level security;
alter table admin_audit_logs       enable row level security;
alter table user_suspensions       enable row level security;
alter table venue_documents        enable row level security;
alter table reports                enable row level security;
alter table refunds                enable row level security;
alter table disputes               enable row level security;
alter table reconciliation_daily   enable row level security;
alter table broadcasts             enable row level security;
alter table feature_flags          enable row level security;
alter table banners                enable row level security;
alter table impersonation_sessions enable row level security;

-- admin_users: chỉ super_admin manage; mọi admin xem được
create policy admin_users_read   on admin_users for select using (is_admin());
create policy admin_users_write  on admin_users for all    using (is_admin('super_admin'))
                                                          with check (is_admin('super_admin'));

-- audit_logs: mọi admin xem; insert qua trigger/RPC (server-side)
create policy audit_read         on admin_audit_logs for select using (is_admin());
create policy audit_insert       on admin_audit_logs for insert with check (is_admin());

-- suspensions: ops + super
create policy susp_read          on user_suspensions for select using (is_admin());
create policy susp_write         on user_suspensions for insert with check (is_admin('ops_manager'));
create policy susp_update        on user_suspensions for update using (is_admin('ops_manager'));

-- venue_documents: ops + super
create policy vdoc_read          on venue_documents for select using (is_admin());
create policy vdoc_write         on venue_documents for all    using (is_admin('ops_manager'))
                                                              with check (is_admin('ops_manager'));

-- reports: mod + ops + super read; mod write
create policy reports_read       on reports for select using (is_admin());
create policy reports_write      on reports for update using (is_admin('moderator'));

-- refunds: finance + super
create policy refunds_read       on refunds for select using (is_admin());
create policy refunds_write      on refunds for insert with check (is_admin('finance'));
create policy refunds_update     on refunds for update using (is_admin('finance'));

-- disputes: ops + finance + super
create policy disputes_read      on disputes for select using (is_admin());
create policy disputes_write     on disputes for all    using (is_admin('ops_manager'))
                                                       with check (is_admin('ops_manager'));

-- recon: read-only cho admin (job tự ghi qua service role)
create policy recon_read         on reconciliation_daily for select using (is_admin());

-- broadcasts: support + ops + super
create policy broadcasts_read    on broadcasts for select using (is_admin());
create policy broadcasts_write   on broadcasts for all    using (is_admin('support'))
                                                         with check (is_admin('support'));

-- feature_flags: super_admin only
create policy flags_read         on feature_flags for select using (is_admin());
create policy flags_write        on feature_flags for all    using (is_admin('super_admin'))
                                                            with check (is_admin('super_admin'));

-- banners: support + ops + super
create policy banners_read       on banners for select using (true);  -- public read (app cần)
create policy banners_write      on banners for all    using (is_admin('support'))
                                                      with check (is_admin('support'));

-- impersonation: super_admin only
create policy imp_read           on impersonation_sessions for select using (is_admin('super_admin'));
create policy imp_write          on impersonation_sessions for insert with check (is_admin('super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. RPC: ghi audit log (mọi admin action nên gọi qua đây)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function admin_log_action(
  p_action       text,
  p_target_type  text,
  p_target_id    text,
  p_before       jsonb default null,
  p_after        jsonb default null,
  p_reason       text  default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_id   bigint;
begin
  select role into v_role from admin_users where user_id = auth.uid() and status = 'active';
  if v_role is null then
    raise exception 'Not an admin';
  end if;

  insert into admin_audit_logs(actor_id, actor_role, action, target_type, target_id, before, after, reason)
  values (auth.uid(), v_role, p_action, p_target_type, p_target_id, p_before, p_after, p_reason)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function admin_log_action(text,text,text,jsonb,jsonb,text) to authenticated;
grant execute on function is_admin(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────────────────────
