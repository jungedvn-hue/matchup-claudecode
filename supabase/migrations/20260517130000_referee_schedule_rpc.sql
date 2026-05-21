-- Referee schedule: tournaments where the calling user is linked via
-- tournaments.referees JSONB (slot.userId = auth.uid()).
-- SECURITY DEFINER bypasses host-only RLS for the read.

DROP FUNCTION IF EXISTS public.fn_my_referee_tournaments();

CREATE OR REPLACE FUNCTION public.fn_my_referee_tournaments()
RETURNS TABLE (
  id        TEXT,
  name      TEXT,
  date      TEXT,
  location  TEXT,
  status    TEXT,
  host_id   TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id::text, t.name, t.date, t.location, t.status, t.host_id::text
  FROM public.tournaments t
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(t.referees, '[]'::jsonb)) r
      WHERE (r->>'userId')::uuid = auth.uid()
    )
  ORDER BY t.date DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.fn_my_referee_tournaments() TO authenticated;
