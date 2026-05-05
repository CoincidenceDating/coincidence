-- ============================================================
-- 015_mutual_radius.sql
-- Makes discover radius symmetric: User A only appears in User B's
-- feed if User A is within User B's radius AND User B is within
-- User A's stored radius. Without this, a user with a large radius
-- could see someone with a small radius who could never see them back.
-- ============================================================

-- Store each user's current discover radius on their profile row
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS discover_radius_km DOUBLE PRECISION DEFAULT 40.2336; -- 25 mi default

-- Update the discover function to enforce mutual radius
CREATE OR REPLACE FUNCTION get_discover_profiles(
  p_looking_for TEXT             DEFAULT 'Everyone',
  p_age_min     INT              DEFAULT 18,
  p_age_max     INT              DEFAULT 100,
  p_lat         DOUBLE PRECISION DEFAULT NULL,
  p_lng         DOUBLE PRECISION DEFAULT NULL,
  p_radius_km   DOUBLE PRECISION DEFAULT NULL
)
RETURNS SETOF public.user_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.*
  FROM   public.user_profiles p
  JOIN   public.user_profiles me ON me.user_id = (SELECT auth.uid())
  WHERE  p.user_id != (SELECT auth.uid())
    AND  p.setup_complete = TRUE
    AND  p.user_id::TEXT NOT IN (
           SELECT profile_id FROM public.user_swiped
           WHERE user_id = (SELECT auth.uid())
         )
    AND  p.age BETWEEN p_age_min AND p_age_max
    -- caller's gender preference
    AND  (
           p_looking_for = 'Everyone'
        OR (p_looking_for = 'Women'      AND p.gender = 'woman')
        OR (p_looking_for = 'Men'        AND p.gender = 'man')
        OR (p_looking_for = 'Non-binary' AND p.gender = 'non-binary')
         )
    -- reciprocal preference: target must also be interested in caller's gender
    AND  (
           p.looking_for = 'Everyone'
        OR (p.looking_for = 'Women'      AND me.gender = 'woman')
        OR (p.looking_for = 'Men'        AND me.gender = 'man')
        OR (p.looking_for = 'Non-binary' AND me.gender = 'non-binary')
         )
    -- GPS / radius filter
    AND  (
           -- No GPS supplied by caller → no location filter
           p_lat IS NULL
        OR p_lng IS NULL
        OR p_radius_km IS NULL
        OR (
             -- Target must have coordinates
             p.lat IS NOT NULL AND p.lng IS NOT NULL
             -- 1. Target must be within the CALLER's radius
             AND (
               6371.0 * 2.0 * asin(sqrt(
                 power(sin(radians((p.lat  - p_lat) / 2.0)), 2) +
                 cos(radians(p_lat)) * cos(radians(p.lat)) *
                 power(sin(radians((p.lng  - p_lng) / 2.0)), 2)
               ))
             ) <= p_radius_km
             -- 2. Caller must also be within the TARGET's stored radius (mutual)
             AND (
               6371.0 * 2.0 * asin(sqrt(
                 power(sin(radians((p_lat  - p.lat) / 2.0)), 2) +
                 cos(radians(p.lat)) * cos(radians(p_lat)) *
                 power(sin(radians((p_lng  - p.lng) / 2.0)), 2)
               ))
             ) <= COALESCE(p.discover_radius_km, 40.2336)
           )
         )
  ORDER  BY p.updated_at DESC
  LIMIT  50;
$$;
