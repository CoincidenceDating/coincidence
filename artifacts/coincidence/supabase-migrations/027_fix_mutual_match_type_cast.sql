-- ── 027: Fix create_mutual_match — explicit ::text cast in mutual check ──────
-- Root cause of "both users liked each other but no match created":
--   user_swiped.profile_id is TEXT, but the mutual check compared it against
--   v_caller_id which is UUID type with no explicit cast:
--     AND profile_id = v_caller_id   ← TEXT = UUID (ambiguous, may fail)
--   PostgreSQL tries an implicit TEXT→UUID cast on profile_id, which works when
--   the text is a valid UUID. However the cast can fail silently when the query
--   planner chooses a different plan, or when the implicit cast isn't found for
--   the = operator between TEXT and UUID in SECURITY DEFINER context.
--
-- Fix: add ::text to v_caller_id so the comparison is TEXT = TEXT throughout.
-- Also add ::text to target_user_id in the INSERT for the same reason.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.create_mutual_match(UUID, JSONB, JSONB, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_mutual_match(
  target_user_id    UUID,
  p_profile_data    JSONB,
  p_my_profile_data JSONB,
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

  -- Record caller's like (idempotent).
  -- Cast both sides to TEXT so the UNIQUE(user_id, profile_id) index is hit
  -- correctly — profile_id is TEXT, so we store UUID as its text representation.
  INSERT INTO public.user_swiped (user_id, profile_id, liked)
  VALUES (v_caller_id, target_user_id::TEXT, TRUE)
  ON CONFLICT (user_id, profile_id) DO UPDATE SET liked = TRUE;

  -- Check whether the target has already liked the caller back.
  -- CRITICAL: profile_id is TEXT — cast v_caller_id to TEXT explicitly so the
  -- comparison is TEXT = TEXT and the index on (user_id, profile_id) is used.
  SELECT EXISTS (
    SELECT 1 FROM public.user_swiped
    WHERE user_id    = target_user_id        -- UUID = UUID ✓
      AND profile_id = v_caller_id::TEXT     -- TEXT = TEXT ✓ (was TEXT = UUID)
      AND liked      = TRUE
  ) INTO v_mutual;

  IF NOT v_mutual THEN
    RETURN FALSE;
  END IF;

  -- ── Mutual match confirmed ─────────────────────────────────────────────

  -- Row for CALLER (sees the target's profile)
  INSERT INTO public.user_matches (
    user_id, profile_id, profile_data,
    source, location_name, location_icon,
    matched_at, super_like, is_undecided
  ) VALUES (
    v_caller_id, target_user_id::TEXT, p_profile_data,
    p_source, p_location_name, p_location_icon,
    v_now, FALSE, FALSE
  )
  ON CONFLICT (user_id, profile_id, source) DO NOTHING;

  -- Row for TARGET (sees the caller's profile)
  INSERT INTO public.user_matches (
    user_id, profile_id, profile_data,
    source, location_name, location_icon,
    matched_at, super_like, is_undecided
  ) VALUES (
    target_user_id, v_caller_id::TEXT, p_my_profile_data,
    p_source, p_location_name, p_location_icon,
    v_now, FALSE, FALSE
  )
  ON CONFLICT (user_id, profile_id, source) DO NOTHING;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_mutual_match(UUID, JSONB, JSONB, TEXT, TEXT, TEXT) TO authenticated;
