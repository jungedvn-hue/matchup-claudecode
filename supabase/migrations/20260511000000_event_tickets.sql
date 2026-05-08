-- Phase 3b: Free tickets — auto-issued on RSVP=going

CREATE TABLE IF NOT EXISTS public.event_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_token        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  price           NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used','cancelled')),
  checked_in_at   TIMESTAMPTZ,
  checked_in_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_tickets_user ON public.event_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_tickets_event ON public.event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_qr ON public.event_tickets(qr_token);

-- Auto-issue ticket when RSVP=going; cancel when leaves going
CREATE OR REPLACE FUNCTION public.sync_event_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- RSVP removed entirely → cancel ticket if not already used
    UPDATE public.event_tickets
       SET status = 'cancelled'
     WHERE event_id = OLD.event_id AND user_id = OLD.user_id AND status = 'valid';
    RETURN OLD;
  END IF;

  IF (NEW.status = 'going') THEN
    -- Upsert: create new valid ticket OR re-activate cancelled one
    INSERT INTO public.event_tickets(event_id, user_id, status)
    VALUES (NEW.event_id, NEW.user_id, 'valid')
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET status = 'valid'
    WHERE public.event_tickets.status = 'cancelled';
  ELSE
    -- Maybe / not_going → cancel any unused ticket
    UPDATE public.event_tickets
       SET status = 'cancelled'
     WHERE event_id = NEW.event_id AND user_id = NEW.user_id AND status = 'valid';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_ticket_sync ON public.group_event_attendees;
CREATE TRIGGER trg_event_ticket_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.group_event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_ticket();

-- RLS
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

-- Owner reads own ticket; group host/admin reads tickets for their event
CREATE POLICY "et_read_owner_or_host" ON public.event_tickets FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.group_events ge
    JOIN public.group_members gm ON gm.group_id = ge.group_id
    WHERE ge.id = event_tickets.event_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('host','admin')
      AND gm.status = 'active'
  )
);

-- Inserts only via trigger (no direct API insert needed)
-- Updates: only group host/admin can mark as used (check-in)
CREATE POLICY "et_update_host" ON public.event_tickets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.group_events ge
    JOIN public.group_members gm ON gm.group_id = ge.group_id
    WHERE ge.id = event_tickets.event_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('host','admin')
      AND gm.status = 'active'
  )
);

-- Atomic check-in RPC: validate token + event + host role + not-yet-used
CREATE OR REPLACE FUNCTION public.checkin_ticket(p_token UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket public.event_tickets%ROWTYPE;
  v_group  UUID;
  v_name   TEXT;
BEGIN
  SELECT * INTO v_ticket FROM public.event_tickets WHERE qr_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  SELECT group_id INTO v_group FROM public.group_events WHERE id = v_ticket.event_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = v_group AND user_id = auth.uid()
      AND role IN ('host','admin') AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_ticket.status = 'used' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used',
      'checked_in_at', v_ticket.checked_in_at);
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cancelled');
  END IF;

  UPDATE public.event_tickets
     SET status = 'used', checked_in_at = now(), checked_in_by = auth.uid()
   WHERE id = v_ticket.id;

  SELECT display_name INTO v_name FROM public.profiles WHERE user_id = v_ticket.user_id;

  RETURN jsonb_build_object('ok', true, 'user_id', v_ticket.user_id,
    'display_name', COALESCE(v_name, 'Player'), 'event_id', v_ticket.event_id);
END;
$$;
