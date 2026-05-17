-- Paid tickets — Phase 6: notifications wired into RPCs
-- Replaces fn_purchase_event_ticket + fn_refund_event_ticket with notify-enabled versions.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. fn_purchase_event_ticket — notify host on sale + low-credit warning
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
  v_buyer_name   TEXT;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, group_id, created_by, event_date, price_coins, max_attendees, attendee_count, title
    INTO v_event
    FROM public.group_events
   WHERE id = p_event_id
   FOR UPDATE;

  IF v_event.id IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF v_event.event_date <= now() THEN RAISE EXCEPTION 'Event already started or past'; END IF;
  IF v_event.price_coins <= 0 THEN RAISE EXCEPTION 'Event is free — use RSVP instead'; END IF;

  v_price := v_event.price_coins;
  v_host := v_event.created_by;
  v_fee := GREATEST(1, (v_price * 5 / 100));

  IF v_event.max_attendees IS NOT NULL AND v_event.attendee_count >= v_event.max_attendees THEN
    RAISE EXCEPTION 'Event is full' USING ERRCODE = 'P0010';
  END IF;

  IF EXISTS (SELECT 1 FROM public.event_tickets WHERE event_id = p_event_id AND user_id = v_buyer AND status = 'valid') THEN
    RAISE EXCEPTION 'You already have a ticket for this event' USING ERRCODE = 'P0011';
  END IF;

  PERFORM public._ensure_host_credit(v_host);
  SELECT balance INTO v_host_credit FROM public.host_platform_credits WHERE user_id = v_host FOR UPDATE;
  IF v_host_credit < v_fee THEN
    RAISE EXCEPTION 'Host platform credit too low — ticket sales paused' USING ERRCODE = 'P0012';
  END IF;

  v_buyer_tx := public.fn_spend_coin(v_buyer, v_price, 'ticket_purchase'::public.coin_tx_type, 'event_ticket', p_event_id, 'Ticket purchase');
  v_host_tx  := public.fn_credit_coin(v_host, v_price, 'ticket_revenue'::public.coin_tx_type, 'event_ticket', p_event_id, 'Ticket sale revenue');

  UPDATE public.host_platform_credits
     SET balance = balance - v_fee,
         lifetime_consumed = lifetime_consumed + v_fee,
         updated_at = now()
   WHERE user_id = v_host
   RETURNING balance INTO v_new_credit;

  INSERT INTO public.event_tickets(event_id, user_id, status, paid_amount, paid_at, buyer_tx_id, host_tx_id, platform_fee, price)
  VALUES (p_event_id, v_buyer, 'valid', v_price, now(), v_buyer_tx, v_host_tx, v_fee, v_price)
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.host_credit_transactions(user_id, kind, amount, balance_after, ref_ticket_id, note)
  VALUES (v_host, 'fee', -v_fee, v_new_credit, v_ticket_id, '5% platform fee on ticket sale');

  INSERT INTO public.group_event_attendees(event_id, user_id, status)
  VALUES (p_event_id, v_buyer, 'going')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'going', responded_at = now();

  -- ─ Notifications ─────────────────────────────────────────────────────────
  SELECT display_name INTO v_buyer_name FROM public.profiles WHERE id = v_buyer;
  v_buyer_name := COALESCE(v_buyer_name, 'A player');

  PERFORM public.fn_notify(
    v_host,
    'ticket_sold',
    v_buyer_name || ' bought a ticket',
    v_event.title || ' · +' || v_price::TEXT || ' coins',
    'event', p_event_id::TEXT,
    '/event/' || p_event_id::TEXT || '/revenue'
  );

  IF v_new_credit < 100 THEN
    PERFORM public.fn_notify(
      v_host,
      'host_credit_low',
      'Platform credit low',
      'Credit pool: ' || v_new_credit::TEXT || ' coins. Top up to keep selling tickets.',
      'host_credit', NULL,
      '/settings'
    );
  END IF;

  RETURN v_ticket_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. fn_refund_event_ticket — notify buyer when host/master initiates refund
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_refund_event_ticket(p_ticket_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_t            RECORD;
  v_event        RECORD;
  v_is_host      BOOLEAN;
  v_is_master    BOOLEAN := public.has_role(v_caller, 'master'::public.app_role);
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

  IF v_caller = v_t.user_id THEN
    v_deadline := v_event.event_date - (v_event.refund_deadline_hours || ' hours')::INTERVAL;
    IF now() > v_deadline THEN
      RAISE EXCEPTION 'Refund window closed' USING ERRCODE = 'P0020';
    END IF;
  ELSIF NOT (v_is_host OR v_is_master) THEN
    RAISE EXCEPTION 'Not authorized to refund this ticket';
  END IF;

  PERFORM public.fn_credit_coin(v_t.user_id, v_t.paid_amount, 'ticket_refund'::public.coin_tx_type, 'event_ticket', v_t.event_id, COALESCE(p_reason, 'Ticket refund'));
  PERFORM public.fn_spend_coin(v_event.created_by, v_t.paid_amount, 'ticket_refund'::public.coin_tx_type, 'event_ticket', v_t.event_id, 'Ticket refund (revenue reversal)');

  PERFORM public._ensure_host_credit(v_event.created_by);
  UPDATE public.host_platform_credits
     SET balance = balance + v_t.platform_fee,
         lifetime_consumed = lifetime_consumed - v_t.platform_fee,
         updated_at = now()
   WHERE user_id = v_event.created_by
   RETURNING balance INTO v_new_credit;

  INSERT INTO public.host_credit_transactions(user_id, kind, amount, balance_after, ref_ticket_id, note)
  VALUES (v_event.created_by, 'refund_fee', v_t.platform_fee, v_new_credit, v_t.id, 'Fee refund on ticket cancellation');

  UPDATE public.event_tickets
     SET status = 'cancelled', refunded_at = now()
   WHERE id = v_t.id;

  UPDATE public.group_event_attendees
     SET status = 'not_going', responded_at = now()
   WHERE event_id = v_t.event_id AND user_id = v_t.user_id;

  -- ─ Notifications ─────────────────────────────────────────────────────────
  -- Buyer gets notified if host/master initiated (not on self-cancel; fn_notify skips self)
  PERFORM public.fn_notify(
    v_t.user_id,
    'ticket_refunded',
    'Ticket refunded',
    v_event.title || ' · +' || v_t.paid_amount::TEXT || ' coins returned',
    'event', v_t.event_id::TEXT,
    '/my-tickets'
  );
END;
$$;
