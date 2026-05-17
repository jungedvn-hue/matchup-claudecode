-- Referee Track Record (R-A) — accumulate tournament officiating history
-- Goal: profile grows over time so referees become marketable to organizers.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. PER-TOURNAMENT HISTORY (denormalized for fast profile rendering)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.referee_tournament_history (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id    TEXT NOT NULL,
  tournament_name  TEXT,
  host_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  matches_count    INTEGER NOT NULL DEFAULT 0,
  first_match_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_match_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_rth_user_last     ON public.referee_tournament_history(user_id, last_match_at DESC);
CREATE INDEX IF NOT EXISTS idx_rth_host          ON public.referee_tournament_history(host_user_id);

ALTER TABLE public.referee_tournament_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rth_read_all"  ON public.referee_tournament_history FOR SELECT USING (true);
-- writes only via SECURITY DEFINER RPC

-- ════════════════════════════════════════════════════════════════════════════
-- 2. RPC: record one tournament match officiated (idempotent-ish: per call = +1)
--   - Upserts per-tournament row, bumps matches_count + last_match_at
--   - On first row for (user, tournament): bumps referee_contributions.tournaments_count
--   - Always bumps referee_contributions.matches_officiated by 1
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_record_tournament_match_refereed(
  p_tournament_id    TEXT,
  p_tournament_name  TEXT,
  p_referee_user_id  UUID,
  p_host_user_id     UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_first_for_tournament BOOLEAN := false;
BEGIN
  IF p_referee_user_id IS NULL THEN RETURN; END IF;

  -- Did a row for (user, tournament) exist before?
  IF NOT EXISTS (
    SELECT 1 FROM public.referee_tournament_history
     WHERE user_id = p_referee_user_id AND tournament_id = p_tournament_id
  ) THEN
    v_first_for_tournament := true;
  END IF;

  -- Upsert per-tournament row
  INSERT INTO public.referee_tournament_history(
    user_id, tournament_id, tournament_name, host_user_id, matches_count, first_match_at, last_match_at
  ) VALUES (
    p_referee_user_id, p_tournament_id, p_tournament_name, p_host_user_id, 1, now(), now()
  )
  ON CONFLICT (user_id, tournament_id) DO UPDATE SET
    matches_count   = public.referee_tournament_history.matches_count + 1,
    last_match_at   = now(),
    tournament_name = COALESCE(EXCLUDED.tournament_name, public.referee_tournament_history.tournament_name),
    host_user_id    = COALESCE(EXCLUDED.host_user_id,    public.referee_tournament_history.host_user_id);

  -- Aggregate counters (ensure row exists, then bump)
  INSERT INTO public.referee_contributions(user_id, matches_officiated, tournaments_count)
  VALUES (p_referee_user_id, 1, CASE WHEN v_first_for_tournament THEN 1 ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    matches_officiated = public.referee_contributions.matches_officiated + 1,
    tournaments_count  = public.referee_contributions.tournaments_count +
      CASE WHEN v_first_for_tournament THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_tournament_match_refereed(TEXT, TEXT, UUID, UUID) TO authenticated;
