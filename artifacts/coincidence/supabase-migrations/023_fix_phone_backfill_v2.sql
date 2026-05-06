-- ── 023: Phone backfill — skip phones already claimed by another row ────────
-- Scenario:
--   Row A: phone = '+4407...'  (already set by migration 019)
--   Row B: phone = NULL        (duplicate account; same phone in auth metadata)
-- Migration 022 tried to set Row B to '+4407...' → hit unique constraint.
-- Fix: exclude phones that are already stored in user_profiles.
-- ─────────────────────────────────────────────────────────────────────────

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
    -- Skip phones already assigned to another row
    AND u.raw_user_meta_data->>'phone' NOT IN (
      SELECT phone FROM public.user_profiles WHERE phone IS NOT NULL
    )
  ORDER BY u.raw_user_meta_data->>'phone', u.created_at ASC
) sub
WHERE p.user_id = sub.user_id;

-- ── Update the RPC (same dual-source check as 021/022) ───────────────────
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
