-- Groups: city filter + Google Maps link

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS city    TEXT,
  ADD COLUMN IF NOT EXISTS map_url TEXT;

CREATE INDEX IF NOT EXISTS idx_groups_city ON public.groups(city) WHERE city IS NOT NULL;
