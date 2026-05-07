-- Store Owner v1: stores, products, bookings, reviews
-- Marketplace operations & community commerce per STORE_OWNER_PRD_V1.

-- =========================================================================
-- STORES
-- =========================================================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  website TEXT,
  operating_hours JSONB,
  categories TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  avg_rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  total_bookings INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_categories ON stores USING GIN(categories);

-- =========================================================================
-- PRODUCTS
-- =========================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price BIGINT,
  price_display TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT NOT NULL DEFAULT 'in_stock' CHECK (availability IN ('in_stock', 'low_stock', 'out_of_stock', 'available', 'booked')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published);

-- =========================================================================
-- BOOKINGS
-- =========================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  player_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  scheduled_date DATE,
  scheduled_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_store ON bookings(store_id);
CREATE INDEX IF NOT EXISTS idx_bookings_player ON bookings(player_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- =========================================================================
-- REVIEWS
-- =========================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  player_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, player_user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_store ON reviews(store_id);

-- =========================================================================
-- UPDATED_AT TRIGGERS
-- =========================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_stores ON stores;
CREATE TRIGGER set_updated_at_stores BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_products ON products;
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_bookings ON bookings;
CREATE TRIGGER set_updated_at_bookings BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_reviews ON reviews;
CREATE TRIGGER set_updated_at_reviews BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =========================================================================
-- RATING AGGREGATION TRIGGER
-- Recompute stores.avg_rating + review_count whenever reviews change.
-- =========================================================================
CREATE OR REPLACE FUNCTION recompute_store_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_store UUID;
BEGIN
  target_store := COALESCE(NEW.store_id, OLD.store_id);
  UPDATE stores SET
    avg_rating = COALESCE((SELECT AVG(rating)::float FROM reviews WHERE store_id = target_store), 0),
    review_count = (SELECT COUNT(*) FROM reviews WHERE store_id = target_store)
  WHERE id = target_store;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_recompute_rating ON reviews;
CREATE TRIGGER reviews_recompute_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recompute_store_rating();

-- Total bookings counter (only counts completed)
CREATE OR REPLACE FUNCTION recompute_store_bookings()
RETURNS TRIGGER AS $$
DECLARE
  target_store UUID;
BEGIN
  target_store := COALESCE(NEW.store_id, OLD.store_id);
  UPDATE stores SET
    total_bookings = (SELECT COUNT(*) FROM bookings WHERE store_id = target_store AND status = 'completed')
  WHERE id = target_store;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_recompute_count ON bookings;
CREATE TRIGGER bookings_recompute_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION recompute_store_bookings();

-- =========================================================================
-- RLS POLICIES
-- =========================================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Stores: anyone can read active stores; owner can manage their own
DROP POLICY IF EXISTS "stores_select_active" ON stores;
CREATE POLICY "stores_select_active" ON stores FOR SELECT
  USING (status = 'active' OR owner_user_id = auth.uid());

DROP POLICY IF EXISTS "stores_owner_manage" ON stores;
CREATE POLICY "stores_owner_manage" ON stores FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Products: anyone can read published products; owner can manage own
DROP POLICY IF EXISTS "products_select_published" ON products;
CREATE POLICY "products_select_published" ON products FOR SELECT
  USING (
    is_published = true
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_owner_manage" ON products;
CREATE POLICY "products_owner_manage" ON products FOR ALL
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_user_id = auth.uid()));

-- Bookings: store owner sees their store's bookings; player sees their own
DROP POLICY IF EXISTS "bookings_select" ON bookings;
CREATE POLICY "bookings_select" ON bookings FOR SELECT
  USING (
    player_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = bookings.store_id AND stores.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "bookings_player_create" ON bookings;
CREATE POLICY "bookings_player_create" ON bookings FOR INSERT
  WITH CHECK (player_user_id = auth.uid());

DROP POLICY IF EXISTS "bookings_owner_or_player_update" ON bookings;
CREATE POLICY "bookings_owner_or_player_update" ON bookings FOR UPDATE
  USING (
    player_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM stores WHERE stores.id = bookings.store_id AND stores.owner_user_id = auth.uid())
  );

-- Reviews: anyone can read; player can create/update/delete own
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_player_manage" ON reviews;
CREATE POLICY "reviews_player_manage" ON reviews FOR ALL
  USING (player_user_id = auth.uid())
  WITH CHECK (player_user_id = auth.uid());

-- =========================================================================
-- SEED DATA from src/data/marketplace.ts (8 mock services)
-- Owner is NULL initially since these are seed/system stores; admin can
-- claim/assign later. We use a known sentinel UUID of all zeros to avoid
-- requiring auth.users entry — but since owner_user_id is NOT NULL FK,
-- we skip seed for now. The PRD says migrate from mock; v1 ships with
-- empty marketplace and stores onboard organically.
-- =========================================================================
COMMENT ON TABLE stores IS 'MatchUp marketplace stores. One per owner_user_id (UNIQUE).';
COMMENT ON TABLE products IS 'Store products/services. Cascades on store delete.';
COMMENT ON TABLE bookings IS 'Player → Store booking/inquiry requests.';
COMMENT ON TABLE reviews IS 'Player → Store reviews. One per player per store.';
