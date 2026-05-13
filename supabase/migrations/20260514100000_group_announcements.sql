-- ─────────────────────────────────────────────────────────────────────────────
-- Group Announcements — host posts notices visible to group members
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.group_announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  title       TEXT,
  body        TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  pinned      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_announcements_group_idx
  ON public.group_announcements (group_id, pinned DESC, created_at DESC);

-- Auto touch updated_at
CREATE OR REPLACE FUNCTION public.touch_group_announcements_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_group_announcements_updated_at ON public.group_announcements;
CREATE TRIGGER trg_group_announcements_updated_at
  BEFORE UPDATE ON public.group_announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_group_announcements_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.group_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_read_member"   ON public.group_announcements;
DROP POLICY IF EXISTS "announcements_insert_host"   ON public.group_announcements;
DROP POLICY IF EXISTS "announcements_update_host"   ON public.group_announcements;
DROP POLICY IF EXISTS "announcements_delete_host"   ON public.group_announcements;

-- Read: active members of the group (host included)
CREATE POLICY "announcements_read_member" ON public.group_announcements
  FOR SELECT USING (
    public.is_group_host(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_announcements.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

-- Insert: only host
CREATE POLICY "announcements_insert_host" ON public.group_announcements
  FOR INSERT WITH CHECK (
    public.is_group_host(group_id, auth.uid()) AND author_id = auth.uid()
  );

-- Update: only host
CREATE POLICY "announcements_update_host" ON public.group_announcements
  FOR UPDATE USING (public.is_group_host(group_id, auth.uid()))
  WITH CHECK (public.is_group_host(group_id, auth.uid()));

-- Delete: only host
CREATE POLICY "announcements_delete_host" ON public.group_announcements
  FOR DELETE USING (public.is_group_host(group_id, auth.uid()));
