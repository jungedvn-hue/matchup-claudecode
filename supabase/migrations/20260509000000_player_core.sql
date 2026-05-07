-- Player core: extend profiles + match_records + tickets + favorite_partners
-- Phase 1 of Player PRD v1

-- =========================================================================
-- 1. Extend profiles with player fields
-- =========================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'beginner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS play_time TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS play_style TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dupr_rating REAL NOT NULL DEFAULT 2.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- =========================================================================
-- 2. match_records — single source of truth for player matches
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.match_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- doubles support
  format TEXT NOT NULL DEFAULT 'singles' CHECK (format IN ('singles', 'doubles')),
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opponent_partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- scores: up to 5 sets
  submitter_score_set1 INT,
  opponent_score_set1 INT,
  submitter_score_set2 INT,
  opponent_score_set2 INT,
  submitter_score_set3 INT,
  opponent_score_set3 INT,
  submitter_score_set4 INT,
  opponent_score_set4 INT,
  submitter_score_set5 INT,
  opponent_score_set5 INT,

  -- result + status
  result TEXT NOT NULL CHECK (result IN ('won', 'lost')),
  status TEXT NOT NULL DEFAULT 'pending_opponent' CHECK (
    status IN ('pending_opponent', 'pending_referee', 'confirmed', 'disputed', 'cancelled')
  ),
  opponent_verified BOOLEAN NOT NULL DEFAULT false,
  referee_verified BOOLEAN NOT NULL DEFAULT false,
  opponent_verified_at TIMESTAMPTZ,
  referee_verified_at TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT false,

  -- DUPR deltas (set when verified)
  dupr_delta_submitter REAL,
  dupr_delta_opponent REAL,
  xp_awarded BOOLEAN NOT NULL DEFAULT false,

  duration_minutes INT,
  group_id UUID,
  event_id UUID,
  tournament_match_id UUID,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_match CHECK (submitter_user_id <> opponent_user_id),
  CONSTRAINT no_self_referee CHECK (referee_user_id IS NULL OR referee_user_id NOT IN (submitter_user_id, opponent_user_id))
);

CREATE INDEX IF NOT EXISTS match_records_submitter_idx ON public.match_records (submitter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS match_records_opponent_idx ON public.match_records (opponent_user_id, status);
CREATE INDEX IF NOT EXISTS match_records_referee_idx ON public.match_records (referee_user_id, status) WHERE referee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_records_status_idx ON public.match_records (status);
CREATE INDEX IF NOT EXISTS match_records_verified_idx ON public.match_records (verified, created_at DESC);

ALTER TABLE public.match_records ENABLE ROW LEVEL SECURITY;

-- Read: any participant (submitter, opponent, referee, doubles partners) can read
CREATE POLICY "Match participants can read"
  ON public.match_records FOR SELECT
  USING (
    auth.uid() IN (submitter_user_id, opponent_user_id, referee_user_id, partner_user_id, opponent_partner_user_id)
  );

-- Insert: submitter only (must be self)
CREATE POLICY "Players can submit matches"
  ON public.match_records FOR INSERT
  WITH CHECK (auth.uid() = submitter_user_id);

-- Update: opponent (verify own side), referee (verify ref side), submitter (cancel only)
CREATE POLICY "Match participants can update"
  ON public.match_records FOR UPDATE
  USING (
    auth.uid() IN (submitter_user_id, opponent_user_id, referee_user_id)
  );

DROP TRIGGER IF EXISTS update_match_records_updated_at ON public.match_records;
CREATE TRIGGER update_match_records_updated_at
  BEFORE UPDATE ON public.match_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. tickets — event ticketing
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'checked_in', 'rejected', 'cancelled', 'expired')
  ),
  quantity INT NOT NULL DEFAULT 1,
  price_paid BIGINT NOT NULL DEFAULT 0,
  message_to_host TEXT,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_id, buyer_user_id)
);

CREATE INDEX IF NOT EXISTS tickets_buyer_idx ON public.tickets (buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_event_idx ON public.tickets (event_id, status);
CREATE INDEX IF NOT EXISTS tickets_qr_token_idx ON public.tickets (qr_token);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = buyer_user_id OR auth.uid() = checked_in_by);

CREATE POLICY "Players can buy tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = buyer_user_id);

CREATE POLICY "Buyers can cancel own tickets"
  ON public.tickets FOR UPDATE
  USING (auth.uid() = buyer_user_id);

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 4. favorite_partners — explicit favorites + derived stats live in match_records
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.favorite_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, partner_user_id),
  CONSTRAINT no_self_favorite CHECK (user_id <> partner_user_id)
);

CREATE INDEX IF NOT EXISTS favorite_partners_user_idx ON public.favorite_partners (user_id);

ALTER TABLE public.favorite_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites"
  ON public.favorite_partners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
  ON public.favorite_partners FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
