-- Court Owner V1 Phase 1D — Activity tracking foundation
-- Optional venue_id link on groups + tournaments; aggregator RPC.
-- Backward compatible: column is NULLABLE, existing rows unaffected.

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS groups_venue_idx       ON public.groups(venue_id)       WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tournaments_venue_idx  ON public.tournaments(venue_id)  WHERE venue_id IS NOT NULL;

-- Aggregator: counts of activity at a venue.
-- SECURITY DEFINER so anyone viewing a public venue profile can see counts
-- (the underlying tables have their own RLS for row reads).
CREATE OR REPLACE FUNCTION public.fn_venue_activity(p_venue_id UUID)
RETURNS TABLE (
  groups_count       INT,
  events_count       INT,
  tournaments_count  INT,
  upcoming_events    INT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT COUNT(*)::INT FROM public.groups       WHERE venue_id = p_venue_id), 0),
    COALESCE((SELECT COUNT(*)::INT FROM public.group_events ge
                JOIN public.groups g ON g.id = ge.group_id
                WHERE g.venue_id = p_venue_id), 0),
    COALESCE((SELECT COUNT(*)::INT FROM public.tournaments  WHERE venue_id = p_venue_id), 0),
    COALESCE((SELECT COUNT(*)::INT FROM public.group_events ge
                JOIN public.groups g ON g.id = ge.group_id
                WHERE g.venue_id = p_venue_id AND ge.event_date >= now()), 0);
$$;

REVOKE ALL ON FUNCTION public.fn_venue_activity(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_venue_activity(UUID) TO anon, authenticated;
