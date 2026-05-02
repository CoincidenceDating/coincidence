-- ── messages table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_receiver_created ON messages (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_created   ON messages (sender_id,   created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "messages_participants" ON messages
    FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── enable realtime on messages and user_matches ───────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_matches;

-- ── mutual match RPC (SECURITY DEFINER so it can write to both users) ──────
CREATE OR REPLACE FUNCTION create_mutual_match(
  target_user_id   UUID,
  p_profile_data   JSONB,
  p_my_profile_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_mutual BOOLEAN;
  now_ms    BIGINT;
BEGIN
  now_ms := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

  -- Check whether the target already liked the caller
  SELECT EXISTS (
    SELECT 1 FROM user_swiped
    WHERE user_id   = target_user_id
      AND profile_id = auth.uid()::TEXT
      AND liked      = TRUE
  ) INTO is_mutual;

  IF is_mutual THEN
    -- Match row for the caller (sees target's profile)
    INSERT INTO user_matches
      (user_id, profile_id, profile_data, source, matched_at, is_undecided)
    VALUES
      (auth.uid(), target_user_id::TEXT, p_profile_data, 'swipe', now_ms, FALSE)
    ON CONFLICT (user_id, profile_id, source) DO NOTHING;

    -- Match row for the target (sees caller's profile) — triggers Realtime for them
    INSERT INTO user_matches
      (user_id, profile_id, profile_data, source, matched_at, is_undecided)
    VALUES
      (target_user_id, auth.uid()::TEXT, p_my_profile_data, 'swipe', now_ms, FALSE)
    ON CONFLICT (user_id, profile_id, source) DO NOTHING;
  END IF;

  RETURN is_mutual;
END;
$$;
