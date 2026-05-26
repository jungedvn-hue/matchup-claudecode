-- Add missing photos column referenced by useVenues hook + VenueEditDialog.
-- Storage bucket was created in 20260524130000_venue_photos_bucket.sql, but the
-- venues table column to hold photo URLs was never added → inserts from the
-- frontend with `photos: [...]` failed (column does not exist).

alter table public.venues
  add column if not exists photos text[] not null default '{}';
