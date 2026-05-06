-- ── 020: User reports table ───────────────────────────────────────────────
-- Stores reports submitted by users against other profiles.
-- A report also triggers a block so the reported profile never reappears.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_reports (
  id                   BIGSERIAL PRIMARY KEY,
  reporter_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_profile_id  TEXT NOT NULL,
  reason               TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reporter_id, reported_profile_id)
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports; they cannot read others' reports
DO $$ BEGIN
  CREATE POLICY "reports_insert_own" ON public.user_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "reports_select_own" ON public.user_reports
    FOR SELECT USING (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
