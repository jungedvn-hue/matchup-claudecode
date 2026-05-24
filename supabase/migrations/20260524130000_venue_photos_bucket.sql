-- Court Owner V1.2 — venue photos bucket
-- Public read; only owner of the user_id folder can write.

INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-photos', 'venue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop any pre-existing policies with these names so re-running is safe.
DROP POLICY IF EXISTS "venue_photos_read_all"     ON storage.objects;
DROP POLICY IF EXISTS "venue_photos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "venue_photos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "venue_photos_owner_delete" ON storage.objects;

CREATE POLICY "venue_photos_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'venue-photos');

CREATE POLICY "venue_photos_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'venue-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "venue_photos_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'venue-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "venue_photos_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'venue-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
