-- Health Hub: per-user daily health logs + per-user goals.
-- Phase 2 of the Health Hub feature. RLS strict: each user sees and writes only their own data.

CREATE TABLE IF NOT EXISTS public.health_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER,
  distance_km NUMERIC(5,2),
  calories_burned INTEGER,
  avg_hr INTEGER,
  resting_hr INTEGER,
  hrv_ms INTEGER,
  stress_level TEXT CHECK (stress_level IN ('low','medium','high')),
  sleep_hours NUMERIC(3,1),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_health_daily_logs_user_date
  ON public.health_daily_logs (user_id, date DESC);

CREATE TABLE IF NOT EXISTS public.health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_steps INTEGER NOT NULL DEFAULT 8000,
  daily_distance_km NUMERIC(4,1) NOT NULL DEFAULT 5.0,
  daily_calories INTEGER NOT NULL DEFAULT 500,
  weekly_matches INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_health_daily_logs_touch ON public.health_daily_logs;
CREATE TRIGGER trg_health_daily_logs_touch
  BEFORE UPDATE ON public.health_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_health_goals_touch ON public.health_goals;
CREATE TRIGGER trg_health_goals_touch
  BEFORE UPDATE ON public.health_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.health_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own health logs" ON public.health_daily_logs;
CREATE POLICY "users manage own health logs"
  ON public.health_daily_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own health goals" ON public.health_goals;
CREATE POLICY "users manage own health goals"
  ON public.health_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
