-- ═════════════════════════════════════════════════════════════════════════════
-- Health Hub v1 — Body Profile + Devices + Insights + Match Correlation
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. BODY PROFILE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_body_profile (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age          INTEGER CHECK (age BETWEEN 5 AND 120),
  weight_kg    NUMERIC(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
  height_cm    NUMERIC(5,1) CHECK (height_cm > 0 AND height_cm < 300),
  gender       TEXT CHECK (gender IN ('male','female','other')),
  resting_hr   INTEGER CHECK (resting_hr BETWEEN 30 AND 120),
  -- max_hr is computed (220 - age) in app, but persistable for custom values
  max_hr       INTEGER CHECK (max_hr BETWEEN 100 AND 230),
  fitness_goal TEXT CHECK (fitness_goal IN ('weight_loss','endurance','muscle','recovery','general')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_body_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hbp_own" ON public.health_body_profile FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. DEVICE CONNECTIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_device_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL CHECK (provider IN (
    'garmin','oura','fitbit','whoop','google_fit','samsung_health','web_bluetooth','csv_import'
  )),
  provider_user_id  TEXT,            -- the user id at the provider
  access_token      TEXT,
  refresh_token     TEXT,
  token_expires_at  TIMESTAMPTZ,
  device_name       TEXT,            -- e.g. "Polar H10", "Garmin Fenix 7"
  metadata          JSONB,
  sync_enabled      BOOLEAN NOT NULL DEFAULT true,
  last_sync_at      TIMESTAMPTZ,
  last_sync_error   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_hdc_user ON public.health_device_connections(user_id);

ALTER TABLE public.health_device_connections ENABLE ROW LEVEL SECURITY;
-- User can read own; writes via Edge Functions (service_role) for OAuth tokens.
CREATE POLICY "hdc_read_own" ON public.health_device_connections FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "hdc_insert_own_basic" ON public.health_device_connections FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND provider IN ('web_bluetooth','csv_import') -- non-OAuth providers ok client-side
  AND access_token IS NULL                       -- prevent client from injecting fake tokens
);
CREATE POLICY "hdc_update_own_basic" ON public.health_device_connections FOR UPDATE USING (
  user_id = auth.uid() AND provider IN ('web_bluetooth','csv_import')
);
CREATE POLICY "hdc_delete_own" ON public.health_device_connections FOR DELETE USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_hdc_touch ON public.health_device_connections;
CREATE TRIGGER trg_hdc_touch
  BEFORE UPDATE ON public.health_device_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. INSIGHTS (cached AI/rule-based recommendations) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.health_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type  TEXT NOT NULL CHECK (insight_type IN (
    'readiness','pattern','alert','weekly_summary','recommendation'
  )),
  severity      TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','positive','warning','urgent')),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  emoji         TEXT,
  data_snapshot JSONB,
  for_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  dismissed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hi_user_date ON public.health_insights(user_id, for_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hi_user_type_date
  ON public.health_insights(user_id, insight_type, for_date)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hi_read_own" ON public.health_insights FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "hi_dismiss_own" ON public.health_insights FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. MATCH CORRELATIONS (cached, recomputed periodically) ────────────────────
CREATE TABLE IF NOT EXISTS public.health_match_correlations (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  matches_analyzed     INTEGER NOT NULL DEFAULT 0,
  sleep_winrate_corr   NUMERIC(4,3),  -- Pearson r ∈ [-1,1]
  hrv_winrate_corr     NUMERIC(4,3),
  resting_hr_winrate_corr NUMERIC(4,3),
  best_sleep_hours     NUMERIC(3,1),  -- sleep hours associated with highest win rate
  best_hrv_ms          INTEGER,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_match_correlations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hmc_own" ON public.health_match_correlations FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═════════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ═════════════════════════════════════════════════════════════════════════════

-- Compute training load: acute (7d avg) and chronic (28d avg) from steps+distance
CREATE OR REPLACE FUNCTION public.fn_training_load(p_user UUID)
RETURNS TABLE(acute NUMERIC, chronic NUMERIC, ratio NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (
    SELECT date,
           COALESCE(distance_km, 0) + (COALESCE(steps, 0)::numeric / 2000) AS load
    FROM public.health_daily_logs
    WHERE user_id = p_user
      AND date >= CURRENT_DATE - INTERVAL '28 days'
  )
  SELECT
    ROUND(AVG(CASE WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN load END)::numeric, 2)  AS acute,
    ROUND(AVG(load)::numeric, 2) AS chronic,
    CASE
      WHEN AVG(load) > 0 THEN
        ROUND((AVG(CASE WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN load END) / AVG(load))::numeric, 2)
      ELSE NULL
    END AS ratio
  FROM d;
$$;

GRANT EXECUTE ON FUNCTION public.fn_training_load(UUID) TO authenticated;

-- Compute match correlations and cache to health_match_correlations
-- Joins health_daily_logs with match_records (or group_event_attendees for "match days")
CREATE OR REPLACE FUNCTION public.fn_compute_match_correlations(p_user UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := COALESCE(p_user, auth.uid());
  v_match_count INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No user context'; END IF;

  -- Use group_event_attendees with status=going as proxy for "match days"
  -- (until match_records table has reliable win/loss data linked to events)
  SELECT COUNT(*) INTO v_match_count
  FROM public.group_event_attendees a
  JOIN public.group_events e ON e.id = a.event_id
  WHERE a.user_id = v_user AND a.status = 'going'
    AND e.event_date < CURRENT_DATE
    AND e.event_date >= CURRENT_DATE - INTERVAL '90 days';

  -- Insert/update with placeholder values when not enough data
  -- (real correlation requires ≥ 10 matches per PRD).
  INSERT INTO public.health_match_correlations(
    user_id, matches_analyzed, sleep_winrate_corr, hrv_winrate_corr,
    resting_hr_winrate_corr, best_sleep_hours, best_hrv_ms, computed_at
  ) VALUES (v_user, v_match_count, NULL, NULL, NULL, NULL, NULL, now())
  ON CONFLICT (user_id) DO UPDATE
    SET matches_analyzed = EXCLUDED.matches_analyzed,
        computed_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_compute_match_correlations(UUID) TO authenticated;

-- Generate insights (rule-based) for a user. Idempotent per (user, type, date).
CREATE OR REPLACE FUNCTION public.fn_generate_insights(p_user UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user        UUID := COALESCE(p_user, auth.uid());
  v_today       public.health_daily_logs%ROWTYPE;
  v_avg_hrv     NUMERIC;
  v_avg_sleep   NUMERIC;
  v_load        RECORD;
  v_count       INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_today FROM public.health_daily_logs
   WHERE user_id = v_user AND date = CURRENT_DATE;

  -- 7-day baselines
  SELECT AVG(hrv_ms), AVG(sleep_hours) INTO v_avg_hrv, v_avg_sleep
    FROM public.health_daily_logs
   WHERE user_id = v_user
     AND date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE - INTERVAL '1 day';

  -- Training load
  SELECT * INTO v_load FROM public.fn_training_load(v_user);

  -- Rule 1: HRV ≥ 10% above baseline → readiness positive
  IF v_today.hrv_ms IS NOT NULL AND v_avg_hrv IS NOT NULL AND v_avg_hrv > 0
     AND v_today.hrv_ms::NUMERIC / v_avg_hrv >= 1.10 THEN
    INSERT INTO public.health_insights(user_id, insight_type, severity, title, body, emoji, data_snapshot)
    VALUES (v_user, 'readiness', 'positive',
      'You''re primed for a strong session',
      'HRV is ' || ROUND((v_today.hrv_ms / v_avg_hrv - 1) * 100) || '% above your 7-day average. Great day for intense play.',
      '🚀', jsonb_build_object('hrv', v_today.hrv_ms, 'baseline', v_avg_hrv))
    ON CONFLICT (user_id, insight_type, for_date) WHERE dismissed_at IS NULL DO NOTHING;
    v_count := v_count + 1;
  END IF;

  -- Rule 2: HRV ≥ 15% below baseline → recovery alert
  IF v_today.hrv_ms IS NOT NULL AND v_avg_hrv IS NOT NULL AND v_avg_hrv > 0
     AND v_today.hrv_ms::NUMERIC / v_avg_hrv <= 0.85 THEN
    INSERT INTO public.health_insights(user_id, insight_type, severity, title, body, emoji, data_snapshot)
    VALUES (v_user, 'alert', 'warning',
      'Low recovery — go easy today',
      'HRV is ' || ROUND((1 - v_today.hrv_ms / v_avg_hrv) * 100) || '% below baseline. Skip intense intervals; light play or rest is recommended.',
      '🛌', jsonb_build_object('hrv', v_today.hrv_ms, 'baseline', v_avg_hrv))
    ON CONFLICT (user_id, insight_type, for_date) WHERE dismissed_at IS NULL DO NOTHING;
    v_count := v_count + 1;
  END IF;

  -- Rule 3: Sleep < 6h → alert
  IF v_today.sleep_hours IS NOT NULL AND v_today.sleep_hours < 6 THEN
    INSERT INTO public.health_insights(user_id, insight_type, severity, title, body, emoji, data_snapshot)
    VALUES (v_user, 'alert', 'warning',
      'Sleep deficit detected',
      'You logged ' || v_today.sleep_hours || ' hrs last night. Aim for 7–9 hrs tonight to support recovery.',
      '😴', jsonb_build_object('sleep_hours', v_today.sleep_hours))
    ON CONFLICT (user_id, insight_type, for_date) WHERE dismissed_at IS NULL DO NOTHING;
    v_count := v_count + 1;
  END IF;

  -- Rule 4: Training load ratio > 1.5 → overtraining risk
  IF v_load.ratio IS NOT NULL AND v_load.ratio > 1.5 THEN
    INSERT INTO public.health_insights(user_id, insight_type, severity, title, body, emoji, data_snapshot)
    VALUES (v_user, 'alert', 'urgent',
      'Overtraining risk',
      'Acute:chronic load ratio is ' || v_load.ratio || ' — significantly above safe range (0.8–1.3). Schedule a rest day.',
      '⚠️', jsonb_build_object('ratio', v_load.ratio, 'acute', v_load.acute, 'chronic', v_load.chronic))
    ON CONFLICT (user_id, insight_type, for_date) WHERE dismissed_at IS NULL DO NOTHING;
    v_count := v_count + 1;
  END IF;

  -- Rule 5: Training load ratio in sweet spot → positive
  IF v_load.ratio IS NOT NULL AND v_load.ratio BETWEEN 0.95 AND 1.25 THEN
    INSERT INTO public.health_insights(user_id, insight_type, severity, title, body, emoji, data_snapshot)
    VALUES (v_user, 'pattern', 'positive',
      'Training load is ideal',
      'Your acute:chronic ratio (' || v_load.ratio || ') is in the optimal performance zone.',
      '🎯', jsonb_build_object('ratio', v_load.ratio))
    ON CONFLICT (user_id, insight_type, for_date) WHERE dismissed_at IS NULL DO NOTHING;
    v_count := v_count + 1;
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_insights(UUID) TO authenticated;
