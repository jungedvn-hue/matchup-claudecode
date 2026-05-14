-- Admin RPC: grant coins to a user by email (master only)

CREATE OR REPLACE FUNCTION public.fn_admin_grant_coin(
  p_email TEXT, p_amount BIGINT, p_reason TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_target_user UUID;
  v_tx_id UUID;
BEGIN
  IF NOT public.current_user_is_master() THEN
    RAISE EXCEPTION 'Only master can grant coins';
  END IF;

  IF p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Amount must be between 1 and 1,000,000';
  END IF;

  SELECT id INTO v_target_user FROM auth.users WHERE email = lower(trim(p_email));
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_email;
  END IF;

  v_tx_id := public.fn_credit_coin(
    v_target_user, p_amount, 'admin_grant',
    NULL, NULL,
    COALESCE(NULLIF(trim(p_reason), ''), 'Admin grant')
  );

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_grant_coin(TEXT, BIGINT, TEXT) TO authenticated;
