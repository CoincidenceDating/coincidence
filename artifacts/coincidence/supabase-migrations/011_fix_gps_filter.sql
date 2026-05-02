-- Migration 011: Fix GPS radius filter
-- Previously, profiles with no stored location (p.lat IS NULL or p.lng IS NULL)
-- bypassed the distance check entirely, showing users like Marcus in Glasgow
-- to someone in Yorkshire. Now when the caller provides a lat/lng/radius,
-- only profiles that ALSO have a stored location AND are within range are shown.

CREATE OR REPLACE FUNCTION get_discover_profiles(
  p_looking_for TEXT    DEFAULT 'Everyone',
  p_age_min     INT     DEFAULT 18,
  p_age_max     INT     DEFAULT 100,
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
    AND  (
           p_looking_for = 'Everyone'
        OR (p_looking_for = 'Women'      AND p.gender = 'woman')
        OR (p_looking_for = 'Men'        AND p.gender = 'man')
        OR (p_looking_for = 'Non-binary' AND p.gender = 'non-binary')
         )
    AND  (
           p.looking_for = 'Everyone'
        OR (p.looking_for = 'Women'      AND me.gender = 'woman')
        OR (p.looking_for = 'Men'        AND me.gender = 'man')
        OR (p.looking_for = 'Non-binary' AND me.gender = 'non-binary')
         )
    AND  (
           -- No GPS/radius supplied by the caller → no location filter at all
           p_lat IS NULL
        OR p_lng IS NULL
        OR p_radius_km IS NULL
        -- Caller has GPS: require the other profile to also have a location
        -- AND be within the requested radius
        OR (
             p.lat IS NOT NULL
             AND p.lng IS NOT NULL
             AND (
               6371.0 * 2.0 * asin(sqrt(
                 power(sin(radians((p.lat - p_lat) / 2.0)), 2) +
                 cos(radians(p_lat)) * cos(radians(p.lat)) *
                 power(sin(radians((p.lng - p_lng) / 2.0)), 2)
               ))
             ) <= p_radius_km
           )
         )
  ORDER  BY p.updated_at DESC
  LIMIT  50;
$$;
