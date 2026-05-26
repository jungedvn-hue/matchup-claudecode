-- Consent tracking on profiles (ToS + Privacy Policy)
alter table public.profiles
  add column if not exists consent_version text,
  add column if not exists consented_at    timestamptz;

comment on column public.profiles.consent_version is 'Version of ToS/Privacy accepted (e.g. 2026-05-26)';
comment on column public.profiles.consented_at    is 'Timestamp user accepted ToS/Privacy';
