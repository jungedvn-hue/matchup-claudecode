-- Notifications v1 (idempotent fix)

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  ref_type   TEXT,
  ref_id     TEXT,
  link       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_read_own"   ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_read_own"   ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- ── RPCs ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_mark_notifications_read(p_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_ids IS NULL THEN
    UPDATE public.notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL;
  ELSE
    UPDATE public.notifications SET read_at = now() WHERE user_id = auth.uid() AND id = ANY(p_ids) AND read_at IS NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_mark_notifications_read(UUID[]) TO authenticated;

-- ── Trigger functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_notify_join_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host_id UUID; v_group_name TEXT; v_name TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT g.host_user_id, g.name INTO v_host_id, v_group_name FROM public.groups g WHERE g.id = NEW.group_id;
  SELECT COALESCE(display_name, 'Someone') INTO v_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
  VALUES (v_host_id, 'group_join_request', v_name || ' wants to join', v_group_name, 'group', NEW.group_id::TEXT, '/group/' || NEW.group_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group_name TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
    INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
    VALUES (NEW.user_id, 'group_approved', 'Request approved 🎉', 'You are now a member of ' || v_group_name, 'group', NEW.group_id::TEXT, '/group/' || NEW.group_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_announcement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group_name TEXT; v_member RECORD; v_title TEXT;
BEGIN
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  v_title := CASE WHEN NEW.title IS NOT NULL AND NEW.title <> '' THEN NEW.title ELSE 'New announcement' END;
  FOR v_member IN
    SELECT user_id FROM public.group_members WHERE group_id = NEW.group_id AND status = 'active' AND user_id <> NEW.author_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
    VALUES (v_member.user_id, 'group_announcement', v_group_name || ': ' || v_title, LEFT(NEW.body, 100), 'announcement', NEW.id::TEXT, '/group/' || NEW.group_id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_event_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group_name TEXT; v_member RECORD;
BEGIN
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
  FOR v_member IN
    SELECT user_id FROM public.group_members WHERE group_id = NEW.group_id AND status = 'active' AND user_id <> NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
    VALUES (v_member.user_id, 'event_created', 'New event in ' || v_group_name, NEW.title, 'event', NEW.id::TEXT, '/group/' || NEW.group_id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_drink_gift()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  SELECT COALESCE(display_name, 'Someone') INTO v_name FROM public.profiles WHERE user_id = NEW.from_user_id;
  INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
  VALUES (NEW.to_user_id, 'gift_received', v_name || ' gifted you a drink! 🧃', NEW.item_name || ' · ' || NEW.coins_item || ' coins', 'gift', NEW.id::TEXT, '/wallet');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_coin_gift()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT; v_sender_id UUID;
BEGIN
  IF NEW.type <> 'gift_received' THEN RETURN NEW; END IF;
  SELECT user_id INTO v_sender_id FROM public.coin_transactions WHERE ref_id = NEW.ref_id AND type = 'gift_sent' LIMIT 1;
  IF v_sender_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, 'Someone') INTO v_name FROM public.profiles WHERE user_id = v_sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
  VALUES (NEW.user_id, 'gift_received', v_name || ' sent you ' || NEW.amount || ' coins 🎁', NULL, 'wallet', NEW.ref_id, '/wallet');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_friend()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT COALESCE(display_name, 'Someone') INTO v_name FROM public.profiles WHERE user_id = NEW.requester_id;
    INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
    VALUES (NEW.addressee_id, 'friend_request', v_name || ' sent you a friend request', NULL, 'friend', NEW.id::TEXT, '/friends');
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT COALESCE(display_name, 'Someone') INTO v_name FROM public.profiles WHERE user_id = NEW.addressee_id;
    INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
    VALUES (NEW.requester_id, 'friend_accepted', v_name || ' accepted your friend request 🤝', NULL, 'friend', NEW.id::TEXT, '/friends');
  END IF;
  RETURN NEW;
END;
$$;

-- ── Attach triggers ───────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_notify_join_request   ON public.group_members;
DROP TRIGGER IF EXISTS trg_notify_approved        ON public.group_members;
DROP TRIGGER IF EXISTS trg_notify_announcement    ON public.group_announcements;
DROP TRIGGER IF EXISTS trg_notify_event_created   ON public.group_events;
DROP TRIGGER IF EXISTS trg_notify_drink_gift      ON public.drink_gifts;
DROP TRIGGER IF EXISTS trg_notify_coin_gift       ON public.coin_transactions;
DROP TRIGGER IF EXISTS trg_notify_friend          ON public.friendships;

CREATE TRIGGER trg_notify_join_request  AFTER INSERT ON public.group_members     FOR EACH ROW EXECUTE FUNCTION public.trg_notify_join_request();
CREATE TRIGGER trg_notify_approved      AFTER UPDATE ON public.group_members     FOR EACH ROW EXECUTE FUNCTION public.trg_notify_approved();
CREATE TRIGGER trg_notify_announcement  AFTER INSERT ON public.group_announcements FOR EACH ROW EXECUTE FUNCTION public.trg_notify_announcement();
CREATE TRIGGER trg_notify_event_created AFTER INSERT ON public.group_events      FOR EACH ROW EXECUTE FUNCTION public.trg_notify_event_created();
CREATE TRIGGER trg_notify_drink_gift    AFTER INSERT ON public.drink_gifts        FOR EACH ROW EXECUTE FUNCTION public.trg_notify_drink_gift();
CREATE TRIGGER trg_notify_coin_gift     AFTER INSERT ON public.coin_transactions  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_coin_gift();
CREATE TRIGGER trg_notify_friend        AFTER INSERT OR UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.trg_notify_friend();
