-- ── 028: unmatch_user RPC + fix who-liked-me to exclude blocked users ────────
--
-- Problems fixed:
--   1. Old unmatch only deleted CALLER's user_matches row — target still saw
--      the match and could still message / be visible.
--   2. Old unmatch only added a one-directional block — target could still see
--      the caller in Discover, Coincidence, and Who Liked Me.
--   3. get_who_liked_me / count did not filter blocked users — an unmatched /
--      blocked user could still appear in the "liked" paywall section.
--
-- Fix:
--   a. New unmatch_user RPC deletes BOTH match rows, writes MUTUAL blocks, and
--      cleans up swiped rows so no ghost likes remain.
--   b. Updated get_who_liked_me_count and get_who_liked_me exclude any user the
--      caller has blocked OR any user who has blocked the caller.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. unmatch_user RPC ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unmatch_user(p_target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL OR v_caller_id = p_target_id THEN
    RETURN;
  END IF;

  -- Delete ALL match rows between the two users in both directions.
  -- Covers every source (swipe, coincidence, venue, etc.).
  DELETE FROM public.user_matches
  WHERE (user_id = v_caller_id AND profile_id = p_target_id::TEXT)
     OR (user_id = p_target_id AND profile_id = v_caller_id::TEXT);

  -- Mutual block so neither user ever sees the other again.
  INSERT INTO public.user_blocked (user_id, blocked_profile_id)
  VALUES (v_caller_id, p_target_id::TEXT)
  ON CONFLICT (user_id, blocked_profile_id) DO NOTHING;

  INSERT INTO public.user_blocked (user_id, blocked_profile_id)
  VALUES (p_target_id, v_caller_id::TEXT)
  ON CONFLICT (user_id, blocked_profile_id) DO NOTHING;

  -- Remove swiped rows in both directions so no ghost likes remain in
  -- who-liked-me and so the Discover RPC excludes-already-swiped filter
  -- stays clean.
  DELETE FROM public.user_swiped
  WHERE (user_id = v_caller_id AND profile_id = p_target_id::TEXT)
     OR (user_id = p_target_id AND profile_id = v_caller_id::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unmatch_user(UUID) TO authenticated;


-- ── 2. get_who_liked_me_count — exclude blocked (both directions) ─────────────
CREATE OR REPLACE FUNCTION public.get_who_liked_me_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM   public.user_swiped  s
  JOIN   public.user_profiles p ON p.user_id = s.user_id
  WHERE  s.profile_id = auth.uid()::TEXT
    AND  s.liked       = TRUE
    AND  p.setup_complete = TRUE
    -- exclude people already matched with the caller
    AND  s.user_id::TEXT NOT IN (
           SELECT profile_id FROM public.user_matches
           WHERE  user_id = auth.uid()
         )
    -- exclude people the caller has blocked
    AND  s.user_id::TEXT NOT IN (
           SELECT blocked_profile_id FROM public.user_blocked
           WHERE  user_id = auth.uid()
         )
    -- exclude people who have blocked the caller
    AND  s.user_id NOT IN (
           SELECT user_id FROM public.user_blocked
           WHERE  blocked_profile_id = auth.uid()::TEXT
         );
$$;


-- ── 3. get_who_liked_me — exclude blocked (both directions) ──────────────────
CREATE OR REPLACE FUNCTION public.get_who_liked_me()
RETURNS SETOF public.user_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.*
  FROM   public.user_swiped  s
  JOIN   public.user_profiles p ON p.user_id = s.user_id
  WHERE  s.profile_id = auth.uid()::TEXT
    AND  s.liked       = TRUE
    AND  p.setup_complete = TRUE
    -- exclude people already matched with the caller
    AND  s.user_id::TEXT NOT IN (
           SELECT profile_id FROM public.user_matches
           WHERE  user_id = auth.uid()
         )
    -- exclude people the caller has blocked
    AND  s.user_id::TEXT NOT IN (
           SELECT blocked_profile_id FROM public.user_blocked
           WHERE  user_id = auth.uid()
         )
    -- exclude people who have blocked the caller
    AND  s.user_id NOT IN (
           SELECT user_id FROM public.user_blocked
           WHERE  blocked_profile_id = auth.uid()::TEXT
         )
  LIMIT 100;
$$;
