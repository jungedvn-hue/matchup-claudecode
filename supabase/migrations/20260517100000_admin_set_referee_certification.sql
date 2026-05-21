-- Admin RPC: set referee certification level
-- Master-only. Upserts referee_contributions row if missing.

CREATE OR REPLACE FUNCTION public.fn_admin_set_referee_certification(
  p_user_id UUID,
  p_level   TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_level NOT IN ('community','regional','national') THEN
    RAISE EXCEPTION 'invalid_level' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.referee_contributions(user_id, certification_level)
  VALUES (p_user_id, p_level)
  ON CONFLICT (user_id) DO UPDATE
    SET certification_level = EXCLUDED.certification_level,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_set_referee_certification(UUID, TEXT) TO authenticated;
