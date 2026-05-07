-- Public bucket for store logos and (future) cover images.
-- Files stored under {owner_user_id}/logo.{ext} so the user can only
-- write into their own folder.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone can read (public bucket, but we still need a SELECT policy)
DROP POLICY IF EXISTS "store_assets_public_read" ON storage.objects;
CREATE POLICY "store_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-assets');

-- Authenticated users can write only into a folder named with their uid
DROP POLICY IF EXISTS "store_assets_owner_write" ON storage.objects;
CREATE POLICY "store_assets_owner_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'store-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "store_assets_owner_update" ON storage.objects;
CREATE POLICY "store_assets_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "store_assets_owner_delete" ON storage.objects;
CREATE POLICY "store_assets_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
