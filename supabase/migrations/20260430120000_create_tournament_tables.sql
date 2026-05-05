-- ============================================================
-- Safe migration: CREATE IF NOT EXISTS for all tournament tables
-- ============================================================

-- Ensure the trigger function exists (may be missing from earlier migration)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- tournaments (safe create + missing columns)
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'pool_play',
  points_per_game INTEGER NOT NULL DEFAULT 11,
  win_by_two BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft',
  ranking_priority JSONB NOT NULL DEFAULT '["wins","head_to_head","point_diff","points_scored"]'::jsonb,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referees JSONB NOT NULL DEFAULT '[]'::jsonb,
  courts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to existing tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS referees JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS courts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS ranking_priority JSONB DEFAULT '["wins","head_to_head","point_diff","points_scored"]'::jsonb;

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Hosts can view their own tournaments" ON public.tournaments FOR SELECT USING (auth.uid() = host_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Hosts can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = host_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Hosts can update their own tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = host_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Hosts can delete their own tournaments" ON public.tournaments FOR DELETE USING (auth.uid() = host_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.tournaments.referees IS 'List of referees assigned to the tournament';
COMMENT ON COLUMN public.tournaments.courts IS 'List of courts available for the tournament';
COMMENT ON COLUMN public.tournaments.ranking_priority IS 'Array defining ranking tiebreaker priority order';

-- tour_categories
CREATE TABLE IF NOT EXISTS public.tour_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  advancing_per_pool INTEGER NOT NULL DEFAULT 2,
  wildcard_count INTEGER NOT NULL DEFAULT 0,
  pool_allocation_mode TEXT NOT NULL DEFAULT 'auto',
  pools JSONB NOT NULL DEFAULT '[]'::jsonb,
  bracket_rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_categories ADD COLUMN IF NOT EXISTS pools JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tour_categories ADD COLUMN IF NOT EXISTS bracket_rounds JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.tour_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Category access via tournament ownership" ON public.tour_categories
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tour_categories.tournament_id
      AND tournaments.host_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.tour_categories.pools IS 'JSONB array of pool structures with matches';
COMMENT ON COLUMN public.tour_categories.bracket_rounds IS 'JSONB array of knockout bracket rounds with matches';

-- tour_participants
CREATE TABLE IF NOT EXISTS public.tour_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.tour_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  seed INTEGER,
  skill_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_participants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Participant access via category ownership" ON public.tour_participants
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.tour_categories
      JOIN public.tournaments ON tournaments.id = tour_categories.tournament_id
      WHERE tour_categories.id = tour_participants.category_id
      AND tournaments.host_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tour_matches
CREATE TABLE IF NOT EXISTS public.tour_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.tour_categories(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  pool_id TEXT,
  bracket_round_id TEXT,
  match_no INTEGER NOT NULL,
  entry_a_id TEXT,
  entry_b_id TEXT,
  entry_a_name TEXT NOT NULL DEFAULT 'TBD',
  entry_b_name TEXT NOT NULL DEFAULT 'TBD',
  score_a INTEGER NOT NULL DEFAULT 0,
  score_b INTEGER NOT NULL DEFAULT 0,
  winner_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  court_id TEXT,
  referee_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Match access via tournament ownership" ON public.tour_matches
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tour_matches.tournament_id
      AND tournaments.host_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add updated_at triggers (safe)
DROP TRIGGER IF EXISTS update_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tour_categories_updated_at ON public.tour_categories;
CREATE TRIGGER update_tour_categories_updated_at
  BEFORE UPDATE ON public.tour_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tour_participants_updated_at ON public.tour_participants;
CREATE TRIGGER update_tour_participants_updated_at
  BEFORE UPDATE ON public.tour_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tour_matches_updated_at ON public.tour_matches;
CREATE TRIGGER update_tour_matches_updated_at
  BEFORE UPDATE ON public.tour_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time for matches (safe)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_matches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
