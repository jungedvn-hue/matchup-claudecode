-- RBAC core: roles, applications, helpers, RLS, master seed.
-- See docs/architecture/RBAC.md for full design.

-- =========================================================================
-- 1. Enums
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('master', 'player', 'host', 'court_owner', 'store_owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 2. Tables
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        app_role NOT NULL,
  granted_by  uuid REFERENCES auth.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz,
  revoked_by  uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_active
  ON public.user_roles(user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.role_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role  app_role NOT NULL,
  status          application_status NOT NULL DEFAULT 'pending',
  reason          text,
  business_info   jsonb,
  reviewed_by     uuid REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  reviewer_note   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_application
  ON public.role_applications(user_id, requested_role)
  WHERE status = 'pending';

-- =========================================================================
-- 3. Helper functions
-- =========================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'master');
$$;

-- =========================================================================
-- 4. Approval trigger: when role_applications -> 'approved', insert/reactivate role
-- =========================================================================
CREATE OR REPLACE FUNCTION public.on_application_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (NEW.user_id, NEW.requested_role, NEW.reviewed_by)
    ON CONFLICT (user_id, role)
    DO UPDATE SET
      revoked_at = NULL,
      revoked_by = NULL,
      granted_by = NEW.reviewed_by,
      granted_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_approved ON public.role_applications;
CREATE TRIGGER trg_application_approved
  AFTER UPDATE ON public.role_applications
  FOR EACH ROW EXECUTE FUNCTION public.on_application_approved();

-- =========================================================================
-- 5. Update handle_new_user: also auto-grant 'player' role
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.id, 'player', NULL)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill 'player' role for existing users
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT u.id, 'player', NULL
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'player'
WHERE r.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- =========================================================================
-- 6. Seed master for jun.gedvn@gmail.com
-- =========================================================================
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT id, 'master', NULL
FROM auth.users
WHERE email = 'jun.gedvn@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE SET revoked_at = NULL, revoked_by = NULL;

-- =========================================================================
-- 7. RLS — user_roles
-- =========================================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_read_own_roles" ON public.user_roles;
CREATE POLICY "user_read_own_roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "master_all_roles" ON public.user_roles;
CREATE POLICY "master_all_roles" ON public.user_roles
  FOR ALL USING (public.current_user_is_master())
  WITH CHECK (public.current_user_is_master());

-- =========================================================================
-- 8. RLS — role_applications
-- =========================================================================
ALTER TABLE public.role_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_read_own_applications" ON public.role_applications;
CREATE POLICY "user_read_own_applications" ON public.role_applications
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_is_master());

DROP POLICY IF EXISTS "user_create_own_application" ON public.role_applications;
CREATE POLICY "user_create_own_application" ON public.role_applications
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND requested_role NOT IN ('master', 'player')
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

DROP POLICY IF EXISTS "master_review_application" ON public.role_applications;
CREATE POLICY "master_review_application" ON public.role_applications
  FOR UPDATE USING (public.current_user_is_master())
  WITH CHECK (public.current_user_is_master());

-- =========================================================================
-- 9. Master override on existing tables (profiles, tournaments)
-- =========================================================================
DROP POLICY IF EXISTS "master_all_profiles" ON public.profiles;
CREATE POLICY "master_all_profiles" ON public.profiles
  FOR ALL USING (public.current_user_is_master())
  WITH CHECK (public.current_user_is_master());

DROP POLICY IF EXISTS "master_all_tournaments" ON public.tournaments;
CREATE POLICY "master_all_tournaments" ON public.tournaments
  FOR ALL USING (public.current_user_is_master())
  WITH CHECK (public.current_user_is_master());

DROP POLICY IF EXISTS "master_all_categories" ON public.tour_categories;
CREATE POLICY "master_all_categories" ON public.tour_categories
  FOR ALL USING (public.current_user_is_master())
  WITH CHECK (public.current_user_is_master());

DROP POLICY IF EXISTS "master_all_participants" ON public.tour_participants;
CREATE POLICY "master_all_participants" ON public.tour_participants
  FOR ALL USING (public.current_user_is_master())
  WITH CHECK (public.current_user_is_master());

DROP POLICY IF EXISTS "master_all_matches" ON public.tour_matches;
CREATE POLICY "master_all_matches" ON public.tour_matches
  FOR ALL USING (public.current_user_is_master())
  WITH CHECK (public.current_user_is_master());
