-- ============================================================
-- 004_full_schema.sql
-- Run this in your Supabase dashboard → SQL Editor
-- Creates all tables, adds missing columns, sets up RLS,
-- and adds two helper functions for real-user discovery
-- and mutual-like detection.
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================


-- ── 1. user_profiles ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT '',
  age            INT  NOT NULL DEFAULT 18,
  bio            TEXT NOT NULL DEFAULT '',
  hometown       TEXT NOT NULL DEFAULT '',
  height         TEXT NOT NULL DEFAULT '',
  hobbies        TEXT[] NOT NULL DEFAULT '{}',
  gender         TEXT NOT NULL DEFAULT 'prefer-not-to-say',
  looking_for    TEXT NOT NULL DEFAULT 'Everyone',
  age_min        INT  NOT NULL DEFAULT 18,
  age_max        INT  NOT NULL DEFAULT 50,
  photos         TEXT[] NOT NULL DEFAULT '{}',
  setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that may be missing on existing tables
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender  TEXT NOT NULL DEFAULT 'prefer-not-to-say';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS photos  TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age_min INT  NOT NULL DEFAULT 18;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age_max INT  NOT NULL DEFAULT 50;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "profiles_own" ON user_profiles FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_read_others" ON user_profiles FOR SELECT
    USING (auth.role() = 'authenticated' AND setup_complete = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2. user_matches ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_matches (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id    TEXT NOT NULL,
  profile_data  JSONB NOT NULL DEFAULT '{}',
  source        TEXT NOT NULL DEFAULT 'swipe',
  location_name TEXT,
  location_icon TEXT,
  matched_at    BIGINT NOT NULL,
  super_like    BOOLEAN NOT NULL DEFAULT FALSE,
  is_undecided  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, profile_id, source)
);

ALTER TABLE user_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "matches_own" ON user_matches FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 3. user_threads ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_threads (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  messages   JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, profile_id)
);

ALTER TABLE user_threads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "threads_own" ON user_threads FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 4. user_checkins ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_checkins (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id   TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_icon TEXT NOT NULL,
  checked_in_at BIGINT NOT NULL,
  UNIQUE (user_id, location_id)
);

ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "checkins_own" ON user_checkins FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 5. user_boosts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_boosts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INT NOT NULL DEFAULT 3,
  until   BIGINT,
  radius  INT NOT NULL DEFAULT 5
);

ALTER TABLE user_boosts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "boosts_own" ON user_boosts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 6. user_blocked ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_blocked (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_profile_id TEXT NOT NULL,
  UNIQUE (user_id, blocked_profile_id)
);

ALTER TABLE user_blocked ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "blocked_own" ON user_blocked FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 7. user_swiped ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_swiped (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  liked      BOOLEAN NOT NULL DEFAULT FALSE,
  swiped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, profile_id)
);

-- Add liked column if this table already existed without it
ALTER TABLE user_swiped ADD COLUMN IF NOT EXISTS liked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE user_swiped ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "swiped_own" ON user_swiped FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 8. user_presence (idempotent) ────────────────────────────────────────
-- Already created in 001_user_presence.sql but included here safely.

CREATE TABLE IF NOT EXISTS user_presence (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id     TEXT NOT NULL,
  venue_name   TEXT NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}',
  activated_at BIGINT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "presence_own" ON user_presence FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "presence_read_all" ON user_presence FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 9. delete_user RPC (so users can delete their own auth row) ──────────

CREATE OR REPLACE FUNCTION delete_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


-- ── 10. get_discover_profiles RPC ────────────────────────────────────────
-- Returns completed profiles the caller has not yet swiped on,
-- filtered by gender preference and age range.

CREATE OR REPLACE FUNCTION get_discover_profiles(
  p_looking_for TEXT DEFAULT 'Everyone',
  p_age_min     INT  DEFAULT 18,
  p_age_max     INT  DEFAULT 100
)
RETURNS SETOF user_profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.*
  FROM   user_profiles p
  WHERE  p.user_id != auth.uid()
    AND  p.setup_complete = TRUE
    AND  p.user_id::TEXT NOT IN (
           SELECT profile_id FROM user_swiped WHERE user_id = auth.uid()
         )
    AND  p.age BETWEEN p_age_min AND p_age_max
    AND  (
           p_looking_for = 'Everyone'
        OR (p_looking_for = 'Women'      AND p.gender = 'woman')
        OR (p_looking_for = 'Men'        AND p.gender = 'man')
        OR (p_looking_for = 'Non-binary' AND p.gender = 'non-binary')
         )
  ORDER  BY p.updated_at DESC
  LIMIT  50;
$$;


-- ── 11. check_mutual_like RPC ────────────────────────────────────────────
-- Returns TRUE if target_user_id has already swiped liked=true on the caller.

CREATE OR REPLACE FUNCTION check_mutual_like(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_swiped
    WHERE  user_id    = target_user_id
      AND  profile_id = auth.uid()::TEXT
      AND  liked      = TRUE
  );
$$;
