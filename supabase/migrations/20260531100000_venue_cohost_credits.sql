-- Venue Commerce Phase 1 — PR3: co-host invites + host credits
-- Plan: docs/plans/venue-commerce-phase1.md
-- Co-host: venue invites a social host to a session (rate public, locked on accept).
-- Credits: orders attributed to a host accrue credit-back when paid; redeemable at the
-- issuing venue. Ledger is append-only; all writes go through definer triggers / RPCs.

-- A. Snapshot credit-back rate onto each order ------------------------------
ALTER TABLE public.venue_orders
  ADD COLUMN IF NOT EXISTS credit_back_rate NUMERIC(4,3) NOT NULL DEFAULT 0
    CHECK (credit_back_rate >= 0 AND credit_back_rate <= 1);

-- B. Co-host invites --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_cohost_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES public.venue_sessions(id) ON DELETE CASCADE,
  venue_id         UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  host_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_back_rate NUMERIC(4,3) NOT NULL CHECK (credit_back_rate >= 0 AND credit_back_rate <= 1),
  attribution_days INT NOT NULL CHECK (attribution_days IN (15,30)),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at     TIMESTAMPTZ,
  UNIQUE (session_id, host_user_id, status)
);
CREATE INDEX IF NOT EXISTS cohost_invites_host_pending
  ON public.venue_cohost_invites (host_user_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS cohost_invites_session_idx
  ON public.venue_cohost_invites (session_id);

ALTER TABLE public.venue_cohost_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cohost_invites_read" ON public.venue_cohost_invites;
CREATE POLICY "cohost_invites_read" ON public.venue_cohost_invites
  FOR SELECT USING (host_user_id = auth.uid() OR public.fn_is_venue_owner(venue_id));
-- Writes go through SECURITY DEFINER RPCs only (no insert/update policies).

-- C. Host credits ledger (append-only) --------------------------------------
CREATE TABLE IF NOT EXISTS public.host_credits_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id      UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES public.venue_orders(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('earn','redeem','adjust')),
  amount        NUMERIC(10,0) NOT NULL,        -- earn > 0, redeem < 0
  balance_after NUMERIC(10,0) NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS host_credits_ledger_idx
  ON public.host_credits_ledger (host_id, venue_id, created_at DESC);

ALTER TABLE public.host_credits_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "host_credits_read" ON public.host_credits_ledger;
CREATE POLICY "host_credits_read" ON public.host_credits_ledger
  FOR SELECT USING (host_id = auth.uid() OR public.fn_is_venue_owner(venue_id));
-- No write policies: ledger is written only by definer triggers / RPCs.

-- Balance view (security_invoker so caller RLS on the ledger applies).
CREATE OR REPLACE VIEW public.host_credits_balance
  WITH (security_invoker = true) AS
  SELECT host_id, venue_id, SUM(amount)::numeric(10,0) AS balance
  FROM public.host_credits_ledger
  GROUP BY host_id, venue_id;

-- D. Attribution snapshot at order creation ---------------------------------
-- If the order's session has an accepted co-host and the player is a member whose
-- attribution window is still open, stamp the host + the session's credit-back rate.
CREATE OR REPLACE FUNCTION public.fn_venue_order_attribution()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cohost UUID;
  v_rate   NUMERIC(4,3);
BEGIN
  IF NEW.session_id IS NULL THEN RETURN NEW; END IF;

  SELECT cohost_user_id, credit_back_rate
    INTO v_cohost, v_rate
    FROM public.venue_sessions WHERE id = NEW.session_id;

  IF v_cohost IS NULL OR v_cohost = NEW.player_id THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.venue_session_members m
     WHERE m.session_id = NEW.session_id
       AND m.user_id = NEW.player_id
       AND m.attribution_until > now()
  ) THEN
    NEW.attributed_host_id := v_cohost;
    NEW.credit_back_rate   := COALESCE(v_rate, 0);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS venue_order_attribution ON public.venue_orders;
CREATE TRIGGER venue_order_attribution
  BEFORE INSERT ON public.venue_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_venue_order_attribution();

-- E. Accrue credits when an attributed order is paid ------------------------
CREATE OR REPLACE FUNCTION public.fn_venue_order_accrue_credits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amount NUMERIC(10,0);
  v_bal    NUMERIC(10,0);
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid'
     AND NEW.attributed_host_id IS NOT NULL AND NEW.credit_back_rate > 0 THEN
    v_amount := floor(NEW.total * NEW.credit_back_rate);
    IF v_amount > 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_bal
        FROM public.host_credits_ledger
       WHERE host_id = NEW.attributed_host_id AND venue_id = NEW.venue_id;
      INSERT INTO public.host_credits_ledger
        (host_id, venue_id, order_id, type, amount, balance_after, note)
      VALUES
        (NEW.attributed_host_id, NEW.venue_id, NEW.id, 'earn', v_amount, v_bal + v_amount,
         'Credit-back from order');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS venue_order_accrue_credits ON public.venue_orders;
CREATE TRIGGER venue_order_accrue_credits
  AFTER UPDATE OF payment_status ON public.venue_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_venue_order_accrue_credits();

-- F. RPCs -------------------------------------------------------------------
-- Venue owner invites a social host to a session. Locks rate/window on the session.
CREATE OR REPLACE FUNCTION public.invite_cohost(
  p_session_id UUID,
  p_host_id    UUID,
  p_rate       NUMERIC,
  p_days       INT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_venue  UUID;
  v_id     UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT venue_id INTO v_venue FROM public.venue_sessions WHERE id = p_session_id;
  IF v_venue IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF NOT public.fn_is_venue_owner(v_venue) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_host_id = v_uid THEN RAISE EXCEPTION 'cannot_invite_self'; END IF;
  IF p_days NOT IN (15,30) THEN RAISE EXCEPTION 'bad_attribution_days'; END IF;
  IF p_rate < 0 OR p_rate > 1 THEN RAISE EXCEPTION 'bad_rate'; END IF;

  -- Publish the rate/window on the session (visible before accept).
  UPDATE public.venue_sessions
     SET credit_back_rate = p_rate, attribution_days = p_days
   WHERE id = p_session_id;

  INSERT INTO public.venue_cohost_invites
    (session_id, venue_id, host_user_id, credit_back_rate, attribution_days, created_by)
  VALUES (p_session_id, v_venue, p_host_id, p_rate, p_days, v_uid)
  ON CONFLICT (session_id, host_user_id, status) DO UPDATE
    SET credit_back_rate = excluded.credit_back_rate,
        attribution_days = excluded.attribution_days
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, type, title, body, ref_type, ref_id, link)
  VALUES (p_host_id, 'cohost_invite', 'Co-host invitation',
          (SELECT title FROM public.venue_sessions WHERE id = p_session_id),
          'cohost_invite', v_id::text, '/host/invites');

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.invite_cohost(uuid, uuid, numeric, int) FROM public;
GRANT EXECUTE ON FUNCTION public.invite_cohost(uuid, uuid, numeric, int) TO authenticated;

-- Host accepts/declines. On accept → set session.cohost_user_id.
CREATE OR REPLACE FUNCTION public.respond_cohost_invite(
  p_invite_id UUID,
  p_accept    BOOLEAN
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_host    UUID;
  v_session UUID;
  v_status  TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT host_user_id, session_id, status INTO v_host, v_session, v_status
    FROM public.venue_cohost_invites WHERE id = p_invite_id FOR UPDATE;
  IF v_host IS NULL THEN RAISE EXCEPTION 'invite_not_found'; END IF;
  IF v_host <> v_uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'already_responded'; END IF;

  UPDATE public.venue_cohost_invites
     SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
         responded_at = now()
   WHERE id = p_invite_id;

  IF p_accept THEN
    UPDATE public.venue_sessions SET cohost_user_id = v_uid WHERE id = v_session;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_cohost_invite(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.respond_cohost_invite(uuid, boolean) TO authenticated;

-- Venue owner cancels a pending invite.
CREATE OR REPLACE FUNCTION public.cancel_cohost_invite(p_invite_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_venue  UUID;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT venue_id, status INTO v_venue, v_status
    FROM public.venue_cohost_invites WHERE id = p_invite_id FOR UPDATE;
  IF v_venue IS NULL THEN RAISE EXCEPTION 'invite_not_found'; END IF;
  IF NOT public.fn_is_venue_owner(v_venue) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_status <> 'pending' THEN RETURN; END IF;
  UPDATE public.venue_cohost_invites
     SET status = 'cancelled', responded_at = now() WHERE id = p_invite_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_cohost_invite(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_cohost_invite(uuid) TO authenticated;

-- Host redeems credits at the issuing venue. Validates balance, appends redeem row.
CREATE OR REPLACE FUNCTION public.redeem_host_credits(
  p_venue_id UUID,
  p_amount   NUMERIC,
  p_note     TEXT DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_bal NUMERIC(10,0);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'bad_amount'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_bal
    FROM public.host_credits_ledger
   WHERE host_id = v_uid AND venue_id = p_venue_id;

  IF v_bal < p_amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  INSERT INTO public.host_credits_ledger
    (host_id, venue_id, type, amount, balance_after, note)
  VALUES (v_uid, p_venue_id, 'redeem', -p_amount, v_bal - p_amount,
          NULLIF(trim(COALESCE(p_note,'')), ''));

  RETURN v_bal - p_amount;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_host_credits(uuid, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_host_credits(uuid, numeric, text) TO authenticated;
