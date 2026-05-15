-- Re-apply drinks menu migration safely (idempotent)
-- Run this if 20260515100000 failed partway through

-- Tables (already created if first run partially succeeded)
CREATE TABLE IF NOT EXISTS public.venue_menus (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id)
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id     UUID NOT NULL REFERENCES public.venue_menus(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  name_vi     TEXT,
  emoji       TEXT NOT NULL DEFAULT '🧃',
  price_vnd   INTEGER NOT NULL CHECK (price_vnd > 0),
  available   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drink_gifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID NOT NULL REFERENCES auth.users(id),
  to_user_id      UUID NOT NULL REFERENCES auth.users(id),
  item_id         UUID NOT NULL REFERENCES public.menu_items(id),
  item_name       TEXT NOT NULL,
  item_emoji      TEXT NOT NULL,
  coins_item      INTEGER NOT NULL,
  tip_pct         INTEGER NOT NULL DEFAULT 5,
  tip_coins       INTEGER NOT NULL DEFAULT 0,
  coins_total     INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drink_gifts DROP CONSTRAINT IF EXISTS drink_gifts_tip_pct_check;
ALTER TABLE public.drink_gifts ADD CONSTRAINT drink_gifts_tip_pct_check
  CHECK (tip_pct >= 0 AND tip_pct <= 100);

-- RLS
ALTER TABLE public.venue_menus  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_gifts  ENABLE ROW LEVEL SECURITY;

-- Policies (drop first to avoid duplicate error)
DROP POLICY IF EXISTS "venue_menus_read"   ON public.venue_menus;
DROP POLICY IF EXISTS "venue_menus_insert" ON public.venue_menus;
DROP POLICY IF EXISTS "venue_menus_update" ON public.venue_menus;
DROP POLICY IF EXISTS "menu_items_read"    ON public.menu_items;
DROP POLICY IF EXISTS "drink_gifts_read"   ON public.drink_gifts;

CREATE POLICY "venue_menus_read"   ON public.venue_menus FOR SELECT USING (true);
CREATE POLICY "venue_menus_insert" ON public.venue_menus FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.groups WHERE id = group_id AND host_user_id = auth.uid()
  ));
CREATE POLICY "venue_menus_update" ON public.venue_menus FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.groups WHERE id = group_id AND host_user_id = auth.uid()
  ));
CREATE POLICY "menu_items_read" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "drink_gifts_read" ON public.drink_gifts FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- RPCs
CREATE OR REPLACE FUNCTION public.fn_upsert_menu_item(
  p_group_id  UUID,
  p_item_id   UUID,
  p_name      TEXT,
  p_name_vi   TEXT,
  p_emoji     TEXT,
  p_price_vnd INTEGER,
  p_available BOOLEAN,
  p_sort_order INTEGER
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_menu_id UUID;
  v_out     UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND host_user_id = v_caller) THEN
    RAISE EXCEPTION 'Only group host can manage menu';
  END IF;

  INSERT INTO public.venue_menus (group_id) VALUES (p_group_id)
  ON CONFLICT (group_id) DO NOTHING;
  SELECT id INTO v_menu_id FROM public.venue_menus WHERE group_id = p_group_id;

  IF p_item_id IS NULL THEN
    INSERT INTO public.menu_items (menu_id, name, name_vi, emoji, price_vnd, available, sort_order)
    VALUES (v_menu_id, p_name, p_name_vi, p_emoji, p_price_vnd, p_available, p_sort_order)
    RETURNING id INTO v_out;
  ELSE
    UPDATE public.menu_items
    SET name = p_name, name_vi = p_name_vi, emoji = p_emoji,
        price_vnd = p_price_vnd, available = p_available, sort_order = p_sort_order
    WHERE id = p_item_id AND menu_id = v_menu_id;
    v_out := p_item_id;
  END IF;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_menu_item(
  p_group_id UUID,
  p_item_id  UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND host_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only group host can manage menu';
  END IF;
  DELETE FROM public.menu_items mi
  USING public.venue_menus vm
  WHERE mi.id = p_item_id AND mi.menu_id = vm.id AND vm.group_id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_send_drink_gift(
  p_item_id   UUID,
  p_to_user   UUID,
  p_tip_pct   INTEGER,
  p_tip_coins INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from       UUID := auth.uid();
  v_item       RECORD;
  v_coins_item INTEGER;
  v_tip_coins  INTEGER;
  v_total      INTEGER;
  v_balance    INTEGER;
BEGIN
  IF v_from IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_from = p_to_user THEN RAISE EXCEPTION 'Cannot gift to yourself'; END IF;

  SELECT mi.*, vm.group_id INTO v_item
  FROM public.menu_items mi
  JOIN public.venue_menus vm ON vm.id = mi.menu_id
  WHERE mi.id = p_item_id AND mi.available = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found or unavailable'; END IF;

  v_coins_item := v_item.price_vnd / 100;
  IF p_tip_pct = 0 THEN
    v_tip_coins := GREATEST(0, COALESCE(p_tip_coins, 0));
  ELSE
    v_tip_coins := ROUND(v_coins_item * p_tip_pct::NUMERIC / 100);
  END IF;
  v_total := v_coins_item + v_tip_coins;

  SELECT balance INTO v_balance FROM public.coin_wallets WHERE user_id = v_from;
  IF v_balance IS NULL OR v_balance < v_total THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  UPDATE public.coin_wallets SET balance = balance - v_total, updated_at = now() WHERE user_id = v_from;
  INSERT INTO public.coin_wallets (user_id, balance) VALUES (p_to_user, v_coins_item)
  ON CONFLICT (user_id) DO UPDATE SET balance = coin_wallets.balance + v_coins_item, updated_at = now();

  INSERT INTO public.coin_transactions (user_id, amount, type, ref_id, note) VALUES
    (v_from,    -v_total,      'drink_gift_sent',     p_item_id::TEXT, v_item.emoji || ' ' || v_item.name),
    (p_to_user,  v_coins_item, 'drink_gift_received',  p_item_id::TEXT, v_item.emoji || ' ' || v_item.name);

  INSERT INTO public.drink_gifts
    (from_user_id, to_user_id, item_id, item_name, item_emoji, coins_item, tip_pct, tip_coins, coins_total)
  VALUES
    (v_from, p_to_user, p_item_id, v_item.name, v_item.emoji, v_coins_item, p_tip_pct, v_tip_coins, v_total);

  RETURN jsonb_build_object('coins_item', v_coins_item, 'tip_coins', v_tip_coins, 'coins_total', v_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_menu_item(UUID,UUID,TEXT,TEXT,TEXT,INTEGER,BOOLEAN,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_menu_item(UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_send_drink_gift(UUID,UUID,INTEGER,INTEGER) TO authenticated;
