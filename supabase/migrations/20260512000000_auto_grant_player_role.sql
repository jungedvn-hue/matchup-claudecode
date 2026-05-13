-- Auto-grant 'player' role to every new auth.users entry.
-- Idempotent: safe to re-run; ON CONFLICT keeps existing role row untouched.

CREATE OR REPLACE FUNCTION public.grant_player_role_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, revoked_at)
  VALUES (NEW.id, 'player', NULL)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_player ON auth.users;
CREATE TRIGGER trg_auto_grant_player
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_player_role_on_signup();

-- Backfill: ensure all existing users have 'player' role
INSERT INTO public.user_roles (user_id, role, revoked_at)
SELECT id, 'player', NULL FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
