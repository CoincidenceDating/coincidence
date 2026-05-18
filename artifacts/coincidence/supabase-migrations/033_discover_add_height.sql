-- Migration 033: add height to get_discover_profiles return
-- Run once in the Supabase SQL Editor.

DROP FUNCTION IF EXISTS public.get_discover_profiles(TEXT, INT, INT, FLOAT8, FLOAT8, FLOAT8, TEXT[]);

CREATE OR REPLACE FUNCTION public.get_discover_profiles(
  p_looking_for  TEXT,
  p_age_min      INT,
  p_age_max      INT,
  p_lat          FLOAT8  DEFAULT NULL,
  p_lng          FLOAT8  DEFAULT NULL,
  p_radius_km    FLOAT8  DEFAULT NULL,
  p_my_hobbies   TEXT[]  DEFAULT NULL
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
  looking_for  TEXT,
  hobbies      TEXT[],
  height       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    up.user_id::TEXT,
    up.name,
    up.age,
    up.bio,
    COALESCE(up.photos, '{}'::TEXT[]),
    up.gender,
    up.lat,
    up.lng,
    up.looking_for,
    COALESCE(up.hobbies, '{}'::TEXT[]),
    up.height
  FROM user_profiles up
  WHERE
    up.user_id <> v_my_id
    AND up.setup_complete = TRUE
    AND up.age BETWEEN p_age_min AND p_age_max
    AND (
      p_looking_for = 'Everyone'
      OR (p_looking_for = 'Women'      AND up.gender = 'woman')
      OR (p_looking_for = 'Men'        AND up.gender = 'man')
      OR (p_looking_for = 'Non-binary' AND up.gender = 'non-binary')
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_blocked ub
      WHERE ub.user_id = v_my_id AND ub.blocked_profile_id = up.user_id::TEXT
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_blocked ub
      WHERE ub.user_id = up.user_id AND ub.blocked_profile_id = v_my_id::TEXT
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_swiped us
      WHERE us.user_id = v_my_id AND us.profile_id = up.user_id::TEXT
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_matches um
      WHERE um.user_id = v_my_id AND um.profile_id = up.user_id::TEXT
    )
    AND (
      p_lat IS NULL OR p_lng IS NULL OR p_radius_km IS NULL
      OR (
        up.lat IS NOT NULL AND up.lng IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0,
              cos(radians(p_lat)) * cos(radians(up.lat))
              * cos(radians(up.lng) - radians(p_lng))
              + sin(radians(p_lat)) * sin(radians(up.lat))
            )
          )
        ) <= p_radius_km
      )
    )
  ORDER BY
    CASE
      WHEN p_my_hobbies IS NOT NULL AND array_length(p_my_hobbies, 1) > 0
      THEN (
        SELECT COUNT(*)::INT
        FROM unnest(up.hobbies) h
        WHERE h = ANY(p_my_hobbies)
      )
      ELSE 0
    END DESC,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
           AND up.lat IS NOT NULL AND up.lng IS NOT NULL
      THEN 6371 * acos(
        LEAST(1.0,
          cos(radians(p_lat)) * cos(radians(up.lat))
          * cos(radians(up.lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(up.lat))
        )
      )
      ELSE NULL
    END ASC NULLS LAST,
    up.updated_at DESC NULLS LAST;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_discover_profiles(TEXT, INT, INT, FLOAT8, FLOAT8, FLOAT8, TEXT[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_discover_profiles(TEXT, INT, INT, FLOAT8, FLOAT8, FLOAT8, TEXT[]) TO authenticated;
