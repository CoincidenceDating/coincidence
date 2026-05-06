-- ── 019: Enforce phone uniqueness on user_profiles ────────────────────────
-- Adds a phone column (stored at signup) with a partial UNIQUE index
-- so the same phone number can never be registered to two accounts.
-- Also provides a check_phone_available() RPC callable by anon clients
-- during the signup flow.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Partial unique index: enforces uniqueness only for non-NULL phone values.
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_phone_unique
  ON public.user_profiles(phone)
  WHERE phone IS NOT NULL;

-- ── RPC: check_phone_available ────────────────────────────────────────────
-- Returns TRUE if the phone number is not yet registered, FALSE if taken.
-- SECURITY DEFINER so the anon role can read user_profiles even though
-- RLS only exposes completed profiles by default.
-- Callable before authentication (anon key) and during signup.

CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE phone = p_phone
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated;
