-- Paid tickets — Phase 7 polish: notify HOST when buyer self-cancels
-- (Original Phase 6 only notified buyer when host initiated refund.)

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
  v_buyer_name   TEXT;
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
  -- (a) Notify the BUYER when host/master triggered refund. fn_notify skips self.
  PERFORM public.fn_notify(
    v_t.user_id,
    'ticket_refunded',
    'Ticket refunded',
    v_event.title || ' · +' || v_t.paid_amount::TEXT || ' coins returned',
    'event', v_t.event_id::TEXT,
    '/my-tickets'
  );

  -- (b) Notify the HOST when buyer self-cancelled. fn_notify skips self,
  --     so this fires only when v_caller != v_event.created_by.
  SELECT display_name INTO v_buyer_name FROM public.profiles WHERE id = v_t.user_id;
  v_buyer_name := COALESCE(v_buyer_name, 'A player');
  PERFORM public.fn_notify(
    v_event.created_by,
    'ticket_buyer_cancelled',
    v_buyer_name || ' cancelled their ticket',
    v_event.title || ' · seat freed up',
    'event', v_t.event_id::TEXT,
    '/event/' || v_t.event_id::TEXT || '/revenue'
  );
END;
$$;
