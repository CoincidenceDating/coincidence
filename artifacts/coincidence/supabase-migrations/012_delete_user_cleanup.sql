-- ── 012: Full cross-table cleanup on account deletion ─────────────────────
-- When a user deletes their account, their UUID appears in other users'
-- tables as a TEXT profile_id (no FK → no CASCADE).  This migration updates
-- delete_user() to remove those orphaned rows before deleting the auth row.
--
-- Tables cleaned up:
--   public.user_matches  WHERE profile_id = deleted_uid
--   public.user_swiped   WHERE profile_id = deleted_uid
--   public.user_threads  WHERE profile_id = deleted_uid
--   public.messages      WHERE sender_id  = deleted_uid
--                           OR receiver_id = deleted_uid
--
-- The function is SECURITY DEFINER so it runs as the function owner and
-- can delete rows owned by other users (bypassing RLS).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  -- Remove appearances of this user in OTHER users' data
  DELETE FROM public.user_matches WHERE profile_id = uid::TEXT;
  DELETE FROM public.user_swiped  WHERE profile_id = uid::TEXT;
  DELETE FROM public.user_threads WHERE profile_id = uid::TEXT;
  DELETE FROM public.messages
    WHERE sender_id = uid OR receiver_id = uid;

  -- Delete the auth row — cascades to user_profiles and all FK-linked tables
  -- (user_matches, user_swiped, user_threads, user_boosts, user_blocked,
  --  user_checkins, user_presence, who_liked_access owned BY this user)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;
