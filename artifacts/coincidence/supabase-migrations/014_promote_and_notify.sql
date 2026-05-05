-- ============================================================
-- 014_promote_and_notify.sql
-- When User B accepts a "maybe" match, this function:
--   1. Promotes User B's undecided row to confirmed
--   2. Inserts a reciprocal match row for User A so they see
--      the match immediately in their own matches tab.
-- Without this, accepting from the undecided tab was one-sided.
-- ============================================================

CREATE OR REPLACE FUNCTION promote_and_notify(
  p_profile_id      TEXT,   -- the profile being accepted (User A's UUID as text)
  p_my_profile_data JSONB   -- the caller's (User B's) own profile data
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  now_ms BIGINT;
BEGIN
  now_ms := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

  -- 1. Promote User B's undecided row to a confirmed match
  UPDATE public.user_matches
  SET    is_undecided = FALSE,
         matched_at   = now_ms
  WHERE  user_id    = auth.uid()
    AND  profile_id = p_profile_id;

  -- 2. Insert a match row for User A (the original liker) so they see
  --    User B in their matches tab.  ON CONFLICT = already matched, no-op.
  INSERT INTO public.user_matches
    (user_id, profile_id, profile_data, source, matched_at, is_undecided)
  VALUES
    (p_profile_id::UUID, auth.uid()::TEXT, p_my_profile_data, 'swipe', now_ms, FALSE)
  ON CONFLICT (user_id, profile_id, source) DO NOTHING;
END;
$$;
