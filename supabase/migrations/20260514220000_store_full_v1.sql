-- ═════════════════════════════════════════════════════════════════════════════
-- Store Owner v1 — full feature
-- 1. Extend bookings table for unified service+product flow
-- 2. RPC fn_purchase_with_coin (atomic spend buyer + credit owner + booking)
-- 3. Storage bucket "store-images" with RLS
-- 4. Index for store earnings stats
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. Extend bookings ─────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  ADD COLUMN IF NOT EXISTS total_coins  BIGINT,            -- nullable (free service inquiries)
  ADD COLUMN IF NOT EXISTS paid_at      TIMESTAMPTZ,       -- set when coin purchase settled
  ADD COLUMN IF NOT EXISTS coin_tx_id   UUID;              -- ref to coin_transactions row (buyer-side)

CREATE INDEX IF NOT EXISTS idx_bookings_paid ON public.bookings(store_id, paid_at DESC) WHERE paid_at IS NOT NULL;

-- 2. RPC: purchase with coin (atomic) ────────────────────────────────────────
-- Spends buyer coin → credits store owner coin → creates booking row marked paid.
CREATE OR REPLACE FUNCTION public.fn_purchase_with_coin(
  p_product_id  UUID,
  p_quantity    INTEGER,
  p_message     TEXT,
  p_phone       TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer       UUID := auth.uid();
  v_buyer_name  TEXT;
  v_product     public.products%ROWTYPE;
  v_store       public.stores%ROWTYPE;
  v_unit_coins  BIGINT;
  v_total_coins BIGINT;
  v_booking_id  UUID;
  v_buy_tx_id   UUID;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_published = true;
  IF v_product.id IS NULL THEN RAISE EXCEPTION 'Product not available'; END IF;
  IF v_product.availability IN ('out_of_stock', 'booked') THEN
    RAISE EXCEPTION 'Product not available';
  END IF;
  IF v_product.price IS NULL OR v_product.price <= 0 THEN
    RAISE EXCEPTION 'Product has no fixed price — cannot purchase with coin';
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE id = v_product.store_id;
  IF v_store.id IS NULL OR v_store.status <> 'active' THEN
    RAISE EXCEPTION 'Store not active';
  END IF;
  IF v_store.owner_user_id = v_buyer THEN
    RAISE EXCEPTION 'Cannot buy your own product';
  END IF;

  -- price (VND) → coins. 1 coin = 100 VND, so coins = price/100. Round up.
  v_unit_coins  := CEIL(v_product.price::NUMERIC / 100)::BIGINT;
  v_total_coins := v_unit_coins * p_quantity;

  -- Buyer name from profile
  SELECT COALESCE(display_name, 'Player') INTO v_buyer_name
    FROM public.profiles WHERE user_id = v_buyer;

  -- Create booking row first (we need its id for coin_transactions ref_id)
  INSERT INTO public.bookings(
    store_id, product_id, player_user_id, player_name, player_phone,
    message, status, quantity, total_coins, paid_at
  ) VALUES (
    v_store.id, v_product.id, v_buyer, COALESCE(v_buyer_name, 'Player'), p_phone,
    p_message, 'confirmed', p_quantity, v_total_coins, now()
  ) RETURNING id INTO v_booking_id;

  -- Spend buyer coin
  v_buy_tx_id := public.fn_spend_coin(
    v_buyer, v_total_coins, 'spend',
    'booking', v_booking_id,
    'Purchase: ' || v_product.name || CASE WHEN p_quantity > 1 THEN ' x' || p_quantity ELSE '' END
  );

  -- Credit store owner coin
  PERFORM public.fn_credit_coin(
    v_store.owner_user_id, v_total_coins, 'purchase',
    'booking', v_booking_id,
    'Sale: ' || v_product.name || CASE WHEN p_quantity > 1 THEN ' x' || p_quantity ELSE '' END
  );

  -- Backfill buyer-side coin_tx_id on booking
  UPDATE public.bookings SET coin_tx_id = v_buy_tx_id WHERE id = v_booking_id;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_purchase_with_coin(UUID, INTEGER, TEXT, TEXT) TO authenticated;

-- 3. Storage bucket: reuse existing 'store-assets' from 20260508100000_store_assets_bucket.sql
-- (no changes needed here)
