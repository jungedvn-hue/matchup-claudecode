-- Add Google Maps link to venues
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS map_url TEXT;
