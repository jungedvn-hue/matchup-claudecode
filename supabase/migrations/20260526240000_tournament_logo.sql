-- Tournament logo support.
-- Adds optional logo URL on tournaments, plus a public-read storage bucket
-- with per-user folder write permissions so hosts can upload their own logo.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-assets', 'tournament-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tournament_assets_read_all"     ON storage.objects;
DROP POLICY IF EXISTS "tournament_assets_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "tournament_assets_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "tournament_assets_owner_delete" ON storage.objects;

CREATE POLICY "tournament_assets_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'tournament-assets');

CREATE POLICY "tournament_assets_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tournament-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "tournament_assets_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tournament-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "tournament_assets_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tournament-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
