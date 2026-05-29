-- Venue Commerce Phase 1 — PR2: commercial sessions + orders
-- Plan: docs/plans/venue-commerce-phase1.md
-- Scope: sessions, member join, orders + items, cart/checkout (cash + VietQR).
-- Co-host attribution + host credits accrual logic land in PR3 (columns present here,
-- but attributed_host_id / credit_back_rate stay unused until then).

-- A. Commercial sessions ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id         UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  court_ref        TEXT,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ,
  cohost_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  credit_back_rate NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (credit_back_rate >= 0 AND credit_back_rate <= 1),
  attribution_days INT NOT NULL DEFAULT 15 CHECK (attribution_days IN (15,30)),
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS venue_sessions_venue_idx ON public.venue_sessions(venue_id, starts_at DESC);

CREATE OR REPLACE FUNCTION public.fn_venue_sessions_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS venue_sessions_touch ON public.venue_sessions;
CREATE TRIGGER venue_sessions_touch
  BEFORE UPDATE ON public.venue_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_venue_sessions_touch();

-- B. Session members + attribution snapshot --------------------------------
CREATE TABLE IF NOT EXISTS public.venue_session_members (
  session_id        UUID NOT NULL REFERENCES public.venue_sessions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  attribution_until TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

-- Snapshot attribution window from the session at join time (used by PR3 credits).
CREATE OR REPLACE FUNCTION public.fn_venue_session_member_attribution()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE d INT;
BEGIN
  SELECT attribution_days INTO d FROM public.venue_sessions WHERE id = NEW.session_id;
  NEW.attribution_until := NEW.joined_at + (COALESCE(d, 15) || ' days')::interval;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS venue_session_member_attribution ON public.venue_session_members;
CREATE TRIGGER venue_session_member_attribution
  BEFORE INSERT ON public.venue_session_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_venue_session_member_attribution();

-- C. Orders ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  session_id          UUID REFERENCES public.venue_sessions(id) ON DELETE SET NULL,
  player_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  court_ref           TEXT,
  attributed_host_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','preparing','delivered','cancelled')),
  payment_method      TEXT NOT NULL CHECK (payment_method IN ('cash','qr')),
  payment_status      TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  subtotal            NUMERIC(10,0) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  total               NUMERIC(10,0) NOT NULL DEFAULT 0 CHECK (total >= 0),
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS venue_orders_venue_idx   ON public.venue_orders(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS venue_orders_player_idx  ON public.venue_orders(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS venue_orders_session_idx ON public.venue_orders(session_id);

CREATE TABLE IF NOT EXISTS public.venue_order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.venue_orders(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES public.venue_services(id),
  name        TEXT NOT NULL,
  qty         INT NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(10,0) NOT NULL CHECK (unit_price >= 0),
  subtotal    NUMERIC(10,0) NOT NULL CHECK (subtotal >= 0)
);
CREATE INDEX IF NOT EXISTS venue_order_items_order_idx ON public.venue_order_items(order_id);

-- D. RLS --------------------------------------------------------------------
ALTER TABLE public.venue_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_order_items     ENABLE ROW LEVEL SECURITY;

-- Helper: is current user the owner of a venue?
CREATE OR REPLACE FUNCTION public.fn_is_venue_owner(p_venue_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.venues v WHERE v.id = p_venue_id AND v.owner_user_id = auth.uid());
$$;

-- Sessions: anyone authed can read non-cancelled (to join via link); owner reads all.
DROP POLICY IF EXISTS "venue_sessions_read" ON public.venue_sessions;
CREATE POLICY "venue_sessions_read" ON public.venue_sessions
  FOR SELECT USING (status <> 'cancelled' OR public.fn_is_venue_owner(venue_id));

DROP POLICY IF EXISTS "venue_sessions_owner_write" ON public.venue_sessions;
CREATE POLICY "venue_sessions_owner_write" ON public.venue_sessions
  FOR ALL USING (public.fn_is_venue_owner(venue_id))
  WITH CHECK (public.fn_is_venue_owner(venue_id) AND created_by = auth.uid());

-- Members: player joins for self; reads own rows or venue owner reads all in their venue.
DROP POLICY IF EXISTS "venue_session_members_read" ON public.venue_session_members;
CREATE POLICY "venue_session_members_read" ON public.venue_session_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.venue_sessions s
               WHERE s.id = venue_session_members.session_id AND public.fn_is_venue_owner(s.venue_id))
  );

DROP POLICY IF EXISTS "venue_session_members_self_join" ON public.venue_session_members;
CREATE POLICY "venue_session_members_self_join" ON public.venue_session_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "venue_session_members_self_leave" ON public.venue_session_members;
CREATE POLICY "venue_session_members_self_leave" ON public.venue_session_members
  FOR DELETE USING (user_id = auth.uid());

-- Orders: read by player or venue owner; player inserts own; player cancels own / owner updates any.
DROP POLICY IF EXISTS "venue_orders_read" ON public.venue_orders;
CREATE POLICY "venue_orders_read" ON public.venue_orders
  FOR SELECT USING (player_id = auth.uid() OR public.fn_is_venue_owner(venue_id));

DROP POLICY IF EXISTS "venue_orders_player_insert" ON public.venue_orders;
CREATE POLICY "venue_orders_player_insert" ON public.venue_orders
  FOR INSERT WITH CHECK (player_id = auth.uid());

DROP POLICY IF EXISTS "venue_orders_update" ON public.venue_orders;
CREATE POLICY "venue_orders_update" ON public.venue_orders
  FOR UPDATE USING (player_id = auth.uid() OR public.fn_is_venue_owner(venue_id));

-- Order items: visible/insertable when the parent order belongs to the user;
-- venue owner can read all items of their venue's orders.
DROP POLICY IF EXISTS "venue_order_items_read" ON public.venue_order_items;
CREATE POLICY "venue_order_items_read" ON public.venue_order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.venue_orders o
            WHERE o.id = venue_order_items.order_id
              AND (o.player_id = auth.uid() OR public.fn_is_venue_owner(o.venue_id)))
  );

DROP POLICY IF EXISTS "venue_order_items_player_insert" ON public.venue_order_items;
CREATE POLICY "venue_order_items_player_insert" ON public.venue_order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.venue_orders o
            WHERE o.id = venue_order_items.order_id AND o.player_id = auth.uid())
  );
