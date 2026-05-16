-- Paid Group Event Tickets — Phase 1 (schema + RPCs)
-- Model: host prepays platform credit (Grab driver style).
-- On each ticket sale: buyer wallet -price, host wallet +price, host credit -5% fee.
-- Refund window: default 8h before event. Promo codes credit host pool for free.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. EXTEND COIN TX TYPE ENUM
-- ════════════════════════════════════════════════════════════════════════════
ALTER TYPE public.coin_tx_type ADD VALUE IF NOT EXISTS 'ticket_purchase';   -- buyer debit
ALTER TYPE public.coin_tx_type ADD VALUE IF NOT EXISTS 'ticket_revenue';    -- host credit
ALTER TYPE public.coin_tx_type ADD VALUE IF NOT EXISTS 'ticket_refund';     -- buyer credit / host debit
ALTER TYPE public.coin_tx_type ADD VALUE IF NOT EXISTS 'host_credit_topup'; -- user spends coins to top up host credit

-- ════════════════════════════════════════════════════════════════════════════
-- 2. HOST PLATFORM CREDITS (prepay pool)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.host_platform_credits (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance            BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_topped_up BIGINT NOT NULL DEFAULT 0,
  lifetime_consumed  BIGINT NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.host_platform_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hpc_read_own" ON public.host_platform_credits FOR SELECT USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.host_credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('topup','promo','fee','refund_fee','admin_grant')),
  amount        BIGINT NOT NULL,                  -- + topup/promo, - fee
  balance_after BIGINT NOT NULL,
  ref_ticket_id UUID,                             -- event_tickets.id when fee/refund_fee
  promo_code    TEXT,                             -- when kind=promo
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hct_user_created ON public.host_credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hct_ref_ticket ON public.host_credit_transactions(ref_ticket_id);

ALTER TABLE public.host_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hct_read_own" ON public.host_credit_transactions FOR SELECT USING (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 3. PROMO CODES (admin-issued, adoption boost)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.host_promo_codes (
  code           TEXT PRIMARY KEY,
  credit_amount  BIGINT NOT NULL CHECK (credit_amount > 0),
  max_uses       INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count     INT NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note           TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.host_promo_codes ENABLE ROW LEVEL SECURITY;
-- Authenticated users can attempt redemption (RPC validates); no broad SELECT exposed.
CREATE POLICY "hpc_admin_all" ON public.host_promo_codes FOR ALL USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));

CREATE TABLE IF NOT EXISTS public.host_promo_redemptions (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code         TEXT NOT NULL REFERENCES public.host_promo_codes(code) ON DELETE CASCADE,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code)
);

ALTER TABLE public.host_promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hpr_read_own" ON public.host_promo_redemptions FOR SELECT USING (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 4. EXTEND group_events + event_tickets
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.group_events
  ADD COLUMN IF NOT EXISTS price_coins BIGINT NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  ADD COLUMN IF NOT EXISTS refund_deadline_hours INT NOT NULL DEFAULT 8 CHECK (refund_deadline_hours >= 0);

ALTER TABLE public.event_tickets
  ADD COLUMN IF NOT EXISTS paid_amount    BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_tx_id    UUID,
  ADD COLUMN IF NOT EXISTS host_tx_id     UUID,
  ADD COLUMN IF NOT EXISTS platform_fee   BIGINT NOT NULL DEFAULT 0;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. UPDATE TRIGGER: skip auto-issue on paid events (must go through purchase RPC)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.sync_event_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price BIGINT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.event_tickets
       SET status = 'cancelled'
     WHERE event_id = OLD.event_id AND user_id = OLD.user_id AND status = 'valid' AND paid_amount = 0;
    RETURN OLD;
  END IF;

  SELECT price_coins INTO v_price FROM public.group_events WHERE id = NEW.event_id;

  IF (NEW.status = 'going' AND COALESCE(v_price, 0) = 0) THEN
    -- FREE event: auto-issue
    INSERT INTO public.event_tickets(event_id, user_id, status)
    VALUES (NEW.event_id, NEW.user_id, 'valid')
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET status = 'valid'
    WHERE public.event_tickets.status = 'cancelled' AND public.event_tickets.paid_amount = 0;
  ELSIF (NEW.status <> 'going' AND COALESCE(v_price, 0) = 0) THEN
    UPDATE public.event_tickets
       SET status = 'cancelled'
     WHERE event_id = NEW.event_id AND user_id = NEW.user_id AND status = 'valid' AND paid_amount = 0;
  END IF;
  -- Paid events: RSVP status change does NOT touch tickets. Use purchase/refund RPCs.

  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. HOST CREDIT HELPERS
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._ensure_host_credit(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.host_platform_credits(user_id, balance) VALUES (p_user, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. RPC: top up host credit (spend coins → host credit 1:1)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_topup_host_credit(p_amount BIGINT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_new_credit BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  PERFORM public._ensure_host_credit(v_user);
  PERFORM public.fn_spend_coin(v_user, p_amount, 'host_credit_topup'::public.coin_tx_type, 'host_credit', NULL, 'Top up host platform credit');

  UPDATE public.host_platform_credits
     SET balance = balance + p_amount,
         lifetime_topped_up = lifetime_topped_up + p_amount,
         updated_at = now()
   WHERE user_id = v_user
   RETURNING balance INTO v_new_credit;

  INSERT INTO public.host_credit_transactions(user_id, kind, amount, balance_after, note)
  VALUES (v_user, 'topup', p_amount, v_new_credit, 'User top-up from wallet');

  RETURN v_new_credit;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. RPC: redeem host promo code
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_redeem_host_promo_code(p_code TEXT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_credit BIGINT;
  v_new_credit BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Validate code (lock row to prevent race)
  SELECT credit_amount INTO v_credit
    FROM public.host_promo_codes
   WHERE code = upper(p_code)
     AND is_active = true
     AND (expires_at IS NULL OR expires_at > now())
     AND used_count < max_uses
   FOR UPDATE;

  IF v_credit IS NULL THEN
    RAISE EXCEPTION 'Promo code invalid or expired' USING ERRCODE = 'P0002';
  END IF;

  -- Check not already redeemed
  IF EXISTS (SELECT 1 FROM public.host_promo_redemptions WHERE user_id = v_user AND code = upper(p_code)) THEN
    RAISE EXCEPTION 'Already redeemed' USING ERRCODE = 'P0003';
  END IF;

  -- Mark redemption + bump count
  INSERT INTO public.host_promo_redemptions(user_id, code) VALUES (v_user, upper(p_code));
  UPDATE public.host_promo_codes SET used_count = used_count + 1 WHERE code = upper(p_code);

  -- Credit host pool
  PERFORM public._ensure_host_credit(v_user);
  UPDATE public.host_platform_credits
     SET balance = balance + v_credit,
         lifetime_topped_up = lifetime_topped_up + v_credit,
         updated_at = now()
   WHERE user_id = v_user
   RETURNING balance INTO v_new_credit;

  INSERT INTO public.host_credit_transactions(user_id, kind, amount, balance_after, promo_code, note)
  VALUES (v_user, 'promo', v_credit, v_new_credit, upper(p_code), 'Promo code redemption');

  RETURN v_new_credit;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. RPC: purchase event ticket (atomic)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_purchase_event_ticket(p_event_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer        UUID := auth.uid();
  v_event        RECORD;
  v_host         UUID;
  v_price        BIGINT;
  v_fee          BIGINT;
  v_host_credit  BIGINT;
  v_ticket_id    UUID;
  v_buyer_tx     UUID;
  v_host_tx      UUID;
  v_new_credit   BIGINT;
  v_attendee_cnt INT;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock event row + read with capacity check
  SELECT id, group_id, created_by, event_date, price_coins, max_attendees, attendee_count
    INTO v_event
    FROM public.group_events
   WHERE id = p_event_id
   FOR UPDATE;

  IF v_event.id IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF v_event.event_date <= now() THEN RAISE EXCEPTION 'Event already started or past'; END IF;
  IF v_event.price_coins <= 0 THEN RAISE EXCEPTION 'Event is free — use RSVP instead'; END IF;

  v_price := v_event.price_coins;
  v_host := v_event.created_by;
  v_fee := GREATEST(1, (v_price * 5 / 100));  -- 5% min 1 coin

  -- Capacity check
  IF v_event.max_attendees IS NOT NULL AND v_event.attendee_count >= v_event.max_attendees THEN
    RAISE EXCEPTION 'Event is full' USING ERRCODE = 'P0010';
  END IF;

  -- Existing ticket?
  IF EXISTS (SELECT 1 FROM public.event_tickets WHERE event_id = p_event_id AND user_id = v_buyer AND status = 'valid') THEN
    RAISE EXCEPTION 'You already have a ticket for this event' USING ERRCODE = 'P0011';
  END IF;

  -- Host credit check
  PERFORM public._ensure_host_credit(v_host);
  SELECT balance INTO v_host_credit FROM public.host_platform_credits WHERE user_id = v_host FOR UPDATE;
  IF v_host_credit < v_fee THEN
    RAISE EXCEPTION 'Host platform credit too low — ticket sales paused' USING ERRCODE = 'P0012';
  END IF;

  -- 1. Deduct from buyer wallet
  v_buyer_tx := public.fn_spend_coin(v_buyer, v_price, 'ticket_purchase'::public.coin_tx_type, 'event_ticket', p_event_id, 'Ticket purchase');

  -- 2. Credit host wallet (full price, no skim — fee comes from credit pool)
  v_host_tx := public.fn_credit_coin(v_host, v_price, 'ticket_revenue'::public.coin_tx_type, 'event_ticket', p_event_id, 'Ticket sale revenue');

  -- 3. Deduct 5% fee from host credit pool
  UPDATE public.host_platform_credits
     SET balance = balance - v_fee,
         lifetime_consumed = lifetime_consumed + v_fee,
         updated_at = now()
   WHERE user_id = v_host
   RETURNING balance INTO v_new_credit;

  -- 4. Insert ticket
  INSERT INTO public.event_tickets(event_id, user_id, status, paid_amount, paid_at, buyer_tx_id, host_tx_id, platform_fee, price)
  VALUES (p_event_id, v_buyer, 'valid', v_price, now(), v_buyer_tx, v_host_tx, v_fee, v_price)
  RETURNING id INTO v_ticket_id;

  -- 5. Log credit-pool fee tx (now we know ticket_id)
  INSERT INTO public.host_credit_transactions(user_id, kind, amount, balance_after, ref_ticket_id, note)
  VALUES (v_host, 'fee', -v_fee, v_new_credit, v_ticket_id, '5% platform fee on ticket sale');

  -- 6. Upsert RSVP=going so capacity + attendee list stays in sync
  INSERT INTO public.group_event_attendees(event_id, user_id, status)
  VALUES (p_event_id, v_buyer, 'going')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'going', responded_at = now();

  RETURN v_ticket_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. RPC: refund event ticket
--   Caller can be: buyer (within window) | host of event | master
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_refund_event_ticket(p_ticket_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_t            RECORD;
  v_event        RECORD;
  v_is_host      BOOLEAN;
  v_is_master    BOOLEAN := public.is_master(v_caller);
  v_deadline     TIMESTAMPTZ;
  v_new_credit   BIGINT;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_t FROM public.event_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF v_t.status <> 'valid' THEN RAISE EXCEPTION 'Ticket not refundable (status=%)', v_t.status; END IF;
  IF v_t.paid_amount <= 0 THEN RAISE EXCEPTION 'Free ticket — cancel RSVP instead'; END IF;

  SELECT * INTO v_event FROM public.group_events WHERE id = v_t.event_id;
  v_is_host := (v_event.created_by = v_caller);

  -- Authorization
  IF v_caller = v_t.user_id THEN
    -- Buyer: must be within refund window
    v_deadline := v_event.event_date - (v_event.refund_deadline_hours || ' hours')::INTERVAL;
    IF now() > v_deadline THEN
      RAISE EXCEPTION 'Refund window closed' USING ERRCODE = 'P0020';
    END IF;
  ELSIF NOT (v_is_host OR v_is_master) THEN
    RAISE EXCEPTION 'Not authorized to refund this ticket';
  END IF;

  -- 1. Refund buyer
  PERFORM public.fn_credit_coin(v_t.user_id, v_t.paid_amount, 'ticket_refund'::public.coin_tx_type, 'event_ticket', v_t.event_id, COALESCE(p_reason, 'Ticket refund'));

  -- 2. Debit host wallet (reverse revenue)
  PERFORM public.fn_spend_coin(v_event.created_by, v_t.paid_amount, 'ticket_refund'::public.coin_tx_type, 'event_ticket', v_t.event_id, 'Ticket refund (revenue reversal)');

  -- 3. Refund 5% fee back to host credit pool
  PERFORM public._ensure_host_credit(v_event.created_by);
  UPDATE public.host_platform_credits
     SET balance = balance + v_t.platform_fee,
         lifetime_consumed = lifetime_consumed - v_t.platform_fee,
         updated_at = now()
   WHERE user_id = v_event.created_by
   RETURNING balance INTO v_new_credit;

  INSERT INTO public.host_credit_transactions(user_id, kind, amount, balance_after, ref_ticket_id, note)
  VALUES (v_event.created_by, 'refund_fee', v_t.platform_fee, v_new_credit, v_t.id, 'Fee refund on ticket cancellation');

  -- 4. Mark ticket
  UPDATE public.event_tickets
     SET status = 'cancelled', refunded_at = now()
   WHERE id = v_t.id;

  -- 5. Remove RSVP so capacity opens up
  UPDATE public.group_event_attendees
     SET status = 'not_going', responded_at = now()
   WHERE event_id = v_t.event_id AND user_id = v_t.user_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 11. RPC: cancel paid event (host/admin) → mass refund
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_cancel_paid_event(p_event_id UUID, p_reason TEXT DEFAULT 'Event cancelled by organizer')
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_event  RECORD;
  v_count  INT := 0;
  v_t      RECORD;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_event FROM public.group_events WHERE id = p_event_id;
  IF v_event.id IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF v_event.created_by <> v_caller AND NOT public.is_master(v_caller) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR v_t IN SELECT id FROM public.event_tickets WHERE event_id = p_event_id AND status = 'valid' AND paid_amount > 0 LOOP
    PERFORM public.fn_refund_event_ticket(v_t.id, p_reason);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 12. PERMISSIONS
-- ════════════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.fn_topup_host_credit(BIGINT)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_redeem_host_promo_code(TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_purchase_event_ticket(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_refund_event_ticket(UUID, TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_paid_event(UUID, TEXT)          TO authenticated;
