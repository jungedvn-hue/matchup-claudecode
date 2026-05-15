-- Host ratings v1 — members rate the host of a group they belong to

CREATE TABLE IF NOT EXISTS public.host_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  host_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars         INT  NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, rater_user_id)
);

CREATE INDEX IF NOT EXISTS idx_host_ratings_host  ON public.host_ratings(host_user_id);
CREATE INDEX IF NOT EXISTS idx_host_ratings_group ON public.host_ratings(group_id);

ALTER TABLE public.host_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "host_ratings_read"   ON public.host_ratings;
DROP POLICY IF EXISTS "host_ratings_insert" ON public.host_ratings;
DROP POLICY IF EXISTS "host_ratings_update" ON public.host_ratings;
DROP POLICY IF EXISTS "host_ratings_delete" ON public.host_ratings;

CREATE POLICY "host_ratings_read" ON public.host_ratings FOR SELECT USING (true);

-- Only active members of the group, and not the host themself, can rate
CREATE POLICY "host_ratings_insert" ON public.host_ratings FOR INSERT WITH CHECK (
  rater_user_id = auth.uid()
  AND rater_user_id <> host_user_id
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = host_ratings.group_id
      AND gm.user_id  = auth.uid()
      AND gm.status   = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = host_ratings.group_id
      AND g.host_user_id = host_ratings.host_user_id
  )
);

CREATE POLICY "host_ratings_update" ON public.host_ratings FOR UPDATE USING (
  rater_user_id = auth.uid()
);

CREATE POLICY "host_ratings_delete" ON public.host_ratings FOR DELETE USING (
  rater_user_id = auth.uid()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.trg_host_ratings_set_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_host_ratings_set_updated ON public.host_ratings;
CREATE TRIGGER trg_host_ratings_set_updated
  BEFORE UPDATE ON public.host_ratings
  FOR EACH ROW EXECUTE FUNCTION public.trg_host_ratings_set_updated();

-- Aggregated view: host_id, total ratings, avg stars
CREATE OR REPLACE VIEW public.host_rating_summary AS
SELECT
  host_user_id,
  COUNT(*)::INT      AS rating_count,
  ROUND(AVG(stars)::NUMERIC, 2)::FLOAT AS avg_stars
FROM public.host_ratings
GROUP BY host_user_id;

GRANT SELECT ON public.host_rating_summary TO anon, authenticated;
