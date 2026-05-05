-- Add bracket_fill_mode column to tour_categories
-- Values: 'wildcard' (fill bracket with best 3rd-place teams) | 'bye' (pad with BYE)
ALTER TABLE public.tour_categories
  ADD COLUMN IF NOT EXISTS bracket_fill_mode text NOT NULL DEFAULT 'wildcard';

ALTER TABLE public.tour_categories
  ADD CONSTRAINT tour_categories_bracket_fill_mode_check
  CHECK (bracket_fill_mode IN ('wildcard', 'bye'));

-- Enable Realtime for tour_categories so bracket_rounds JSON changes
-- (winner advancement) propagate to all connected clients.
ALTER TABLE public.tour_categories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_categories;
