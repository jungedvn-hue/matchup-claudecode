-- Self-service account deletion (ND 13/2023 right to erasure).
-- Relies on ON DELETE CASCADE from auth.users -> profiles/health_*/etc.
-- Owned by postgres so security definer can delete from auth.users.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Best-effort cleanup for tables that may not cascade from auth.users.
  -- Wrap each in a guard so a missing table doesn't abort the deletion.
  if to_regclass('public.health_consents')            is not null then execute 'delete from public.health_consents            where user_id = $1' using v_uid; end if;
  if to_regclass('public.health_daily_logs')          is not null then execute 'delete from public.health_daily_logs          where user_id = $1' using v_uid; end if;
  if to_regclass('public.health_goals')               is not null then execute 'delete from public.health_goals               where user_id = $1' using v_uid; end if;
  if to_regclass('public.health_body_profile')        is not null then execute 'delete from public.health_body_profile        where user_id = $1' using v_uid; end if;
  if to_regclass('public.health_device_connections')  is not null then execute 'delete from public.health_device_connections  where user_id = $1' using v_uid; end if;
  if to_regclass('public.health_insights')            is not null then execute 'delete from public.health_insights            where user_id = $1' using v_uid; end if;
  if to_regclass('public.health_match_correlations')  is not null then execute 'delete from public.health_match_correlations  where user_id = $1' using v_uid; end if;

  -- Final: removing auth user cascades profiles + the rest.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
