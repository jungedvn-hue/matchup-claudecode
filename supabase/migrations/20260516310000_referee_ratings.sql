-- Referee Ratings (R-B) — reputation loop
-- Hosts who hired a referee (referee_tournament_history.host_user_id = me) can rate.
-- Inserts/updates/deletes recompute rating_avg + rating_count on referee_contributions.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. TABLE
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.referee_ratings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rater_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id     TEXT,
  stars             SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referee_user_id, rater_user_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_rr_referee_recent ON public.referee_ratings(referee_user_id, created_at DESC);

ALTER TABLE public.referee_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_read_all"     ON public.referee_ratings FOR SELECT USING (true);
CREATE POLICY "rr_delete_own"   ON public.referee_ratings FOR DELETE USING (rater_user_id = auth.uid());
-- INSERT + UPDATE go through fn_rate_referee (validates the host relationship)

-- ════════════════════════════════════════════════════════════════════════════
-- 2. TRIGGER: recompute aggregate on insert / update / delete
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_recompute_referee_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target UUID;
  v_avg    NUMERIC(3,2);
  v_count  INTEGER;
BEGIN
  v_target := COALESCE(NEW.referee_user_id, OLD.referee_user_id);
  IF v_target IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT ROUND(AVG(stars)::numeric, 2), COUNT(*)
    INTO v_avg, v_count
    FROM public.referee_ratings WHERE referee_user_id = v_target;

  INSERT INTO public.referee_contributions(user_id, rating_avg, rating_count)
  VALUES (v_target, v_avg, COALESCE(v_count, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    rating_avg   = v_avg,
    rating_count = COALESCE(v_count, 0),
    updated_at   = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_referee_rating_recompute ON public.referee_ratings;
CREATE TRIGGER trg_referee_rating_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.referee_ratings
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_referee_rating();

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RPC: rate a referee (validates host relationship)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_rate_referee(
  p_referee_user_id UUID,
  p_tournament_id   TEXT,
  p_stars           SMALLINT,
  p_comment         TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rater UUID := auth.uid();
  v_id    UUID;
  v_relation BOOLEAN;
BEGIN
  IF v_rater IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_rater = p_referee_user_id THEN RAISE EXCEPTION 'Cannot rate yourself'; END IF;
  IF p_stars < 1 OR p_stars > 5 THEN RAISE EXCEPTION 'Stars must be 1-5'; END IF;

  -- Caller must have hosted a tournament this referee served
  SELECT EXISTS (
    SELECT 1 FROM public.referee_tournament_history
     WHERE user_id = p_referee_user_id
       AND host_user_id = v_rater
       AND (p_tournament_id IS NULL OR tournament_id = p_tournament_id)
  ) INTO v_relation;

  IF NOT v_relation THEN
    RAISE EXCEPTION 'You must have hosted a tournament this referee served' USING ERRCODE = 'P0030';
  END IF;

  INSERT INTO public.referee_ratings(referee_user_id, rater_user_id, tournament_id, stars, comment)
  VALUES (p_referee_user_id, v_rater, p_tournament_id, p_stars, NULLIF(trim(p_comment), ''))
  ON CONFLICT (referee_user_id, rater_user_id, tournament_id) DO UPDATE SET
    stars      = EXCLUDED.stars,
    comment    = EXCLUDED.comment,
    updated_at = now()
  RETURNING id INTO v_id;

  -- Notify referee
  PERFORM public.fn_notify(
    p_referee_user_id,
    'referee_rated',
    'New rating received',
    p_stars::TEXT || '★ from a host you worked with',
    'referee_rating', v_id::TEXT,
    '/referee/' || p_referee_user_id::TEXT
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_rate_referee(UUID, TEXT, SMALLINT, TEXT) TO authenticated;
