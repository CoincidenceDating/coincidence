-- ── 029: REPLICA IDENTITY FULL on user_matches ───────────────────────────────
-- Supabase Realtime DELETE events only carry the primary key by default
-- (REPLICA IDENTITY DEFAULT). To receive the full old row — including
-- profile_id — in the payload so we can update the other user's UI instantly
-- on unmatch, we need REPLICA IDENTITY FULL.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_matches REPLICA IDENTITY FULL;
