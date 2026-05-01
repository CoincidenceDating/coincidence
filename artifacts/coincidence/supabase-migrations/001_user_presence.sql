-- Run this in your Supabase dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}',
  activated_at BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own row
CREATE POLICY "presence_own" ON user_presence
  FOR ALL USING (auth.uid() = user_id);

-- Any authenticated user can read presence (to find others at same venue)
CREATE POLICY "presence_read_all" ON user_presence
  FOR SELECT USING (auth.role() = 'authenticated');
