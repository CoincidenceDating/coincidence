-- Migration 031: unmatch_user RPC + RLS policy for realtime unmatches
-- Run this once in the Supabase SQL Editor.
--
-- Part 1: unmatch_user function
--   Needs SECURITY DEFINER so it can delete both users' rows and insert
--   mutual blocks, bypassing RLS restrictions on cross-user writes.
--
-- Part 2: RLS SELECT policy on user_blocked
--   Supabase postgres_changes realtime only delivers events for rows the
--   subscriber can SELECT. Without this policy, when User A blocks User B,
--   User B's subscription is silently dropped because their default RLS
--   only allows them to SELECT rows they own (user_id = auth.uid()).
--   This policy also lets them see rows where they are the blocked party.

-- ── Part 1: function ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.unmatch_user(p_target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID := auth.uid();
BEGIN
  -- Delete both match rows (all sources)
  DELETE FROM user_matches
  WHERE (user_id = v_my_id      AND profile_id = p_target_id::TEXT)
     OR (user_id = p_target_id  AND profile_id = v_my_id::TEXT);

  -- Mutual block: prevents either user appearing in Discover / Coincidence
  INSERT INTO user_blocked (user_id, blocked_profile_id)
  VALUES
    (v_my_id,     p_target_id::TEXT),
    (p_target_id, v_my_id::TEXT)
  ON CONFLICT (user_id, blocked_profile_id) DO NOTHING;

  -- Remove swiped records so no ghost likes remain
  DELETE FROM user_swiped
  WHERE (user_id = v_my_id      AND profile_id = p_target_id::TEXT)
     OR (user_id = p_target_id  AND profile_id = v_my_id::TEXT);
END;
$$;

-- Only authenticated users may call this function
REVOKE EXECUTE ON FUNCTION public.unmatch_user(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.unmatch_user(UUID) TO authenticated;


-- ── Part 2: RLS policy ────────────────────────────────────────────────────────

-- Allow users to SELECT rows where they are the blocked party.
-- This is required for the realtime subscription in subscribeToUnmatches():
--   INSERT on user_blocked where blocked_profile_id = myId
-- Without this, Supabase drops the event before it reaches the subscriber.
CREATE POLICY "Users can see when they are blocked"
  ON user_blocked
  FOR SELECT
  USING (blocked_profile_id = auth.uid()::TEXT);
