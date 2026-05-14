-- ═════════════════════════════════════════════════════════════════════════════
-- MatchUp Coin — virtual currency system
-- 1 coin = 100 VND
-- One-way: VND → coin (no withdraw to comply with VN regulations)
-- Coin spent on: gifts to players, tournament entry, store cosmetics
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. BALANCES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coin_balances (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance          BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned  BIGINT NOT NULL DEFAULT 0,
  lifetime_spent   BIGINT NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cb_read_own" ON public.coin_balances FOR SELECT USING (user_id = auth.uid());
-- writes only via SECURITY DEFINER functions

-- 2. PACKAGES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coin_packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  coin_amount   BIGINT NOT NULL CHECK (coin_amount > 0),
  price_vnd     BIGINT NOT NULL CHECK (price_vnd > 0),
  bonus_coins   BIGINT NOT NULL DEFAULT 0 CHECK (bonus_coins >= 0),
  badge         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_read_active" ON public.coin_packages FOR SELECT USING (is_active = true);

-- Seed: 1 coin = 100 VND
INSERT INTO public.coin_packages (name, coin_amount, price_vnd, bonus_coins, badge, sort_order) VALUES
  ('Starter',   500,    50000,    0, NULL,        1),
  ('Popular',   1000,   100000,   50, 'POPULAR',  2),
  ('Value',     2000,   200000,   200, NULL,      3),
  ('Pro',       5000,   500000,   750, 'BEST',    4),
  ('Champion',  10000,  1000000,  2000, NULL,     5)
ON CONFLICT DO NOTHING;

-- 3. TRANSACTIONS ─────────────────────────────────────────────────────────────
CREATE TYPE public.coin_tx_type AS ENUM (
  'purchase',       -- nạp coin từ tiền
  'gift_sent',      -- gửi gift cho user khác
  'gift_received',  -- nhận gift từ user khác
  'spend',          -- tiêu trong app (tournament, store)
  'refund',         -- hoàn coin
  'admin_grant'     -- admin tặng (test/marketing)
);

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           public.coin_tx_type NOT NULL,
  amount         BIGINT NOT NULL, -- positive = credit, negative = debit
  balance_after  BIGINT NOT NULL,
  ref_type       TEXT, -- 'payment_order' / 'gift_transaction' / 'tournament' / etc.
  ref_id         UUID,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ct_user_created ON public.coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ct_ref ON public.coin_transactions(ref_type, ref_id);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ctx_read_own" ON public.coin_transactions FOR SELECT USING (user_id = auth.uid());

-- 4. GIFT CATALOG ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE, -- machine identifier
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  coin_cost   BIGINT NOT NULL CHECK (coin_cost > 0),
  category    TEXT NOT NULL DEFAULT 'cheer', -- cheer / hype / celebration
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gc_read_active" ON public.gift_catalog FOR SELECT USING (is_active = true);

INSERT INTO public.gift_catalog (code, name, emoji, coin_cost, category, sort_order) VALUES
  ('tennis_ball',  'Tennis Ball',   '🎾', 10,  'cheer',       1),
  ('pickleball',   'Pickleball',    '🥎', 20,  'cheer',       2),
  ('heart',        'Heart',         '❤️', 30,  'cheer',       3),
  ('strong_play',  'Strong Play',   '💪', 50,  'hype',        4),
  ('cheers',       'Cheers',        '🍻', 80,  'celebration', 5),
  ('on_fire',      'On Fire',       '🔥', 100, 'hype',        6),
  ('champion',     'Champion',      '🏆', 200, 'celebration', 7),
  ('mvp',          'MVP Star',      '🌟', 500, 'celebration', 8)
ON CONFLICT (code) DO NOTHING;

-- 5. GIFT TRANSACTIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_id       UUID NOT NULL REFERENCES public.gift_catalog(id),
  coin_amount   BIGINT NOT NULL,
  message       TEXT,
  context_type  TEXT, -- 'profile' / 'group' / 'match' / 'tournament'
  context_id    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gt_sender ON public.gift_transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gt_receiver ON public.gift_transactions(receiver_id, created_at DESC);

ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gt_read_party" ON public.gift_transactions FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- 6. PAYMENT ORDERS ───────────────────────────────────────────────────────────
CREATE TYPE public.payment_status AS ENUM (
  'pending', 'paid', 'failed', 'expired', 'cancelled'
);

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id        UUID NOT NULL REFERENCES public.coin_packages(id),
  amount_vnd        BIGINT NOT NULL,
  coins_to_credit   BIGINT NOT NULL,
  gateway           TEXT NOT NULL, -- 'payos' / 'stripe' / 'paypal' / 'momo'
  gateway_order_id  TEXT, -- gateway's reference (PayOS orderCode, etc.)
  status            public.payment_status NOT NULL DEFAULT 'pending',
  qr_code_url       TEXT,
  checkout_url      TEXT,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '15 minutes',
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_user ON public.payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_gateway_ref ON public.payment_orders(gateway, gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.payment_orders(status);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_read_own" ON public.payment_orders FOR SELECT USING (user_id = auth.uid());
-- writes only via Edge Functions (service_role)

-- 7. WEBHOOK LOG (audit) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_webhooks_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway           TEXT NOT NULL,
  payload           JSONB NOT NULL,
  signature_valid   BOOLEAN,
  processed         BOOLEAN NOT NULL DEFAULT false,
  order_id          UUID REFERENCES public.payment_orders(id),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwl_gateway_created ON public.payment_webhooks_log(gateway, created_at DESC);

ALTER TABLE public.payment_webhooks_log ENABLE ROW LEVEL SECURITY;
-- no read policy → only service_role can read

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS (atomic operations)
-- ═════════════════════════════════════════════════════════════════════════════

-- Helper: ensure balance row exists
CREATE OR REPLACE FUNCTION public._ensure_balance(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.coin_balances(user_id, balance) VALUES (p_user, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Credit coin (purchase / gift_received / refund / admin_grant)
CREATE OR REPLACE FUNCTION public.fn_credit_coin(
  p_user UUID, p_amount BIGINT, p_type public.coin_tx_type,
  p_ref_type TEXT, p_ref_id UUID, p_description TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_balance BIGINT;
  v_tx_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  PERFORM public._ensure_balance(p_user);

  UPDATE public.coin_balances
     SET balance = balance + p_amount,
         lifetime_earned = lifetime_earned + p_amount,
         updated_at = now()
   WHERE user_id = p_user
   RETURNING balance INTO v_new_balance;

  INSERT INTO public.coin_transactions(user_id, type, amount, balance_after, ref_type, ref_id, description)
  VALUES (p_user, p_type, p_amount, v_new_balance, p_ref_type, p_ref_id, p_description)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- Spend coin (gift_sent / spend) — fails if insufficient
CREATE OR REPLACE FUNCTION public.fn_spend_coin(
  p_user UUID, p_amount BIGINT, p_type public.coin_tx_type,
  p_ref_type TEXT, p_ref_id UUID, p_description TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_balance BIGINT;
  v_tx_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  PERFORM public._ensure_balance(p_user);

  UPDATE public.coin_balances
     SET balance = balance - p_amount,
         lifetime_spent = lifetime_spent + p_amount,
         updated_at = now()
   WHERE user_id = p_user AND balance >= p_amount
   RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient coin balance';
  END IF;

  INSERT INTO public.coin_transactions(user_id, type, amount, balance_after, ref_type, ref_id, description)
  VALUES (p_user, p_type, -p_amount, v_new_balance, p_ref_type, p_ref_id, p_description)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- Send gift (atomic: spend sender + credit receiver + log gift_transaction)
CREATE OR REPLACE FUNCTION public.fn_send_gift(
  p_receiver UUID, p_gift_id UUID, p_message TEXT,
  p_context_type TEXT, p_context_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender UUID := auth.uid();
  v_cost BIGINT;
  v_gift_name TEXT;
  v_gift_tx_id UUID;
BEGIN
  IF v_sender IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_sender = p_receiver THEN RAISE EXCEPTION 'Cannot gift yourself'; END IF;

  SELECT coin_cost, name INTO v_cost, v_gift_name
    FROM public.gift_catalog
   WHERE id = p_gift_id AND is_active = true;

  IF v_cost IS NULL THEN RAISE EXCEPTION 'Gift not found or inactive'; END IF;

  INSERT INTO public.gift_transactions(sender_id, receiver_id, gift_id, coin_amount, message, context_type, context_id)
  VALUES (v_sender, p_receiver, p_gift_id, v_cost, p_message, p_context_type, p_context_id)
  RETURNING id INTO v_gift_tx_id;

  PERFORM public.fn_spend_coin(
    v_sender, v_cost, 'gift_sent', 'gift_transaction', v_gift_tx_id,
    'Sent gift: ' || v_gift_name
  );

  PERFORM public.fn_credit_coin(
    p_receiver, v_cost, 'gift_received', 'gift_transaction', v_gift_tx_id,
    'Received gift: ' || v_gift_name
  );

  RETURN v_gift_tx_id;
END;
$$;

-- Settle payment order (called by webhook Edge Function with service_role)
CREATE OR REPLACE FUNCTION public.fn_settle_payment(
  p_order_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.payment_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status = 'paid' THEN RETURN false; END IF; -- idempotent
  IF v_order.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Order in non-pending state: %', v_order.status;
  END IF;

  UPDATE public.payment_orders SET status = 'paid', paid_at = now() WHERE id = p_order_id;

  PERFORM public.fn_credit_coin(
    v_order.user_id, v_order.coins_to_credit, 'purchase',
    'payment_order', p_order_id,
    'Coin purchase via ' || v_order.gateway
  );

  RETURN true;
END;
$$;

-- Grant execute to authenticated users (gift) + service_role (settle)
GRANT EXECUTE ON FUNCTION public.fn_send_gift(UUID, UUID, TEXT, TEXT, UUID) TO authenticated;
-- fn_credit_coin / fn_spend_coin / fn_settle_payment: server-only (Edge Functions use service_role)
REVOKE EXECUTE ON FUNCTION public.fn_credit_coin(UUID, BIGINT, public.coin_tx_type, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_spend_coin(UUID, BIGINT, public.coin_tx_type, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_settle_payment(UUID) FROM PUBLIC;
