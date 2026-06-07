-- "Tăng nước" — gift a real drink to a player currently in an open session.
-- A gift is a normal venue_order paid by the gifter (player_id) but delivered to
-- the recipient (recipient_id) at the court of the open venue_session they joined.
-- Venue staff fulfils it via VenueOrdersPage. Money goes to the venue via VietQR.
-- Gifter can be remote — only the recipient must be checked into an open session.

-- 1. recipient_id on venue_orders ------------------------------------------------
ALTER TABLE public.venue_orders
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS venue_orders_recipient_idx ON public.venue_orders(recipient_id);

-- Recipient can also read orders gifted to them (payer + venue owner already could).
DROP POLICY IF EXISTS "venue_orders_read" ON public.venue_orders;
CREATE POLICY "venue_orders_read" ON public.venue_orders
  FOR SELECT USING (
    player_id = auth.uid()
    OR recipient_id = auth.uid()
    OR public.fn_is_venue_owner(venue_id)
  );

-- 2. Let players in the same session see each other (to pick a gift recipient) ----
DROP POLICY IF EXISTS "venue_session_members_read" ON public.venue_session_members;
CREATE POLICY "venue_session_members_read" ON public.venue_session_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.venue_session_members me
               WHERE me.session_id = venue_session_members.session_id
                 AND me.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.venue_sessions s
               WHERE s.id = venue_session_members.session_id
                 AND public.fn_is_venue_owner(s.venue_id))
  );

-- 3. Resolve the open session(s) of a set of users (bypasses member RLS safely;
--    returns only the minimal info needed to deliver a gift). --------------------
CREATE OR REPLACE FUNCTION public.fn_users_open_sessions(p_users UUID[])
RETURNS TABLE (user_id UUID, session_id UUID, venue_id UUID, court_ref TEXT, title TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (m.user_id)
         m.user_id, s.id, s.venue_id, s.court_ref, s.title
  FROM public.venue_session_members m
  JOIN public.venue_sessions s ON s.id = m.session_id
  WHERE m.user_id = ANY(p_users) AND s.status = 'open'
  ORDER BY m.user_id, s.starts_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.fn_users_open_sessions(UUID[]) TO authenticated;
