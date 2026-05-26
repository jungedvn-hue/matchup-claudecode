-- Group invites: host/admin invites friends → friend accepts → group_members row.

create table if not exists public.group_invites (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups(id)   on delete cascade,
  inviter_user_id uuid not null references auth.users(id)      on delete cascade,
  invitee_user_id uuid not null references auth.users(id)      on delete cascade,
  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined','cancelled')),
  message         text,
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  unique (group_id, invitee_user_id, status) -- prevents duplicate active invites
);

create index if not exists gi_invitee_pending
  on public.group_invites (invitee_user_id, created_at desc)
  where status = 'pending';
create index if not exists gi_group_pending
  on public.group_invites (group_id, created_at desc)
  where status = 'pending';

alter table public.group_invites enable row level security;

-- READ: inviter and invitee can read; group host/admin can read all for the group.
drop policy if exists "gi_read" on public.group_invites;
create policy "gi_read" on public.group_invites for select using (
  invitee_user_id = auth.uid()
  or inviter_user_id = auth.uid()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = group_invites.group_id
      and gm.user_id  = auth.uid()
      and gm.role in ('host','admin')
      and gm.status  = 'active'
  )
);

-- All writes go through RPCs (security definer). No direct INSERT/UPDATE/DELETE policies.

-- ─── RPC: invite_friends_to_group ─────────────────────────────────────────
-- Host/admin invites a batch of friends. Skips users already in the group or
-- already with a pending invite. Returns count of new invites created.
create or replace function public.invite_friends_to_group(
  p_group_id      uuid,
  p_invitee_ids   uuid[],
  p_message       text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_role     text;
  v_inserted int  := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_group_id is null then raise exception 'group_id required'; end if;
  if p_invitee_ids is null or array_length(p_invitee_ids, 1) is null then
    return 0;
  end if;

  -- Must be active host or admin of this group.
  select role into v_role
    from public.group_members
   where group_id = p_group_id
     and user_id  = v_uid
     and status   = 'active';

  if v_role is null or v_role not in ('host','admin') then
    raise exception 'forbidden';
  end if;

  with candidates as (
    select unnest(p_invitee_ids) as invitee_id
  ),
  filtered as (
    select c.invitee_id
      from candidates c
     where c.invitee_id <> v_uid
       and not exists (
         select 1 from public.group_members gm
          where gm.group_id = p_group_id
            and gm.user_id  = c.invitee_id
            and gm.status   = 'active'
       )
       and not exists (
         select 1 from public.group_invites gi
          where gi.group_id        = p_group_id
            and gi.invitee_user_id = c.invitee_id
            and gi.status          = 'pending'
       )
  ),
  inserted as (
    insert into public.group_invites (group_id, inviter_user_id, invitee_user_id, message)
    select p_group_id, v_uid, f.invitee_id, nullif(trim(coalesce(p_message,'')), '')
      from filtered f
    returning id, invitee_user_id
  )
  select count(*) into v_inserted from inserted;

  -- Best-effort notification fan-out
  insert into public.notifications (user_id, type, title, body, ref_type, ref_id, link)
  select ins.invitee_user_id,
         'group_invite',
         'You were invited to a group',
         coalesce((select name from public.groups where id = p_group_id), 'a group'),
         'group_invite',
         ins.id::text,
         '/notifications'
    from public.group_invites ins
   where ins.inviter_user_id = v_uid
     and ins.group_id        = p_group_id
     and ins.status          = 'pending'
     and ins.created_at      >= now() - interval '5 seconds';

  return v_inserted;
end;
$$;

revoke all on function public.invite_friends_to_group(uuid, uuid[], text) from public;
grant execute on function public.invite_friends_to_group(uuid, uuid[], text) to authenticated;

-- ─── RPC: respond_to_group_invite ────────────────────────────────────────
-- Invitee accepts or declines. On accept → add active member row.
create or replace function public.respond_to_group_invite(
  p_invite_id uuid,
  p_accept    boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_group_id  uuid;
  v_invitee   uuid;
  v_status    text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select group_id, invitee_user_id, status
    into v_group_id, v_invitee, v_status
    from public.group_invites
   where id = p_invite_id
   for update;

  if v_group_id is null then raise exception 'invite_not_found'; end if;
  if v_invitee <> v_uid then raise exception 'forbidden'; end if;
  if v_status <> 'pending' then raise exception 'invite_already_responded'; end if;

  update public.group_invites
     set status       = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now()
   where id = p_invite_id;

  if p_accept then
    insert into public.group_members (group_id, user_id, role, status)
    values (v_group_id, v_uid, 'member', 'active')
    on conflict (group_id, user_id) do update
      set status = 'active';
  end if;
end;
$$;

revoke all on function public.respond_to_group_invite(uuid, boolean) from public;
grant execute on function public.respond_to_group_invite(uuid, boolean) to authenticated;

-- ─── RPC: cancel_group_invite (inviter-only) ─────────────────────────────
create or replace function public.cancel_group_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_inviter uuid;
  v_status  text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select inviter_user_id, status into v_inviter, v_status
    from public.group_invites where id = p_invite_id for update;
  if v_inviter is null then raise exception 'invite_not_found'; end if;
  if v_inviter <> v_uid then raise exception 'forbidden'; end if;
  if v_status <> 'pending' then return; end if;
  update public.group_invites
     set status = 'cancelled', responded_at = now()
   where id = p_invite_id;
end;
$$;
revoke all on function public.cancel_group_invite(uuid) from public;
grant execute on function public.cancel_group_invite(uuid) to authenticated;
