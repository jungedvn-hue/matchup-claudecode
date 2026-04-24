-- Add missing columns to tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS referees JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS courts JSONB DEFAULT '[]'::jsonb;

-- Ensure tour_categories has pools and bracket_rounds (already checked, but good for safety)
ALTER TABLE public.tour_categories ADD COLUMN IF NOT EXISTS pools JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tour_categories ADD COLUMN IF NOT EXISTS bracket_rounds JSONB DEFAULT '[]'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.tournaments.referees IS 'List of referees assigned to the tournament';
COMMENT ON COLUMN public.tournaments.courts IS 'List of courts available for the tournament';
