-- R-F: Referee earnings
-- Host of a tournament records what they paid the referee for that tournament.
-- Earnings are PRIVATE to the referee; aggregated totals also remain private.

CREATE TABLE IF NOT EXISTS public.referee_earnings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id   UUID NOT NULL,
  host_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_coins    INT  NOT NULL CHECK (amount_coins > 0),
  note            TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referee_earnings_user_idx ON public.referee_earnings(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS referee_earnings_host_idx ON public.referee_earnings(host_user_id);

ALTER TABLE public.referee_earnings ENABLE ROW LEVEL SECURITY;

-- Only the referee (owner) can read their earnings rows; master can audit.
CREATE POLICY "re_read_own" ON public.referee_earnings
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'master'::public.app_role)
  );

-- Inserts go through the RPC (SECURITY DEFINER); no direct insert/update/delete.

ALTER TABLE public.referee_contributions
  ADD COLUMN IF NOT EXISTS total_earned_coins  INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_hosts_count  INT NOT NULL DEFAULT 0;

-- RPC: host records a payment to a referee
CREATE OR REPLACE FUNCTION public.fn_record_referee_earning(
  p_tournament_id  UUID,
  p_referee_user_id UUID,
  p_amount_coins   INT,
  p_note           TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host UUID;
  v_id UUID;
  v_repeat INT;
  v_total INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_amount_coins IS NULL OR p_amount_coins <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  SELECT host_id INTO v_host FROM public.tournaments WHERE id = p_tournament_id;
  IF v_host IS NULL THEN
    RAISE EXCEPTION 'tournament_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_host <> auth.uid() THEN
    RAISE EXCEPTION 'not_tournament_host' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.referee_earnings(user_id, tournament_id, host_user_id, amount_coins, note)
  VALUES (p_referee_user_id, p_tournament_id, v_host, p_amount_coins, p_note)
  RETURNING id INTO v_id;

  -- Recompute aggregates for this referee
  SELECT COALESCE(SUM(amount_coins), 0), COUNT(DISTINCT host_user_id)
    INTO v_total, v_repeat
    FROM public.referee_earnings
    WHERE user_id = p_referee_user_id;

  INSERT INTO public.referee_contributions(user_id, total_earned_coins, repeat_hosts_count)
  VALUES (p_referee_user_id, v_total, v_repeat)
  ON CONFLICT (user_id) DO UPDATE
    SET total_earned_coins = EXCLUDED.total_earned_coins,
        repeat_hosts_count = EXCLUDED.repeat_hosts_count,
        updated_at = now();

  -- Notify referee (skip-self handled in fn_notify)
  PERFORM public.fn_notify(
    p_referee_user_id,
    'referee_earning_recorded',
    'Earning recorded',
    'A host recorded a payment of ' || p_amount_coins || ' coins to you.',
    'tournament',
    p_tournament_id,
    '/referee/' || p_referee_user_id::text
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_referee_earning(UUID, UUID, INT, TEXT) TO authenticated;
