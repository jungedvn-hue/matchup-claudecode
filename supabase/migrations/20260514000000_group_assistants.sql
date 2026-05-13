-- ─────────────────────────────────────────────────────────────────────────────
-- Group Assistants — host delegates check-in / approval ops to selected members
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.group_assistants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  assigned_by     UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  permissions     TEXT[] NOT NULL DEFAULT ARRAY['check_in']::TEXT[],
  assigned_courts TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (group_id, user_id),
  CONSTRAINT permissions_valid CHECK (
    permissions <@ ARRAY['check_in','approve_tickets','manage_players','view_stats']::TEXT[]
  )
);

CREATE INDEX IF NOT EXISTS group_assistants_group_idx ON public.group_assistants (group_id);
CREATE INDEX IF NOT EXISTS group_assistants_user_idx  ON public.group_assistants (user_id);

-- Auto touch updated_at
CREATE OR REPLACE FUNCTION public.touch_group_assistants_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_group_assistants_updated_at ON public.group_assistants;
CREATE TRIGGER trg_group_assistants_updated_at
  BEFORE UPDATE ON public.group_assistants
  FOR EACH ROW EXECUTE FUNCTION public.touch_group_assistants_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: is_group_host(group_id, user_id)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_group_host(p_group UUID, p_user UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group AND host_user_id = p_user
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.group_assistants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assistants_read_self_or_member" ON public.group_assistants;
DROP POLICY IF EXISTS "assistants_insert_host"        ON public.group_assistants;
DROP POLICY IF EXISTS "assistants_update_host"        ON public.group_assistants;
DROP POLICY IF EXISTS "assistants_delete_host_or_self" ON public.group_assistants;

-- Read: host of group, the assistant themselves, or any active group member
CREATE POLICY "assistants_read_self_or_member" ON public.group_assistants
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_group_host(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_assistants.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

-- Insert: only host of the group
CREATE POLICY "assistants_insert_host" ON public.group_assistants
  FOR INSERT WITH CHECK (
    public.is_group_host(group_id, auth.uid()) AND assigned_by = auth.uid()
  );

-- Update: only host
CREATE POLICY "assistants_update_host" ON public.group_assistants
  FOR UPDATE USING (public.is_group_host(group_id, auth.uid()))
  WITH CHECK (public.is_group_host(group_id, auth.uid()));

-- Delete: host can revoke, assistant can step down
CREATE POLICY "assistants_delete_host_or_self" ON public.group_assistants
  FOR DELETE USING (
    auth.uid() = user_id OR public.is_group_host(group_id, auth.uid())
  );
