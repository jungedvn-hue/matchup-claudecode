-- Add image_url to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Storage bucket for menu item images (public read, host write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menu-items', 'menu-items', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "menu_items_images_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-items');

CREATE POLICY "menu_items_images_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-items' AND auth.uid() IS NOT NULL);

CREATE POLICY "menu_items_images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-items' AND auth.uid() IS NOT NULL);

CREATE POLICY "menu_items_images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-items' AND auth.uid() IS NOT NULL);
