-- ═════════════════════════════════════════════════════════════════════════════
-- Referee v1 — Contributions tracking + invitation flow
-- (Social match verification schema already exists in match_records:
--  referee_user_id, referee_verified, referee_verified_at columns)
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. Contributions: track matches officiated globally + per tournament ───────
CREATE TABLE IF NOT EXISTS public.referee_contributions (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  matches_officiated   INTEGER NOT NULL DEFAULT 0,
  social_verifications INTEGER NOT NULL DEFAULT 0,
  tournaments_count    INTEGER NOT NULL DEFAULT 0,
  rating_avg           NUMERIC(3,2),  -- avg from host feedback (future)
  rating_count         INTEGER NOT NULL DEFAULT 0,
  certification_level  TEXT NOT NULL DEFAULT 'community'
    CHECK (certification_level IN ('community','regional','national')),
  preferred_locations  TEXT[],
  bio                  TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referee_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc_read_all" ON public.referee_contributions FOR SELECT USING (true);
CREATE POLICY "rc_write_own" ON public.referee_contributions FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Referee invites (host invites a player to be referee for a tournament) ─
CREATE TABLE IF NOT EXISTS public.referee_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   TEXT NOT NULL,                                       -- tournaments stored as JSON, id is text
  host_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email   TEXT NOT NULL,
  invitee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- resolved when invitee signs in
  access_code     TEXT NOT NULL UNIQUE,                                -- 6-char code
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired')),
  message         TEXT,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '14 days',
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ri_tournament ON public.referee_invites(tournament_id);
CREATE INDEX IF NOT EXISTS idx_ri_invitee_email ON public.referee_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_ri_access_code ON public.referee_invites(access_code);

ALTER TABLE public.referee_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ri_read_party" ON public.referee_invites FOR SELECT USING (
  host_user_id = auth.uid()
  OR invitee_user_id = auth.uid()
  OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
CREATE POLICY "ri_create_host" ON public.referee_invites FOR INSERT WITH CHECK (host_user_id = auth.uid());
CREATE POLICY "ri_update_party" ON public.referee_invites FOR UPDATE USING (
  invitee_user_id = auth.uid()
  OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR host_user_id = auth.uid()
);

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ═════════════════════════════════════════════════════════════════════════════

-- Increment referee contribution count (called when referee verifies a match
-- or completes a tournament match)
CREATE OR REPLACE FUNCTION public.fn_referee_increment(
  p_user UUID, p_kind TEXT  -- 'tournament' | 'social'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.referee_contributions(user_id, matches_officiated, social_verifications)
  VALUES (
    p_user,
    CASE WHEN p_kind = 'tournament' THEN 1 ELSE 0 END,
    CASE WHEN p_kind = 'social'     THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    matches_officiated = public.referee_contributions.matches_officiated +
      CASE WHEN p_kind = 'tournament' THEN 1 ELSE 0 END,
    social_verifications = public.referee_contributions.social_verifications +
      CASE WHEN p_kind = 'social' THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_referee_increment(UUID, TEXT) TO authenticated;

-- Trigger: when match_records.referee_verified flips to true, increment
CREATE OR REPLACE FUNCTION public.trg_referee_verify_increment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referee_verified = true AND COALESCE(OLD.referee_verified, false) = false
     AND NEW.referee_user_id IS NOT NULL THEN
    PERFORM public.fn_referee_increment(NEW.referee_user_id, 'social');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_referee_increment ON public.match_records;
CREATE TRIGGER trg_match_referee_increment
  AFTER UPDATE ON public.match_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_referee_verify_increment();

-- Accept invite by access code (resolves invitee_user_id to current user)
CREATE OR REPLACE FUNCTION public.fn_accept_referee_invite(p_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_invite public.referee_invites%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_invite FROM public.referee_invites
   WHERE access_code = upper(p_code) FOR UPDATE;

  IF v_invite.id IS NULL THEN RAISE EXCEPTION 'Invalid code'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'Invite is %', v_invite.status; END IF;
  IF v_invite.expires_at < now() THEN
    UPDATE public.referee_invites SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Invite expired';
  END IF;

  UPDATE public.referee_invites
     SET status = 'accepted', invitee_user_id = v_user, responded_at = now()
   WHERE id = v_invite.id;

  RETURN v_invite.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_accept_referee_invite(TEXT) TO authenticated;

-- Decline invite
CREATE OR REPLACE FUNCTION public.fn_decline_referee_invite(p_invite_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  UPDATE public.referee_invites SET status = 'declined', responded_at = now()
   WHERE id = p_invite_id AND (invitee_user_id = v_user OR
     invitee_email = (SELECT email FROM auth.users WHERE id = v_user));
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_decline_referee_invite(UUID) TO authenticated;
