-- Referee availability: blocked dates
-- A referee marks specific dates as unavailable. Public read so hosts can
-- see availability before inviting; only the owner can add/remove.

CREATE TABLE IF NOT EXISTS public.referee_blocked_dates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_date  DATE NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS referee_blocked_dates_user_idx
  ON public.referee_blocked_dates(user_id, blocked_date);

ALTER TABLE public.referee_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (hosts check referee availability).
CREATE POLICY "rbd_read_all" ON public.referee_blocked_dates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the owner manages their own blocked dates.
CREATE POLICY "rbd_insert_own" ON public.referee_blocked_dates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "rbd_delete_own" ON public.referee_blocked_dates
  FOR DELETE USING (user_id = auth.uid());
