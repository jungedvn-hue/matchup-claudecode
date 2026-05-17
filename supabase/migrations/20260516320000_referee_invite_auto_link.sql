-- R-E: invite + auto-link to tournament.referees JSONB
-- Fixes PRD blocker AC-A3: accepted invite = automatic tournament join.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. RPC: invite referee from their MatchUp profile (host-initiated)
--    - Inserts referee_invites row
--    - Inserts a pending slot into tournaments.referees JSONB
--    - Sends notification 'referee_invite_received'
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_invite_referee(
  p_tournament_id   UUID,
  p_referee_user_id UUID,
  p_message         TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_host      UUID := auth.uid();
  v_email     TEXT;
  v_name      TEXT;
  v_code      TEXT;
  v_invite_id UUID;
  v_tname     TEXT;
  v_chars     TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  IF v_host IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_host = p_referee_user_id THEN RAISE EXCEPTION 'Cannot invite yourself'; END IF;

  -- Confirm caller hosts this tournament
  IF NOT EXISTS (SELECT 1 FROM public.tournaments WHERE id = p_tournament_id AND host_id = v_host) THEN
    RAISE EXCEPTION 'Not the host of this tournament';
  END IF;

  -- Resolve referee email + name
  SELECT email INTO v_email FROM auth.users WHERE id = p_referee_user_id;
  SELECT display_name INTO v_name FROM public.profiles WHERE id = p_referee_user_id;
  v_name := COALESCE(v_name, 'Referee');
  SELECT name INTO v_tname FROM public.tournaments WHERE id = p_tournament_id;

  -- Prevent duplicate pending invite for same (tournament, referee)
  IF EXISTS (
    SELECT 1 FROM public.referee_invites
     WHERE tournament_id = p_tournament_id::TEXT
       AND invitee_user_id = p_referee_user_id
       AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Already invited' USING ERRCODE = 'P0040';
  END IF;

  -- Generate 6-char unique-ish code
  v_code := '';
  FOR i IN 1..6 LOOP
    v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
  END LOOP;

  -- Insert invite row
  INSERT INTO public.referee_invites(
    tournament_id, host_user_id, invitee_email, invitee_user_id, access_code, message
  ) VALUES (
    p_tournament_id::TEXT, v_host, COALESCE(v_email, ''), p_referee_user_id, v_code, p_message
  ) RETURNING id INTO v_invite_id;

  -- Append pending slot into tournament.referees JSONB
  UPDATE public.tournaments
     SET referees = COALESCE(referees, '[]'::jsonb) || jsonb_build_array(
           jsonb_build_object(
             'id',         'ref-' || extract(epoch from now())::bigint || '-' || substr(v_code, 1, 3),
             'name',       v_name,
             'accessCode', v_code,
             'userId',     NULL,
             'invitedUserId', p_referee_user_id::text
           )
         ),
         updated_at = now()
   WHERE id = p_tournament_id;

  -- Notification
  PERFORM public.fn_notify(
    p_referee_user_id,
    'referee_invite_received',
    'Tournament invite',
    COALESCE(v_tname, 'A tournament') || ' invited you to referee',
    'tournament', p_tournament_id::TEXT,
    '/referee'
  );

  RETURN v_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_invite_referee(UUID, UUID, TEXT) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. REPLACE fn_accept_referee_invite — now also links userId into
--    tournaments.referees JSONB slot (matched by access_code).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_accept_referee_invite(p_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_invite public.referee_invites%ROWTYPE;
  v_t_uuid UUID;
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

  -- Flip invite status
  UPDATE public.referee_invites
     SET status = 'accepted', invitee_user_id = v_user, responded_at = now()
   WHERE id = v_invite.id;

  -- Link userId into tournament.referees slot (match by accessCode)
  BEGIN
    v_t_uuid := v_invite.tournament_id::UUID;
    UPDATE public.tournaments
       SET referees = (
             SELECT jsonb_agg(
               CASE
                 WHEN r->>'accessCode' = v_invite.access_code
                   THEN r || jsonb_build_object('userId', v_user::text)
                 ELSE r
               END
             )
             FROM jsonb_array_elements(COALESCE(referees, '[]'::jsonb)) r
           ),
           updated_at = now()
     WHERE id = v_t_uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    -- tournament_id wasn't a UUID (legacy invite); skip JSONB linking
    NULL;
  END;

  RETURN v_invite.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_accept_referee_invite(TEXT) TO authenticated;
