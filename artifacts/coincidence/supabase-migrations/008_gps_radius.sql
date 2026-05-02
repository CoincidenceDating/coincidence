-- ── 008: GPS coordinates + radius filtering ──────────────────────────────
-- Adds lat/lng to user_profiles and updates get_discover_profiles to
-- filter by real geographic distance using the Haversine formula.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Updated discover function with optional GPS distance filtering
CREATE OR REPLACE FUNCTION get_discover_profiles(
  p_looking_for TEXT    DEFAULT 'Everyone',
  p_age_min     INT     DEFAULT 18,
  p_age_max     INT     DEFAULT 100,
  p_lat         DOUBLE PRECISION DEFAULT NULL,
  p_lng         DOUBLE PRECISION DEFAULT NULL,
  p_radius_km   DOUBLE PRECISION DEFAULT NULL
)
RETURNS SETOF user_profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.*
  FROM   user_profiles p
  JOIN   user_profiles me ON me.user_id = auth.uid()
  WHERE  p.user_id != auth.uid()
    AND  p.setup_complete = TRUE
    AND  p.user_id::TEXT NOT IN (
           SELECT profile_id FROM user_swiped WHERE user_id = auth.uid()
         )
    AND  p.age BETWEEN p_age_min AND p_age_max
    -- caller's gender preference
    AND  (
           p_looking_for = 'Everyone'
        OR (p_looking_for = 'Women'      AND p.gender = 'woman')
        OR (p_looking_for = 'Men'        AND p.gender = 'man')
        OR (p_looking_for = 'Non-binary' AND p.gender = 'non-binary')
         )
    -- their preference (reciprocal filter from migration 006)
    AND  (
           p.looking_for = 'Everyone'
        OR (p.looking_for = 'Women'      AND me.gender = 'woman')
        OR (p.looking_for = 'Men'        AND me.gender = 'man')
        OR (p.looking_for = 'Non-binary' AND me.gender = 'non-binary')
         )
    -- GPS radius filter (only applied when caller supplies coordinates)
    AND  (
           p_lat IS NULL
        OR p_lng IS NULL
        OR p_radius_km IS NULL
        OR p.lat IS NULL
        OR p.lng IS NULL
        OR (
             6371.0 * 2.0 * asin(sqrt(
               power(sin(radians((p.lat - p_lat) / 2.0)), 2) +
               cos(radians(p_lat)) * cos(radians(p.lat)) *
               power(sin(radians((p.lng - p_lng) / 2.0)), 2)
             ))
           ) <= p_radius_km
         )
  ORDER  BY p.updated_at DESC
  LIMIT  50;
$$;
