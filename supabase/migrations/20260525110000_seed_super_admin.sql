-- =============================================================================
-- Seed first super_admin: jun.gedvn@gmail.com
-- Idempotent: ON CONFLICT DO NOTHING (won't re-insert nếu đã có)
-- Requirement: tài khoản auth.users với email này PHẢI tồn tại trước
-- =============================================================================

insert into admin_users (user_id, role, status, created_by, notes)
select id, 'super_admin', 'active', id, 'Bootstrap super_admin — created by migration'
from auth.users
where email = 'jun.gedvn@gmail.com'
on conflict (user_id) do nothing;

-- Verify
do $$
declare
  v_count int;
begin
  select count(*) into v_count from admin_users where role = 'super_admin';
  if v_count = 0 then
    raise warning 'No super_admin seeded. Verify auth.users has jun.gedvn@gmail.com.';
  else
    raise notice 'super_admin count: %', v_count;
  end if;
end $$;
