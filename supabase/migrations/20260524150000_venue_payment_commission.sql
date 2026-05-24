-- Court Owner V2.0f — Bank info for VietQR payments + commission snapshot foundation
-- Commission % is configured per-platform in platform_settings and snapshotted on each
-- booking at creation time, so historical revenue is not affected by future rate changes.

-- 1) Venues bank info -------------------------------------------------------
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS bank_name             TEXT,  -- e.g. 'VCB', 'TCB', 'MB'
  ADD COLUMN IF NOT EXISTS bank_account_number   TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder   TEXT;

-- 2) Platform settings (master-managed config) ------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authed can read settings (so booking client can show commission breakdown).
DROP POLICY IF EXISTS "platform_settings_read_all" ON public.platform_settings;
CREATE POLICY "platform_settings_read_all" ON public.platform_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only master role can write. Master is identified via user_roles role='master'.
DROP POLICY IF EXISTS "platform_settings_master_write_insert" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_master_write_update" ON public.platform_settings;
CREATE POLICY "platform_settings_master_write_insert" ON public.platform_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'master' AND ur.revoked_at IS NULL)
  );
CREATE POLICY "platform_settings_master_write_update" ON public.platform_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'master' AND ur.revoked_at IS NULL)
  );

-- Seed default commission. Master can edit later via admin UI.
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'booking_commission_pct',
  to_jsonb(10::numeric),
  'Platform commission percentage applied to each court booking. Snapshotted to bookings on insert.'
)
ON CONFLICT (key) DO NOTHING;

-- 3) Bookings: snapshot commission at insert -------------------------------
ALTER TABLE public.court_bookings
  ADD COLUMN IF NOT EXISTS commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (commission_pct >= 0 AND commission_pct <= 100),
  ADD COLUMN IF NOT EXISTS commission_vnd  INT NOT NULL DEFAULT 0
    CHECK (commission_vnd >= 0);

-- Trigger: on INSERT, pull commission_pct from platform_settings if not provided,
-- then compute commission_vnd. Owner-net is price_vnd - commission_vnd at read time.
CREATE OR REPLACE FUNCTION public.fn_court_bookings_snapshot_commission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pct NUMERIC(5,2);
BEGIN
  IF NEW.commission_pct IS NULL OR NEW.commission_pct = 0 THEN
    SELECT COALESCE((value)::numeric, 0)
      INTO pct
      FROM public.platform_settings
      WHERE key = 'booking_commission_pct';
    NEW.commission_pct := COALESCE(pct, 0);
  END IF;
  NEW.commission_vnd := FLOOR(NEW.price_vnd * NEW.commission_pct / 100.0)::INT;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS court_bookings_snapshot_commission ON public.court_bookings;
CREATE TRIGGER court_bookings_snapshot_commission
  BEFORE INSERT ON public.court_bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_court_bookings_snapshot_commission();
