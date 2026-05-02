-- ── 009: Security hardening ───────────────────────────────────────────────
-- Fixes two classes of Supabase security advisories:
--
--  1. All SECURITY DEFINER functions must declare SET search_path = ''
--     to prevent search-path injection attacks.  Table references are
--     updated to use fully-qualified public.* names.
--
--  2. Policies that used the deprecated auth.role() helper are replaced
--     with the recommended auth.uid() IS NOT NULL check.
--
-- Safe to run multiple times (uses CREATE OR REPLACE and DROP IF EXISTS).
-- ─────────────────────────────────────────────────────────────────────────


-- ── 1. delete_user ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


-- ── 2. get_discover_profiles (latest version — includes GPS radius) ────────

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
  JOIN   public.user_profiles me ON me.user_id = auth.uid()
  WHERE  p.user_id != auth.uid()
    AND  p.setup_complete = TRUE
    AND  p.user_id::TEXT NOT IN (
           SELECT profile_id FROM public.user_swiped WHERE user_id = auth.uid()
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


-- ── 3. check_mutual_like ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_mutual_like(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_swiped
    WHERE  user_id    = target_user_id
      AND  profile_id = auth.uid()::TEXT
      AND  liked      = TRUE
  );
$$;


-- ── 4. create_mutual_match ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_mutual_match(
  target_user_id    UUID,
  p_profile_data    JSONB,
  p_my_profile_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_mutual BOOLEAN;
  now_ms    BIGINT;
BEGIN
  now_ms := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

  SELECT EXISTS (
    SELECT 1 FROM public.user_swiped
    WHERE user_id    = target_user_id
      AND profile_id = auth.uid()::TEXT
      AND liked      = TRUE
  ) INTO is_mutual;

  IF is_mutual THEN
    INSERT INTO public.user_matches
      (user_id, profile_id, profile_data, source, matched_at, is_undecided)
    VALUES
      (auth.uid(), target_user_id::TEXT, p_profile_data, 'swipe', now_ms, FALSE)
    ON CONFLICT (user_id, profile_id, source) DO NOTHING;

    INSERT INTO public.user_matches
      (user_id, profile_id, profile_data, source, matched_at, is_undecided)
    VALUES
      (target_user_id, auth.uid()::TEXT, p_my_profile_data, 'swipe', now_ms, FALSE)
    ON CONFLICT (user_id, profile_id, source) DO NOTHING;
  END IF;

  RETURN is_mutual;
END;
$$;


-- ── 5. get_who_liked_me_count ─────────────────────────────────────────────

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
    AND p.setup_complete = true;
$$;


-- ── 6. get_who_liked_me ───────────────────────────────────────────────────

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
  LIMIT 100;
$$;


-- ── 7. has_who_liked_me_access ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION has_who_liked_me_access()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.who_liked_access
    WHERE user_id = auth.uid()
      AND expires_at > now()
  );
$$;


-- ── 8. grant_who_liked_me_access ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION grant_who_liked_me_access()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.who_liked_access (user_id, expires_at)
  VALUES (auth.uid(), now() + interval '24 hours')
  ON CONFLICT (user_id)
  DO UPDATE SET expires_at = now() + interval '24 hours';
$$;


-- ── 9. Fix deprecated auth.role() in policies ─────────────────────────────
-- Replace with auth.uid() IS NOT NULL (equivalent for authenticated users).

-- user_profiles: profiles_read_others
DROP POLICY IF EXISTS "profiles_read_others" ON public.user_profiles;
CREATE POLICY "profiles_read_others" ON public.user_profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND setup_complete = TRUE);

-- user_presence: presence_read_all
DROP POLICY IF EXISTS "presence_read_all" ON public.user_presence;
CREATE POLICY "presence_read_all" ON public.user_presence
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
