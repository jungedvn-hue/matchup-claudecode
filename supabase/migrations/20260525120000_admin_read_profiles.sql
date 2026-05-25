-- =============================================================================
-- Grant admin read access to common business tables
-- Mỗi admin (active) có thể SELECT các bảng cần thiết để vận hành.
-- Mutations vẫn theo policy riêng của từng bảng.
-- =============================================================================

-- profiles: admin read tất cả
do $$ begin
  if exists (select 1 from pg_tables where tablename = 'profiles' and schemaname = 'public') then
    -- Đảm bảo RLS enabled (nếu chưa)
    execute 'alter table public.profiles enable row level security';

    -- Drop policy cũ trùng tên nếu có
    drop policy if exists "admin read profiles" on public.profiles;

    create policy "admin read profiles"
      on public.profiles
      for select
      using (is_admin());
  end if;
end $$;

-- venues: admin read all (cho Phase B)
do $$ begin
  if exists (select 1 from pg_tables where tablename = 'venues' and schemaname = 'public') then
    drop policy if exists "admin read venues" on public.venues;
    create policy "admin read venues"
      on public.venues
      for select
      using (is_admin());
  end if;
end $$;
