-- Per-match livestream URL (single link to 3rd-party stream)
ALTER TABLE public.tour_matches
  ADD COLUMN IF NOT EXISTS livestream_url TEXT;
