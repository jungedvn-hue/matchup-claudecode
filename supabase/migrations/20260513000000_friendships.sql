-- ─────────────────────────────────────────────────────────────────────────────
-- Friendships (two-way, mutual confirmation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.friendships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (sender_id, receiver_id),
  CONSTRAINT no_self_friend CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS friendships_sender_idx   ON public.friendships (sender_id, status);
CREATE INDEX IF NOT EXISTS friendships_receiver_idx ON public.friendships (receiver_id, status);

-- Auto-update updated_at on status change
CREATE OR REPLACE FUNCTION public.touch_friendships_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friendships_updated_at ON public.friendships;
CREATE TRIGGER trg_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.touch_friendships_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Add friend_count column to profiles (denormalized)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS friend_count INT NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- Counter sync function + trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_friend_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  affected UUID[];
  uid UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    affected := ARRAY[NEW.sender_id, NEW.receiver_id];
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    affected := ARRAY[NEW.sender_id, NEW.receiver_id];
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    affected := ARRAY[OLD.sender_id, OLD.receiver_id];
  ELSE
    RETURN NULL;
  END IF;

  FOREACH uid IN ARRAY affected LOOP
    UPDATE public.profiles
       SET friend_count = (
         SELECT COUNT(*) FROM public.friendships
          WHERE (sender_id = uid OR receiver_id = uid) AND status = 'accepted'
       )
     WHERE user_id = uid;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_friend_count ON public.friendships;
CREATE TRIGGER trg_friend_count
  AFTER INSERT OR UPDATE OR DELETE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.sync_friend_count();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_read_involved"   ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert_sender"   ON public.friendships;
DROP POLICY IF EXISTS "friendships_update_receiver" ON public.friendships;
DROP POLICY IF EXISTS "friendships_delete_either"   ON public.friendships;

CREATE POLICY "friendships_read_involved" ON public.friendships
  FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "friendships_insert_sender" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Only the receiver can change a pending request's status (accept/reject)
CREATE POLICY "friendships_update_receiver" ON public.friendships
  FOR UPDATE USING (auth.uid() = receiver_id AND status = 'pending')
  WITH CHECK (auth.uid() = receiver_id);

-- Either party can delete (unfriend / cancel request)
CREATE POLICY "friendships_delete_either" ON public.friendships
  FOR DELETE USING (auth.uid() IN (sender_id, receiver_id));
