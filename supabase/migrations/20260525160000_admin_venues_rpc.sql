-- =============================================================================
-- Admin RPCs for venue moderation: list, get, approve, reject, suspend
-- =============================================================================

-- Drop old overloads (defensive)
do $$
declare r record;
begin
  for r in
    select format('drop function if exists %s(%s) cascade',
                  p.proname, pg_get_function_identity_arguments(p.oid)) as ddl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'admin_list_venues','admin_count_venues','admin_get_venue',
        'admin_approve_venue','admin_reject_venue','admin_suspend_venue'
      )
  loop execute r.ddl; end loop;
end $$;

create function admin_list_venues(
  p_verification_status text,
  p_search text,
  p_limit int,
  p_offset int
) returns table (
  id                  uuid,
  name                text,
  location            text,
  address             text,
  contact_phone       text,
  status              text,
  verification_status text,
  court_count         int,
  commission_rate     numeric,
  owner_user_id       uuid,
  owner_display_name  text,
  owner_email         text,
  created_at          timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not an admin'; end if;
  return query
  select
    v.id,
    v.name::text,
    v.location::text,
    v.address::text,
    v.contact_phone::text,
    v.status::text,
    v.verification_status::text,
    v.court_count,
    v.commission_rate,
    v.owner_user_id,
    p.display_name::text                as owner_display_name,
    u.email::text                       as owner_email,
    v.created_at
  from public.venues v
  left join public.profiles p on p.user_id = v.owner_user_id
  left join auth.users u on u.id = v.owner_user_id
  where
    (coalesce(p_verification_status,'') = '' or v.verification_status = p_verification_status)
    and (
      coalesce(p_search,'') = ''
      or v.name ilike '%' || p_search || '%'
      or v.address ilike '%' || p_search || '%'
      or v.location ilike '%' || p_search || '%'
      or p.display_name ilike '%' || p_search || '%'
      or (u.email::text) ilike '%' || p_search || '%'
    )
  order by v.created_at desc nulls last
  offset coalesce(p_offset, 0)
  limit  coalesce(p_limit, 25);
end; $$;

create function admin_count_venues(p_verification_status text, p_search text)
returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not is_admin() then raise exception 'Not an admin'; end if;
  select count(*) into v_count
  from public.venues v
  left join public.profiles p on p.user_id = v.owner_user_id
  left join auth.users u on u.id = v.owner_user_id
  where
    (coalesce(p_verification_status,'') = '' or v.verification_status = p_verification_status)
    and (
      coalesce(p_search,'') = ''
      or v.name ilike '%' || p_search || '%'
      or v.address ilike '%' || p_search || '%'
      or v.location ilike '%' || p_search || '%'
      or p.display_name ilike '%' || p_search || '%'
      or (u.email::text) ilike '%' || p_search || '%'
    );
  return v_count;
end; $$;

create function admin_get_venue(p_id uuid)
returns table (
  id                   uuid,
  name                 text,
  location             text,
  address              text,
  latitude             double precision,
  longitude            double precision,
  contact_phone        text,
  status               text,
  verification_status  text,
  verified_at          timestamptz,
  verified_by          uuid,
  suspended_reason     text,
  court_count          int,
  amenities            text[],
  operating_hours      jsonb,
  pricing              jsonb,
  commission_rate      numeric,
  owner_user_id        uuid,
  owner_display_name   text,
  owner_email          text,
  owner_phone          text,
  created_at           timestamptz,
  updated_at           timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not an admin'; end if;
  return query
  select
    v.id, v.name::text, v.location::text, v.address::text,
    v.latitude, v.longitude, v.contact_phone::text,
    v.status::text, v.verification_status::text,
    v.verified_at, v.verified_by, v.suspended_reason::text,
    v.court_count, v.amenities,
    v.operating_hours, v.pricing, v.commission_rate,
    v.owner_user_id, p.display_name::text, u.email::text, u.phone::text,
    v.created_at, v.updated_at
  from public.venues v
  left join public.profiles p on p.user_id = v.owner_user_id
  left join auth.users u on u.id = v.owner_user_id
  where v.id = p_id;
end; $$;

create function admin_approve_venue(p_id uuid, p_commission_rate numeric, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid();
begin
  if not is_admin() then raise exception 'Not an admin'; end if;

  update public.venues
  set
    verification_status = 'verified',
    verified_at = now(),
    verified_by = v_actor,
    commission_rate = coalesce(p_commission_rate, commission_rate),
    suspended_reason = null
  where id = p_id;

  perform admin_log_action(
    'venue.approve', 'venue', p_id::text,
    null,
    jsonb_build_object('commission_rate', p_commission_rate, 'note', p_note),
    p_note
  );
end; $$;

create function admin_reject_venue(p_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not an admin'; end if;
  if coalesce(p_reason,'') = '' then raise exception 'Reason required'; end if;

  update public.venues
  set
    verification_status = 'rejected',
    verified_at = null,
    verified_by = null
  where id = p_id;

  perform admin_log_action(
    'venue.reject', 'venue', p_id::text,
    null, jsonb_build_object('reason', p_reason), p_reason
  );
end; $$;

create function admin_suspend_venue(p_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not an admin'; end if;
  if coalesce(p_reason,'') = '' then raise exception 'Reason required'; end if;

  update public.venues
  set
    verification_status = 'suspended',
    suspended_reason = p_reason
  where id = p_id;

  perform admin_log_action(
    'venue.suspend', 'venue', p_id::text,
    null, jsonb_build_object('reason', p_reason), p_reason
  );
end; $$;

grant execute on function admin_list_venues(text,text,int,int)        to authenticated;
grant execute on function admin_count_venues(text,text)               to authenticated;
grant execute on function admin_get_venue(uuid)                       to authenticated;
grant execute on function admin_approve_venue(uuid, numeric, text)    to authenticated;
grant execute on function admin_reject_venue(uuid, text)              to authenticated;
grant execute on function admin_suspend_venue(uuid, text)             to authenticated;
