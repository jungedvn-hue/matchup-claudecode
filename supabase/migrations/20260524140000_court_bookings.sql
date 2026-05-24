-- Court Owner V2.0a — Court bookings (player-initiated, owner-managed)
-- PRD: docs/prd/court_owner/COURT_OWNER_PRD_V1.en.md §11 Phase 3
-- Payment processing is OUT of scope: payment_status tracked but transfer happens off-app.

-- Required for EXCLUDE constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.court_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  court_index     INT  NOT NULL CHECK (court_index >= 1),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  price_vnd       INT  NOT NULL DEFAULT 0 CHECK (price_vnd >= 0),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid','paid','refunded')),
  qr_token        TEXT NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_order CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS court_bookings_venue_idx    ON public.court_bookings(venue_id, start_at);
CREATE INDEX IF NOT EXISTS court_bookings_user_idx     ON public.court_bookings(user_id, start_at DESC);
CREATE INDEX IF NOT EXISTS court_bookings_qr_idx       ON public.court_bookings(qr_token);

-- Prevent double-booking the same court at overlapping time, except cancelled rows.
ALTER TABLE public.court_bookings DROP CONSTRAINT IF EXISTS court_bookings_no_overlap;
ALTER TABLE public.court_bookings
  ADD CONSTRAINT court_bookings_no_overlap
  EXCLUDE USING gist (
    venue_id       WITH =,
    court_index    WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status NOT IN ('cancelled','no_show'));

-- Auto-bump updated_at
CREATE OR REPLACE FUNCTION public.fn_court_bookings_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS court_bookings_touch ON public.court_bookings;
CREATE TRIGGER court_bookings_touch
  BEFORE UPDATE ON public.court_bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_court_bookings_touch();

ALTER TABLE public.court_bookings ENABLE ROW LEVEL SECURITY;

-- Read: booker + venue owner; public sees only confirmed (for availability).
CREATE POLICY "bookings_read_booker_or_owner" ON public.court_bookings
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_user_id = auth.uid())
    OR status = 'confirmed'
  );

-- Insert: any authed user can request a booking for themselves.
CREATE POLICY "bookings_insert_self" ON public.court_bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update: booker can update their own (typically to cancel);
-- venue owner can update any booking at their venue (approve, mark paid, check-in).
CREATE POLICY "bookings_update_booker_or_owner" ON public.court_bookings
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_user_id = auth.uid())
  );

-- Delete: only owner of venue or booker
CREATE POLICY "bookings_delete_booker_or_owner" ON public.court_bookings
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_user_id = auth.uid())
  );
