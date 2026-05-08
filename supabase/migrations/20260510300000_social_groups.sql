-- Phase 1: Social Groups
-- groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  cover_emoji   TEXT NOT NULL DEFAULT '🏓',
  skill_level   TEXT NOT NULL DEFAULT 'all'
                  CHECK (skill_level IN ('all','beginner','intermediate','advanced','pro')),
  is_open       BOOLEAN NOT NULL DEFAULT true,
  max_members   INT,
  member_count  INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('host','admin','member')),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','banned')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Keep member_count in sync
CREATE OR REPLACE FUNCTION public.sync_group_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.groups
  SET member_count = (
    SELECT COUNT(*) FROM public.group_members
    WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
      AND status = 'active'
  )
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_member_count ON public.group_members;
CREATE TRIGGER trg_group_member_count
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_group_member_count();

-- RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- groups: anyone can read active groups
CREATE POLICY "groups_read_all" ON public.groups FOR SELECT USING (true);
CREATE POLICY "groups_insert_auth" ON public.groups FOR INSERT WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "groups_update_host" ON public.groups FOR UPDATE USING (auth.uid() = host_user_id);
CREATE POLICY "groups_delete_host" ON public.groups FOR DELETE USING (auth.uid() = host_user_id);

-- group_members: members can read their group's members; self-manage membership
CREATE POLICY "gm_read" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "gm_insert_self" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gm_update_host" ON public.group_members FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('host','admin') AND gm.status = 'active')
);
CREATE POLICY "gm_delete_self_or_host" ON public.group_members FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('host','admin') AND gm.status = 'active')
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_groups_updated_at ON public.groups;
CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
