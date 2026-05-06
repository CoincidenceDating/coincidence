-- ── 022: Fixed phone backfill — handles pre-existing duplicates ────────────
-- Migration 021's UPDATE failed because two accounts already exist with the
-- same phone (the duplicate that slipped through). Using DISTINCT ON to
-- pick only the OLDEST account per phone, leaving the duplicate with NULL.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Step 1: Backfill — one row per phone (oldest account wins) ────────────
UPDATE public.user_profiles p
SET phone = sub.phone
FROM (
  SELECT DISTINCT ON (u.raw_user_meta_data->>'phone')
    p2.user_id,
    u.raw_user_meta_data->>'phone' AS phone
  FROM public.user_profiles p2
  JOIN auth.users u ON p2.user_id = u.id
  WHERE p2.phone IS NULL
    AND u.raw_user_meta_data->>'phone' IS NOT NULL
  ORDER BY u.raw_user_meta_data->>'phone', u.created_at ASC
) sub
WHERE p.user_id = sub.user_id;

-- ── Step 2: Replace the RPC (same as 021) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE phone = p_phone
    )
    AND
    NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE raw_user_meta_data->>'phone' = p_phone
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated;
