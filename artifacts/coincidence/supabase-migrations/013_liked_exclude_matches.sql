-- ── 013: Exclude existing matches from "who liked me" ─────────────────────
-- Once two users have matched, the liker should no longer appear in the
-- "liked" paywall tab — they're already a match.
-- Updates both the count and the list RPC.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_who_liked_me_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_swiped s
  JOIN public.user_profiles p ON p.user_id = s.user_id
  WHERE s.profile_id = auth.uid()::TEXT
    AND s.liked = true
    AND p.setup_complete = true
    -- exclude people already matched with the caller
    AND s.user_id::TEXT NOT IN (
      SELECT profile_id FROM public.user_matches
      WHERE user_id = auth.uid()
    );
$$;


CREATE OR REPLACE FUNCTION get_who_liked_me()
RETURNS SETOF public.user_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.*
  FROM public.user_swiped s
  JOIN public.user_profiles p ON p.user_id = s.user_id
  WHERE s.profile_id = auth.uid()::TEXT
    AND s.liked = true
    AND p.setup_complete = true
    -- exclude people already matched with the caller
    AND s.user_id::TEXT NOT IN (
      SELECT profile_id FROM public.user_matches
      WHERE user_id = auth.uid()
    )
  LIMIT 100;
$$;
