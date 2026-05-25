-- =============================================================================
-- Rebuild admin user RPCs cleanly.
-- Drop any old overloads, then recreate with explicit casts.
-- =============================================================================

-- Drop all overloads of these functions to avoid PostgREST ambiguity
do $$
declare r record;
begin
  for r in
    select format('drop function if exists %s(%s) cascade',
                  p.proname, pg_get_function_identity_arguments(p.oid)) as ddl
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('admin_search_users','admin_count_users','admin_get_user')
  loop
    execute r.ddl;
  end loop;
end $$;

-- =============================================================================
-- Recreate
-- =============================================================================

create function admin_search_users(
  p_search text,
  p_limit  int,
  p_offset int
) returns table (
  user_id      uuid,
  profile_id   uuid,
  display_name text,
  avatar_url   text,
  phone        text,
  email        text,
  location     text,
  created_at   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not an admin'; end if;

  return query
  select
    u.id::uuid                                  as user_id,
    p.id                                        as profile_id,
    p.display_name::text                        as display_name,
    p.avatar_url::text                          as avatar_url,
    u.phone::text                               as phone,
    u.email::text                               as email,
    p.location::text                            as location,
    coalesce(p.created_at, u.created_at)::timestamptz as created_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where
    coalesce(p_search, '') = ''
    or p.display_name ilike '%' || p_search || '%'
    or (u.email::text) ilike '%' || p_search || '%'
    or (u.phone::text) ilike '%' || p_search || '%'
  order by coalesce(p.created_at, u.created_at) desc nulls last
  offset coalesce(p_offset, 0)
  limit  coalesce(p_limit, 25);
end;
$$;

create function admin_count_users(p_search text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  if not is_admin() then raise exception 'Not an admin'; end if;

  select count(*) into v_count
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where
    coalesce(p_search, '') = ''
    or p.display_name ilike '%' || p_search || '%'
    or (u.email::text) ilike '%' || p_search || '%'
    or (u.phone::text) ilike '%' || p_search || '%';

  return v_count;
end;
$$;

create function admin_get_user(p_user_id uuid)
returns table (
  user_id            uuid,
  profile_id         uuid,
  display_name       text,
  avatar_url         text,
  phone              text,
  email              text,
  location           text,
  bio                text,
  created_at         timestamptz,
  last_sign_in_at    timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not an admin'; end if;

  return query
  select
    u.id::uuid                                          as user_id,
    p.id                                                as profile_id,
    p.display_name::text                                as display_name,
    p.avatar_url::text                                  as avatar_url,
    u.phone::text                                       as phone,
    u.email::text                                       as email,
    p.location::text                                    as location,
    p.bio::text                                         as bio,
    coalesce(p.created_at, u.created_at)::timestamptz   as created_at,
    u.last_sign_in_at::timestamptz                      as last_sign_in_at,
    u.email_confirmed_at::timestamptz                   as email_confirmed_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.id = p_user_id;
end;
$$;

grant execute on function admin_search_users(text, int, int) to authenticated;
grant execute on function admin_count_users(text)            to authenticated;
grant execute on function admin_get_user(uuid)               to authenticated;

-- Quick sanity check (should return rows when run as super_admin)
-- select * from admin_search_users(null, 5, 0);
-- select admin_count_users(null);
