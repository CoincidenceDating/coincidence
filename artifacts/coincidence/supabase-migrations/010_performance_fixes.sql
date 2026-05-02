-- ── 010: Performance hardening ────────────────────────────────────────────
-- Fixes two classes of Supabase performance advisories:
--
--  1. RLS policies that call auth.uid() directly cause the function to be
--     re-evaluated for every row in the table.  Wrapping it in a subquery
--     (SELECT auth.uid()) pins the value once per query.
--
--  2. Missing indexes on foreign-key columns, commonly filtered columns,
--     and ORDER BY columns slow down every query that touches those tables.
--
-- Safe to run multiple times (uses CREATE INDEX IF NOT EXISTS, DROP/CREATE
-- for policies).
-- ─────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════
-- PART 1 — RLS policy rewrites (auth.uid() → (SELECT auth.uid()))
-- ══════════════════════════════════════════════════════════════════════════

-- ── user_profiles ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_own"          ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_read_others"  ON public.user_profiles;

CREATE POLICY "profiles_own" ON public.user_profiles
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "profiles_read_others" ON public.user_profiles
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL AND setup_complete = TRUE);


-- ── user_matches ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "matches_own" ON public.user_matches;

CREATE POLICY "matches_own" ON public.user_matches
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── user_threads ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "threads_own" ON public.user_threads;

CREATE POLICY "threads_own" ON public.user_threads
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── user_checkins ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "checkins_own" ON public.user_checkins;

CREATE POLICY "checkins_own" ON public.user_checkins
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── user_boosts ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "boosts_own" ON public.user_boosts;

CREATE POLICY "boosts_own" ON public.user_boosts
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── user_blocked ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "blocked_own" ON public.user_blocked;

CREATE POLICY "blocked_own" ON public.user_blocked
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── user_swiped ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "swiped_own" ON public.user_swiped;

CREATE POLICY "swiped_own" ON public.user_swiped
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ── user_presence ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "presence_own"      ON public.user_presence;
DROP POLICY IF EXISTS "presence_read_all" ON public.user_presence;

CREATE POLICY "presence_own" ON public.user_presence
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "presence_read_all" ON public.user_presence
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);


-- ── messages ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "messages_participants" ON public.messages;

CREATE POLICY "messages_participants" ON public.messages
  FOR ALL
  USING (
    (SELECT auth.uid()) = sender_id
    OR (SELECT auth.uid()) = receiver_id
  )
  WITH CHECK ((SELECT auth.uid()) = sender_id);


-- ── who_liked_access ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users manage own access" ON public.who_liked_access;

CREATE POLICY "users manage own access" ON public.who_liked_access
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ══════════════════════════════════════════════════════════════════════════
-- PART 2 — Missing indexes
-- ══════════════════════════════════════════════════════════════════════════

-- ── user_profiles ─────────────────────────────────────────────────────────
-- Frequently filtered / ordered columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_setup_complete
  ON public.user_profiles (setup_complete);

CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at
  ON public.user_profiles (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_profiles_gender
  ON public.user_profiles (gender);

CREATE INDEX IF NOT EXISTS idx_user_profiles_age
  ON public.user_profiles (age);

-- GPS distance queries (not an index type that helps haversine directly,
-- but indexing lat/lng enables planner to do index scans for bounding-box
-- pre-filters if the planner chooses it)
CREATE INDEX IF NOT EXISTS idx_user_profiles_lat_lng
  ON public.user_profiles (lat, lng);


-- ── user_matches ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_matches_user_id
  ON public.user_matches (user_id);

CREATE INDEX IF NOT EXISTS idx_user_matches_profile_id
  ON public.user_matches (profile_id);

CREATE INDEX IF NOT EXISTS idx_user_matches_user_undecided
  ON public.user_matches (user_id, is_undecided);

CREATE INDEX IF NOT EXISTS idx_user_matches_matched_at
  ON public.user_matches (matched_at DESC);


-- ── user_threads ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_threads_user_id
  ON public.user_threads (user_id);

CREATE INDEX IF NOT EXISTS idx_user_threads_updated_at
  ON public.user_threads (updated_at DESC);


-- ── user_checkins ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_id
  ON public.user_checkins (user_id);

CREATE INDEX IF NOT EXISTS idx_user_checkins_location_id
  ON public.user_checkins (location_id);


-- ── user_boosts ───────────────────────────────────────────────────────────
-- `until` is queried with > filter in getBoostedProfileIds
CREATE INDEX IF NOT EXISTS idx_user_boosts_until
  ON public.user_boosts (until);


-- ── user_blocked ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_blocked_user_id
  ON public.user_blocked (user_id);

CREATE INDEX IF NOT EXISTS idx_user_blocked_blocked_profile_id
  ON public.user_blocked (blocked_profile_id);


-- ── user_swiped ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_swiped_user_id
  ON public.user_swiped (user_id);

CREATE INDEX IF NOT EXISTS idx_user_swiped_profile_id
  ON public.user_swiped (profile_id);

-- Used in get_who_liked_me / check_mutual_like: profile_id + liked
CREATE INDEX IF NOT EXISTS idx_user_swiped_profile_liked
  ON public.user_swiped (profile_id, liked)
  WHERE liked = TRUE;

-- Used in get_discover_profiles subquery: user_id + profile_id
CREATE INDEX IF NOT EXISTS idx_user_swiped_user_profile
  ON public.user_swiped (user_id, profile_id);


-- ── user_presence ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_presence_venue_id
  ON public.user_presence (venue_id);

-- Used in getVenuePresenceCounts with > filter on activated_at
CREATE INDEX IF NOT EXISTS idx_user_presence_venue_activated
  ON public.user_presence (venue_id, activated_at DESC);


-- ── messages ──────────────────────────────────────────────────────────────
-- Already created in migration 005, included here idempotently
CREATE INDEX IF NOT EXISTS messages_receiver_created
  ON public.messages (receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_sender_created
  ON public.messages (sender_id, created_at DESC);


-- ── who_liked_access ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_who_liked_access_expires_at
  ON public.who_liked_access (expires_at);
