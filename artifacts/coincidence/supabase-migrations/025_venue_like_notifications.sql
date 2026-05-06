-- ── 025: Enable realtime on user_swiped + RLS for incoming-like notifications
-- Coincidence mode shows a nudge banner when someone at the same venue likes
-- the current user. This requires:
--   1. user_swiped to be part of the realtime publication so INSERT events fire
--   2. An RLS SELECT policy so users can subscribe to rows where they're the
--      liked profile (profile_id = auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow users to read rows where they are the liked profile (needed for
-- Supabase realtime row-level filtering on the subscription).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_swiped'
      AND policyname = 'users can view likes targeting them'
  ) THEN
    CREATE POLICY "users can view likes targeting them"
    ON public.user_swiped
    FOR SELECT
    USING (profile_id = auth.uid());
  END IF;
END $$;

-- Add user_swiped to the realtime publication so INSERT events stream to clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_swiped;
