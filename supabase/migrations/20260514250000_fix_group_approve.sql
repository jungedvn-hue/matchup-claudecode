-- Fix: group member approval was silently failing in some edge cases.
-- Root cause: handleApprove used direct UPDATE without verifying rows changed.
-- Supabase returns success {error: null} even when 0 rows updated (RLS block,
-- WHERE clause mismatch, etc.) — toast says "approved" but DB unchanged.
--
-- Fix:
--   1. SECURITY DEFINER RPC bypasses any RLS edge cases
--   2. Validates caller is host/admin of the group
--   3. Returns boolean — false if no row changed, true if approved

CREATE OR REPLACE FUNCTION public.fn_approve_group_member(
  p_group_id UUID, p_user_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller   UUID := auth.uid();
  v_is_host  BOOLEAN;
  v_updated  INTEGER;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Caller must be host or admin of the group
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
     WHERE group_id = p_group_id
       AND user_id = v_caller
       AND role IN ('host','admin')
       AND status = 'active'
  ) OR EXISTS (
    -- Backup: groups.host_user_id (in case the host's own member row was deleted)
    SELECT 1 FROM public.groups WHERE id = p_group_id AND host_user_id = v_caller
  ) INTO v_is_host;

  IF NOT v_is_host THEN
    RAISE EXCEPTION 'Only group host or admin can approve members';
  END IF;

  UPDATE public.group_members
     SET status = 'active'
   WHERE group_id = p_group_id AND user_id = p_user_id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_approve_group_member(UUID, UUID) TO authenticated;

-- Self-heal: if a host's own group_members row is missing (caused by race
-- condition or accidental delete), insert it. Run once on migration apply.
INSERT INTO public.group_members (group_id, user_id, role, status)
SELECT g.id, g.host_user_id, 'host', 'active'
  FROM public.groups g
 WHERE NOT EXISTS (
   SELECT 1 FROM public.group_members m
    WHERE m.group_id = g.id AND m.user_id = g.host_user_id
 )
ON CONFLICT (group_id, user_id) DO NOTHING;
