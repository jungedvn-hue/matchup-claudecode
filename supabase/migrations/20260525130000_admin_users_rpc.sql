-- =============================================================================
-- Admin RPC for user search / list / get
-- Joins public.profiles with auth.users (which client cannot query directly).
-- All security-definer + is_admin() guard.
-- =============================================================================

-- List/search users (paginated)
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
    u.id           as user_id,
    p.id           as profile_id,
    p.display_name,
    p.avatar_url,
    u.phone,
    u.email,
    p.location,
    coalesce(p.created_at, u.created_at) as created_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where
    coalesce(p_search, '') = ''
    or p.display_name ilike '%' || p_search || '%'
    or u.email        ilike '%' || p_search || '%'
    or u.phone        ilike '%' || p_search || '%'
  order by coalesce(p.created_at, u.created_at) desc nulls last
  offset p_offset
  limit  p_limit;
end;
$$;

-- Total count for pagination
create or replace function admin_count_users(p_search text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  if not is_admin() then
    raise exception 'Not an admin';
  end if;

  select count(*) into v_count
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where
    coalesce(p_search, '') = ''
    or p.display_name ilike '%' || p_search || '%'
    or u.email        ilike '%' || p_search || '%'
    or u.phone        ilike '%' || p_search || '%';

  return v_count;
end;
$$;

-- Get single user (full detail)
create or replace function admin_get_user(p_user_id uuid)
returns table (
  user_id           uuid,
  profile_id        uuid,
  display_name      text,
  avatar_url        text,
  phone             text,
  email             text,
  location          text,
  bio               text,
  created_at        timestamptz,
  last_sign_in_at   timestamptz,
  email_confirmed_at timestamptz
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
    u.id,
    p.id,
    p.display_name,
    p.avatar_url,
    u.phone,
    u.email,
    p.location,
    p.bio,
    coalesce(p.created_at, u.created_at),
    u.last_sign_in_at,
    u.email_confirmed_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.id = p_user_id;
end;
$$;

grant execute on function admin_search_users(text, int, int) to authenticated;
grant execute on function admin_count_users(text)            to authenticated;
grant execute on function admin_get_user(uuid)               to authenticated;
