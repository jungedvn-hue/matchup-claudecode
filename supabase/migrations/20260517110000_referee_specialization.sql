-- R-C: Referee specialization, rates, and availability
-- Extends referee_contributions with public career profile fields.

ALTER TABLE public.referee_contributions
  ADD COLUMN IF NOT EXISTS sports                TEXT[],
  ADD COLUMN IF NOT EXISTS formats               TEXT[],
  ADD COLUMN IF NOT EXISTS languages             TEXT[],
  ADD COLUMN IF NOT EXISTS rate_per_match_coins  INT,
  ADD COLUMN IF NOT EXISTS rate_per_day_coins    INT,
  ADD COLUMN IF NOT EXISTS availability_note     TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rc_rate_per_match_nonneg') THEN
    ALTER TABLE public.referee_contributions
      ADD CONSTRAINT rc_rate_per_match_nonneg CHECK (rate_per_match_coins IS NULL OR rate_per_match_coins >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rc_rate_per_day_nonneg') THEN
    ALTER TABLE public.referee_contributions
      ADD CONSTRAINT rc_rate_per_day_nonneg CHECK (rate_per_day_coins IS NULL OR rate_per_day_coins >= 0);
  END IF;
END $$;
