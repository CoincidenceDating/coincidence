-- Run this in your Supabase dashboard → SQL Editor
-- Creates the profile-photos storage bucket and its RLS policies.

-- 1. Create bucket (public = URLs are readable without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Authenticated users can upload into their own folder (user_id/...)
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Authenticated users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Public read access (needed for img src URLs to work)
CREATE POLICY "Public read profile photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-photos');
