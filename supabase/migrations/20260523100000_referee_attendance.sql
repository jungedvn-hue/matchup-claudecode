-- Referee attendance: self check-in / check-out per tournament.
-- Payments happen off-app; this table only records timestamps so refs
-- have a verifiable work log on their profile.

CREATE TABLE IF NOT EXISTS public.referee_attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_at    TIMESTAMPTZ,
  check_out_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS referee_attendance_user_idx
  ON public.referee_attendance(user_id, check_in_at DESC);

ALTER TABLE public.referee_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ra_read_all" ON public.referee_attendance
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ra_insert_own" ON public.referee_attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ra_update_own" ON public.referee_attendance
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
