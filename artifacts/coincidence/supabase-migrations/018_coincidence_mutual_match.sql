-- Migration 018: update create_mutual_match to accept source / location metadata
-- so coincidence matches carry location context for both users.
-- Also update the function to write location_name and location_icon to the row.

CREATE OR REPLACE FUNCTION create_mutual_match(
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
      (user_id, profile_id, profile_data, source, location_name, location_icon, matched_at, is_undecided)
    VALUES
      (auth.uid(), target_user_id::TEXT, p_profile_data, p_source, p_location_name, p_location_icon, now_ms, FALSE)
    ON CONFLICT (user_id, profile_id, source) DO NOTHING;

    INSERT INTO public.user_matches
      (user_id, profile_id, profile_data, source, location_name, location_icon, matched_at, is_undecided)
    VALUES
      (target_user_id, auth.uid()::TEXT, p_my_profile_data, p_source, p_location_name, p_location_icon, now_ms, FALSE)
    ON CONFLICT (user_id, profile_id, source) DO NOTHING;
  END IF;

  RETURN is_mutual;
END;
$$;
