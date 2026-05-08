-- Migration 031: create unmatch_user RPC
-- Run this once in the Supabase SQL Editor.
--
-- What it does:
--   1. Deletes BOTH users' match rows (needs SECURITY DEFINER to bypass RLS)
--   2. Inserts a mutual block so neither appears in Discover / Coincidence
--   3. Cleans up swiped rows so no ghost likes remain

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

  -- Mutual block: prevents either user appearing in the other's Discover feed
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

-- Only authenticated users may call this
REVOKE EXECUTE ON FUNCTION public.unmatch_user(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.unmatch_user(UUID) TO authenticated;
