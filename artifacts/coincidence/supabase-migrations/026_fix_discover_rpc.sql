-- ── 026: Rewrite get_discover_profiles — one-directional radius only ─────────
-- Root cause of "users can't see each other":
--   The previous RPC did a MUTUAL radius check:
--     distance(A, B) <= A.radius  AND  distance(A, B) <= B.discover_radius_km
--   This means User B is invisible to User A whenever User A falls outside
--   User B's stored radius preference — even if User B is well within User A's
--   own radius. This is wrong UX. Radius means "show me people within X of me",
--   not "only show me people who also want to see me within their radius".
--
-- Fix: filter by the CALLER's radius only. The target's discover_radius_km is
-- irrelevant to whether the caller can see them.
--
-- Also removes the hard requirement that up.lat IS NOT NULL when the caller has
-- GPS — those users are already handled by the TypeScript supplemental query,
-- but including them here is harmless and doesn't break anything.
-- ─────────────────────────────────────────────────────────────────────────────

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

    -- ── Distance: CALLER's radius only (no mutual check) ───────────────────
    -- When caller has no GPS or no radius, show everyone (no distance filter).
    -- When caller has GPS + radius, only filter targets that HAVE coordinates;
    -- targets without GPS pass through here and are removed by the TypeScript
    -- supplemental-query layer (which re-adds them without a distance filter).
    AND (
      p_lat      IS NULL
      OR p_lng      IS NULL
      OR p_radius_km IS NULL
      OR up.lat  IS NULL
      OR up.lng  IS NULL
      OR (
        6371.0 * acos(
          least(1.0,
            cos(radians(p_lat)) * cos(radians(up.lat))
            * cos(radians(up.lng) - radians(p_lng))
            + sin(radians(p_lat)) * sin(radians(up.lat))
          )
        ) <= p_radius_km
      )
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_discover_profiles(TEXT, INT, INT, FLOAT8, FLOAT8, FLOAT8) TO authenticated;
