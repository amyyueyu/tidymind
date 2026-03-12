
-- Create storage bucket for room images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-images',
  'room-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Room images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'room-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload room images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'room-images' AND auth.uid() IS NOT NULL);

-- Users can update room images
CREATE POLICY "Users can update room images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'room-images' AND auth.uid() IS NOT NULL);

-- Users can delete room images
CREATE POLICY "Users can delete room images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'room-images' AND auth.uid() IS NOT NULL);
