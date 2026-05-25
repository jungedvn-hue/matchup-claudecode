-- Fix: cast varchar columns to text to match RETURNS TABLE declarations

create or replace function admin_search_users(
  p_search text default null,
  p_limit  int  default 25,
  p_offset int  default 0
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
  if not is_admin() then
    raise exception 'Not an admin';
  end if;

  return query
  select
    u.id                       as user_id,
    p.id                       as profile_id,
    p.display_name::text,
    p.avatar_url::text,
    u.phone::text,
    u.email::text,
    p.location::text,
    coalesce(p.created_at, u.created_at) as created_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where
    coalesce(p_search, '') = ''
    or p.display_name ilike '%' || p_search || '%'
    or (u.email::text) ilike '%' || p_search || '%'
    or (u.phone::text) ilike '%' || p_search || '%'
  order by coalesce(p.created_at, u.created_at) desc nulls last
  offset p_offset
  limit  p_limit;
end;
$$;

create or replace function admin_get_user(p_user_id uuid)
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
    u.id,
    p.id,
    p.display_name::text,
    p.avatar_url::text,
    u.phone::text,
    u.email::text,
    p.location::text,
    p.bio::text,
    coalesce(p.created_at, u.created_at),
    u.last_sign_in_at,
    u.email_confirmed_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.id = p_user_id;
end;
$$;

create or replace function admin_count_users(p_search text default null)
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
