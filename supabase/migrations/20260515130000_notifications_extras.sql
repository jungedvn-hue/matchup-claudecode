-- Notifications extras: friend trigger column fix + referee invite trigger

-- ── Friend trigger: friendships uses sender_id / receiver_id (not requester/addressee)

CREATE OR REPLACE FUNCTION public.trg_notify_friend()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT COALESCE(display_name, 'Someone') INTO v_name FROM public.profiles WHERE user_id = NEW.sender_id;
    INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
    VALUES (NEW.receiver_id, 'friend_request', v_name || ' sent you a friend request', NULL, 'friend', NEW.id::TEXT, '/friends');
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT COALESCE(display_name, 'Someone') INTO v_name FROM public.profiles WHERE user_id = NEW.receiver_id;
    INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
    VALUES (NEW.sender_id, 'friend_accepted', v_name || ' accepted your friend request 🤝', NULL, 'friend', NEW.id::TEXT, '/friends');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_friend ON public.friendships;
CREATE TRIGGER trg_notify_friend
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_friend();

-- ── Referee invite: notify on INSERT (if invitee_user_id known) or on resolve (UPDATE NULL → set)

CREATE OR REPLACE FUNCTION public.trg_notify_referee_invite()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host_name TEXT; v_target UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_target := NEW.invitee_user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.invitee_user_id IS NULL AND NEW.invitee_user_id IS NOT NULL THEN
    v_target := NEW.invitee_user_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_target IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, 'A host') INTO v_host_name FROM public.profiles WHERE user_id = NEW.host_user_id;
  INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
  VALUES (v_target, 'referee_invite', v_host_name || ' invited you to officiate 🎽',
          COALESCE(NEW.message, 'Tap to view tournament'),
          'referee_invite', NEW.id::TEXT, '/referee');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_referee_invite ON public.referee_invites;
CREATE TRIGGER trg_notify_referee_invite
  AFTER INSERT OR UPDATE ON public.referee_invites
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_referee_invite();
