-- Allow players to claim their tour_participants entry by linking to auth.users.
-- Used by the /my-matches page to filter matches the current user is playing in.
ALTER TABLE public.tour_participants
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tour_participants_user_id
  ON public.tour_participants(user_id);

-- Index for the most common live query: matches by tournament + status
CREATE INDEX IF NOT EXISTS idx_tour_matches_tournament_status
  ON public.tour_matches(tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_tour_categories_tournament
  ON public.tour_categories(tournament_id);

-- RLS policies: authenticated users (incl. players) can read tournament data
-- they are part of. Required so /my-matches can self-fetch matches involving
-- entries they have claimed via user_id.
DROP POLICY IF EXISTS "auth_read_participants" ON public.tour_participants;
CREATE POLICY "auth_read_participants"
ON public.tour_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_claim_participants" ON public.tour_participants;
CREATE POLICY "auth_claim_participants"
ON public.tour_participants FOR UPDATE TO authenticated
USING (user_id IS NULL OR user_id = auth.uid())
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "auth_read_tournaments" ON public.tournaments;
CREATE POLICY "auth_read_tournaments"
ON public.tournaments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_categories" ON public.tour_categories;
CREATE POLICY "auth_read_categories"
ON public.tour_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_matches" ON public.tour_matches;
CREATE POLICY "auth_read_matches"
ON public.tour_matches FOR SELECT TO authenticated USING (true);
