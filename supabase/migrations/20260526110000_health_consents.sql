-- Separate, explicit consent for sensitive health data (ND 13/2023 Art. 2.4 / Art. 11)
create table if not exists public.health_consents (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  health_data_consent  boolean not null default false,
  ai_analysis_consent  boolean not null default false,
  consent_version      text    not null,
  consented_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  withdrawn_at         timestamptz
);

alter table public.health_consents enable row level security;

drop policy if exists "users read own health_consents"   on public.health_consents;
drop policy if exists "users upsert own health_consents" on public.health_consents;
drop policy if exists "users update own health_consents" on public.health_consents;

create policy "users read own health_consents"
  on public.health_consents for select
  using (auth.uid() = user_id);

create policy "users upsert own health_consents"
  on public.health_consents for insert
  with check (auth.uid() = user_id);

create policy "users update own health_consents"
  on public.health_consents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_health_consents_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_health_consents_updated_at on public.health_consents;
create trigger trg_health_consents_updated_at
  before update on public.health_consents
  for each row execute function public.touch_health_consents_updated_at();
