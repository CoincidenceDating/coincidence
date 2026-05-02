-- ── 006: Reciprocal preference filtering ─────────────────────────────────
-- Updates get_discover_profiles so that a profile only appears in your feed
-- if *their* looking_for also includes your gender — not just the other way around.

CREATE OR REPLACE FUNCTION get_discover_profiles(
  p_looking_for TEXT DEFAULT 'Everyone',
  p_age_min     INT  DEFAULT 18,
  p_age_max     INT  DEFAULT 100
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
    -- caller's preference: who do I want to see?
    AND  (
           p_looking_for = 'Everyone'
        OR (p_looking_for = 'Women'      AND p.gender = 'woman')
        OR (p_looking_for = 'Men'        AND p.gender = 'man')
        OR (p_looking_for = 'Non-binary' AND p.gender = 'non-binary')
         )
    -- their preference: would they want to see me?
    AND  (
           p.looking_for = 'Everyone'
        OR (p.looking_for = 'Women'      AND me.gender = 'woman')
        OR (p.looking_for = 'Men'        AND me.gender = 'man')
        OR (p.looking_for = 'Non-binary' AND me.gender = 'non-binary')
         )
  ORDER  BY p.updated_at DESC
  LIMIT  50;
$$;
