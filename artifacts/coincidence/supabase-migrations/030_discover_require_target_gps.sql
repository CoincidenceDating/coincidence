-- ── 030: Require target GPS in discover — new accounts no longer appear to everyone ──
--
-- Root cause: the distance clause contained:
--   OR up.lat IS NULL OR up.lng IS NULL
-- which caused any profile without stored GPS (i.e. new accounts) to pass the
-- distance filter and appear in every other user's Discover feed worldwide.
--
-- Fix: when the caller has GPS + radius, ONLY show targets who also have stored
-- GPS coordinates AND fall within the caller's radius. Profiles without GPS are
-- completely hidden from Discover until the app writes their first location fix.
--
-- When the caller has no GPS (p_lat/p_lng/p_radius_km is NULL), the entire
-- distance block is skipped as before — behaviour is unchanged for that case.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_discover_profiles(TEXT, INT, INT, FLOAT8, FLOAT8, FLOAT8);

CREATE OR REPLACE FUNCTION public.get_discover_profiles(
  p_looking_for TEXT,
  p_age_min     INT,
  p_age_max     INT,
  p_lat         FLOAT8 DEFAULT NULL,
  p_lng         FLOAT8 DEFAULT NULL,
  p_radius_km   FLOAT8 DEFAULT NULL
)
RETURNS TABLE (
  user_id      TEXT,
  name         TEXT,
  age          INT,
  bio          TEXT,
  photos       TEXT[],
  gender       TEXT,
  lat          FLOAT8,
  lng          FLOAT8,
  looking_for  TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH caller AS (
    SELECT gender
    FROM   public.user_profiles
    WHERE  user_id = auth.uid()
    LIMIT  1
  )
  SELECT
    up.user_id::TEXT,
    up.name,
    up.age,
    up.bio,
    up.photos,
    up.gender,
    up.lat,
    up.lng,
    up.looking_for
  FROM  public.user_profiles up
  CROSS JOIN caller
  WHERE up.setup_complete = TRUE
    AND up.user_id != auth.uid()

    -- ── Exclude profiles the caller has already swiped ─────────────────────
    AND up.user_id::TEXT NOT IN (
      SELECT profile_id
      FROM   public.user_swiped
      WHERE  user_id = auth.uid()
    )

    -- ── Exclude profiles the caller has blocked ────────────────────────────
    AND up.user_id::TEXT NOT IN (
      SELECT blocked_profile_id
      FROM   public.user_blocked
      WHERE  user_id = auth.uid()
    )

    -- ── Age range ──────────────────────────────────────────────────────────
    AND up.age >= p_age_min
    AND up.age <= p_age_max

    -- ── Caller's gender preference ─────────────────────────────────────────
    AND (
      p_looking_for = 'Everyone'
      OR (p_looking_for = 'Women'      AND up.gender = 'woman')
      OR (p_looking_for = 'Men'        AND up.gender = 'man')
      OR (p_looking_for = 'Non-binary' AND up.gender = 'non-binary')
    )

    -- ── Reciprocal: target must accept the caller's gender ─────────────────
    AND (
      up.looking_for IS NULL
      OR up.looking_for = 'Everyone'
      OR (up.looking_for = 'Women'      AND caller.gender = 'woman')
      OR (up.looking_for = 'Men'        AND caller.gender = 'man')
      OR (up.looking_for = 'Non-binary' AND caller.gender = 'non-binary')
    )

    -- ── Distance filter ────────────────────────────────────────────────────
    -- When the caller has no GPS / no radius: skip distance entirely.
    -- When the caller has GPS: the target MUST also have GPS AND be within
    -- the caller's radius. Profiles without GPS are hidden until their app
    -- writes a location fix (no more "new account visible everywhere" bug).
    AND (
      p_lat      IS NULL
      OR p_lng      IS NULL
      OR p_radius_km IS NULL
      OR (
        up.lat IS NOT NULL
        AND up.lng IS NOT NULL
        AND (
          6371.0 * acos(
            least(1.0,
              cos(radians(p_lat)) * cos(radians(up.lat))
              * cos(radians(up.lng) - radians(p_lng))
              + sin(radians(p_lat)) * sin(radians(up.lat))
            )
          ) <= p_radius_km
        )
      )
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_discover_profiles(TEXT, INT, INT, FLOAT8, FLOAT8, FLOAT8) TO authenticated;
