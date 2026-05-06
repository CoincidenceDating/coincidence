-- ── 024: Fix create_mutual_match — insert match row for BOTH users ─────────
-- Root cause of the live test failure:
--   When User A liked User B and it became mutual, the RPC only inserted a
--   user_matches row for User A (the caller). User B never got a row, so the
--   match never appeared in User B's Matches tab. User B received the message
--   toast (messages table is separate) but had nowhere to reply.
--
-- Fix: insert user_matches for the TARGET user as well, using p_my_profile_data
-- (the caller's own profile snapshot) as the profile_data for that row.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_mutual_match(
  target_user_id    UUID,
  p_profile_data    JSONB,       -- target's profile as seen by caller
  p_my_profile_data JSONB,       -- caller's own profile snapshot
  p_source          TEXT    DEFAULT 'swipe',
  p_location_name   TEXT    DEFAULT NULL,
  p_location_icon   TEXT    DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_mutual    BOOLEAN;
  v_now       BIGINT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_now := EXTRACT(EPOCH FROM now())::BIGINT * 1000;

  -- Record caller's like (idempotent)
  INSERT INTO public.user_swiped (user_id, profile_id, liked)
  VALUES (v_caller_id, target_user_id, TRUE)
  ON CONFLICT (user_id, profile_id) DO UPDATE SET liked = TRUE;

  -- Check whether the target has already liked the caller
  SELECT EXISTS (
    SELECT 1 FROM public.user_swiped
    WHERE user_id   = target_user_id
      AND profile_id = v_caller_id
      AND liked      = TRUE
  ) INTO v_mutual;

  IF NOT v_mutual THEN
    RETURN FALSE;
  END IF;

  -- ── Mutual match confirmed ─────────────────────────────────────────────

  -- Row for CALLER  (sees the target's profile)
  INSERT INTO public.user_matches (
    user_id, profile_id, profile_data,
    source, location_name, location_icon,
    matched_at, super_like, is_undecided
  ) VALUES (
    v_caller_id, target_user_id, p_profile_data,
    p_source, p_location_name, p_location_icon,
    v_now, FALSE, FALSE
  )
  ON CONFLICT (user_id, profile_id, source) DO NOTHING;

  -- Row for TARGET  (sees the caller's profile) — this was the missing piece
  INSERT INTO public.user_matches (
    user_id, profile_id, profile_data,
    source, location_name, location_icon,
    matched_at, super_like, is_undecided
  ) VALUES (
    target_user_id, v_caller_id, p_my_profile_data,
    p_source, p_location_name, p_location_icon,
    v_now, FALSE, FALSE
  )
  ON CONFLICT (user_id, profile_id, source) DO NOTHING;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_mutual_match(UUID, JSONB, JSONB, TEXT, TEXT, TEXT) TO authenticated;
