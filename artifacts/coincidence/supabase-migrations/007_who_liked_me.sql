-- ── 007: Who Liked Me feature ────────────────────────────────────────────
-- Adds 24-hour paid access windows and RPC helpers for the "who liked you" paywall.

-- Table: track 24-hour access grants per user
CREATE TABLE IF NOT EXISTS who_liked_access (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE who_liked_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own access"
  ON who_liked_access FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function: how many real users have liked me?
CREATE OR REPLACE FUNCTION get_who_liked_me_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_swiped s
  JOIN user_profiles p ON p.user_id = s.user_id
  WHERE s.profile_id = auth.uid()
    AND s.liked = true
    AND p.setup_complete = true;
$$;

-- Function: return the profiles of everyone who liked me
CREATE OR REPLACE FUNCTION get_who_liked_me()
RETURNS SETOF user_profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.*
  FROM user_swiped s
  JOIN user_profiles p ON p.user_id = s.user_id
  WHERE s.profile_id = auth.uid()
    AND s.liked = true
    AND p.setup_complete = true
  ORDER BY s.created_at DESC
  LIMIT 100;
$$;

-- Function: check if current user has active access
CREATE OR REPLACE FUNCTION has_who_liked_me_access()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM who_liked_access
    WHERE user_id = auth.uid()
      AND expires_at > now()
  );
$$;

-- Function: grant 24-hour access (called after successful payment)
CREATE OR REPLACE FUNCTION grant_who_liked_me_access()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO who_liked_access (user_id, expires_at)
  VALUES (auth.uid(), now() + interval '24 hours')
  ON CONFLICT (user_id)
  DO UPDATE SET expires_at = now() + interval '24 hours';
$$;
