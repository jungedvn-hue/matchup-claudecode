-- Product affiliate v1 — external links to Shopee / TikTok / Lazada / Tiki + click logging

-- ── Schema additions to products ─────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS affiliate_url    TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_source TEXT
    CHECK (affiliate_source IN ('shopee','tiktok','lazada','tiki','other')),
  ADD COLUMN IF NOT EXISTS affiliate_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_products_affiliate_source
  ON public.products(affiliate_source) WHERE affiliate_source IS NOT NULL;

-- ── Click log ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES public.stores(id)   ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source      TEXT NOT NULL,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_clicks_product ON public.affiliate_clicks(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_store   ON public.affiliate_clicks(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_user    ON public.affiliate_clicks(user_id, created_at DESC);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aff_clicks_insert_anyone" ON public.affiliate_clicks;
DROP POLICY IF EXISTS "aff_clicks_read_owner"    ON public.affiliate_clicks;

-- Anyone (auth or anon) can log a click; user_id is who they are if authed
CREATE POLICY "aff_clicks_insert_anyone" ON public.affiliate_clicks FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Store owner can read clicks for their stores; admins read all (existing role)
CREATE POLICY "aff_clicks_read_owner" ON public.affiliate_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = affiliate_clicks.store_id
        AND s.owner_user_id = auth.uid()
    )
  );

-- ── Aggregate view: clicks per product ────────────────────────────────────────

CREATE OR REPLACE VIEW public.product_click_stats AS
SELECT
  product_id,
  store_id,
  COUNT(*)::INT AS click_count,
  MAX(created_at) AS last_click_at
FROM public.affiliate_clicks
GROUP BY product_id, store_id;

GRANT SELECT ON public.product_click_stats TO authenticated;
