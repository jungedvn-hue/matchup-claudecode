-- Bracket pairing template support.
-- bracket_seed_mode: 'auto' (sort qualified by ranking, apply seed pattern) |
--                    'template' (use bracket_template to map pool standings into R1 slots)
-- bracket_template: JSONB array of { a: BracketSlotRef, b: BracketSlotRef } R1 pairings.
-- bracket_template_pool_count: planning value captured at template-setup time so the
--   template can be invalidated when pool layout diverges.

ALTER TABLE public.tour_categories
  ADD COLUMN IF NOT EXISTS bracket_seed_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE public.tour_categories
  ADD CONSTRAINT tour_categories_bracket_seed_mode_check
  CHECK (bracket_seed_mode IN ('auto', 'template'));

ALTER TABLE public.tour_categories
  ADD COLUMN IF NOT EXISTS bracket_template jsonb;

ALTER TABLE public.tour_categories
  ADD COLUMN IF NOT EXISTS bracket_template_pool_count integer;
