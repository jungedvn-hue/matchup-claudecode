-- Venue Commerce Phase 1 — PR1: venue_services catalog (independent of store_products)
-- Plan: docs/plans/venue-commerce-phase1.md
-- Scope here: catalog CRUD only. Sessions / orders / credits land in PR2 / PR3.
-- Staff RLS layered in later PR once venue_staff exists; for now owner-only writes.

CREATE TABLE IF NOT EXISTS public.venue_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'other'
                  CHECK (category IN ('drink','food','rental','utility','other')),
  price         NUMERIC(10,0) NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_url     TEXT,
  deliverable   BOOLEAN NOT NULL DEFAULT true,
  is_published  BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venue_services_venue_idx ON public.venue_services(venue_id);
CREATE INDEX IF NOT EXISTS venue_services_published_idx
  ON public.venue_services(venue_id) WHERE is_published = true;

-- Auto-bump updated_at (mirror fn_venues_touch_updated_at)
CREATE OR REPLACE FUNCTION public.fn_venue_services_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS venue_services_touch_updated_at ON public.venue_services;
CREATE TRIGGER venue_services_touch_updated_at
  BEFORE UPDATE ON public.venue_services
  FOR EACH ROW EXECUTE FUNCTION public.fn_venue_services_touch_updated_at();

ALTER TABLE public.venue_services ENABLE ROW LEVEL SECURITY;

-- Public reads published services of active venues; owner reads all their own.
DROP POLICY IF EXISTS "venue_services_read" ON public.venue_services;
CREATE POLICY "venue_services_read" ON public.venue_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_services.venue_id
        AND (
          (venue_services.is_published = true AND v.status = 'active')
          OR v.owner_user_id = auth.uid()
        )
    )
  );

-- Owner of the venue can fully manage its services.
DROP POLICY IF EXISTS "venue_services_owner_insert" ON public.venue_services;
CREATE POLICY "venue_services_owner_insert" ON public.venue_services
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.venues v
            WHERE v.id = venue_services.venue_id AND v.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "venue_services_owner_update" ON public.venue_services;
CREATE POLICY "venue_services_owner_update" ON public.venue_services
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.venues v
            WHERE v.id = venue_services.venue_id AND v.owner_user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.venues v
            WHERE v.id = venue_services.venue_id AND v.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "venue_services_owner_delete" ON public.venue_services;
CREATE POLICY "venue_services_owner_delete" ON public.venue_services
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.venues v
            WHERE v.id = venue_services.venue_id AND v.owner_user_id = auth.uid())
  );
