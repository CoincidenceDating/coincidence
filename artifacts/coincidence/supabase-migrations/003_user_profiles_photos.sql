-- Run this in your Supabase dashboard → SQL Editor
-- Adds the photos column to user_profiles so uploaded photos persist.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';
