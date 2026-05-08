-- Phase 2: Group events + RSVP

CREATE TABLE IF NOT EXISTS public.group_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  location          TEXT,
  event_date        TIMESTAMPTZ NOT NULL,
  duration_minutes  INT DEFAULT 90,
  max_attendees     INT,
  attendee_count    INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_events_group ON public.group_events(group_id, event_date);
CREATE INDEX IF NOT EXISTS idx_group_events_date ON public.group_events(event_date);

CREATE TABLE IF NOT EXISTS public.group_event_attendees (
  event_id    UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','not_going')),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Sync attendee_count (only counts 'going')
CREATE OR REPLACE FUNCTION public.sync_event_attendee_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.group_events
  SET attendee_count = (
    SELECT COUNT(*) FROM public.group_event_attendees
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
      AND status = 'going'
  )
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_attendee_count ON public.group_event_attendees;
CREATE TRIGGER trg_event_attendee_count
  AFTER INSERT OR UPDATE OR DELETE ON public.group_event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_attendee_count();

-- RLS
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_event_attendees ENABLE ROW LEVEL SECURITY;

-- Anyone can read events (public discoverability)
CREATE POLICY "ge_read" ON public.group_events FOR SELECT USING (true);
-- Only group hosts/admins can create events
CREATE POLICY "ge_insert_host" ON public.group_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_events.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('host','admin')
      AND gm.status = 'active')
);
CREATE POLICY "ge_update_host" ON public.group_events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_events.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('host','admin')
      AND gm.status = 'active')
);
CREATE POLICY "ge_delete_host" ON public.group_events FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_events.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('host','admin')
      AND gm.status = 'active')
);

-- Attendees: anyone can see, only self manages own RSVP
CREATE POLICY "gea_read" ON public.group_event_attendees FOR SELECT USING (true);
CREATE POLICY "gea_upsert_self" ON public.group_event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gea_update_self" ON public.group_event_attendees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gea_delete_self" ON public.group_event_attendees FOR DELETE USING (auth.uid() = user_id);
