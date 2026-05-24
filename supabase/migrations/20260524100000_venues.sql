-- Court Owner V1: venues registry (multi-venue per owner)
-- PRD: docs/prd/court_owner/COURT_OWNER_PRD_V1.en.md §5.1
-- Out of scope here: photos, bookings, payment. Those land in V2+.

CREATE TABLE IF NOT EXISTS public.venues (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  court_count      INT  NOT NULL DEFAULT 1 CHECK (court_count >= 0),
  amenities        TEXT[] NOT NULL DEFAULT '{}',
  location         TEXT,
  address          TEXT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  contact_phone    TEXT,
  operating_hours  JSONB,
  pricing          JSONB,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending_verification')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venues_owner_idx ON public.venues(owner_user_id);
CREATE INDEX IF NOT EXISTS venues_status_idx ON public.venues(status) WHERE status = 'active';

-- Auto-bump updated_at
CREATE OR REPLACE FUNCTION public.fn_venues_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS venues_touch_updated_at ON public.venues;
CREATE TRIGGER venues_touch_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.fn_venues_touch_updated_at();

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Public can read active venues; owner reads all their own
CREATE POLICY "venues_read_public_active" ON public.venues
  FOR SELECT USING (status = 'active' OR owner_user_id = auth.uid());

CREATE POLICY "venues_insert_own" ON public.venues
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "venues_update_own" ON public.venues
  FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "venues_delete_own" ON public.venues
  FOR DELETE USING (owner_user_id = auth.uid());
