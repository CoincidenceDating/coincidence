-- ── 021: Fix phone uniqueness check to cover all accounts ─────────────────
-- The original check_phone_available() only queried user_profiles.phone,
-- which is only populated for accounts created after migration 019.
-- Accounts created before 019 have their phone stored only in
-- auth.users.raw_user_meta_data, so they were invisible to the check.
--
-- This migration:
--   1. Replaces check_phone_available() to query BOTH sources.
--   2. Backfills user_profiles.phone from auth.users.raw_user_meta_data
--      for any existing rows that are missing it.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Step 1: Backfill phone into user_profiles from auth metadata ──────────
UPDATE public.user_profiles p
SET phone = u.raw_user_meta_data->>'phone'
FROM auth.users u
WHERE p.user_id = u.id
  AND p.phone IS NULL
  AND u.raw_user_meta_data->>'phone' IS NOT NULL;

-- ── Step 2: Replace the RPC to check both sources ────────────────────────
CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    -- Not in user_profiles (covers accounts created post-019)
    NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE phone = p_phone
    )
    AND
    -- Not in auth.users metadata (covers ALL accounts including pre-019)
    NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE raw_user_meta_data->>'phone' = p_phone
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated;
