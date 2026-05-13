-- Migration 001: user_boosts, who_liked_access, and who-liked-me RPC functions
-- Run this in your Supabase SQL editor:
-- https://supabase.com/dashboard/project/gbxwmvarpxvhrtjhrdkn/sql/new

-- ─── user_boosts ──────────────────────────────────────────────────────────────
-- Stores string/boost credits per user.
CREATE TABLE IF NOT EXISTS public.user_boosts (
  user_id  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits  integer      NOT NULL DEFAULT 0,
  until    bigint,          -- active boost expiry (unix ms), NULL = not boosting
  radius   integer      NOT NULL DEFAULT 5
);

ALTER TABLE public.user_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own boosts"   ON public.user_boosts;
DROP POLICY IF EXISTS "Users can upsert own boosts" ON public.user_boosts;

CREATE POLICY "Users can read own boosts"
  ON public.user_boosts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own boosts"
  ON public.user_boosts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── who_liked_access ─────────────────────────────────────────────────────────
-- Tracks 24-hour paid access to the "who liked me" feature per user.
CREATE TABLE IF NOT EXISTS public.who_liked_access (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.who_liked_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own access"   ON public.who_liked_access;
DROP POLICY IF EXISTS "Users can upsert own access" ON public.who_liked_access;

CREATE POLICY "Users can read own access"
  ON public.who_liked_access FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own access"
  ON public.who_liked_access FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── RPC: has_who_liked_me_access ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_who_liked_me_access()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.who_liked_access
    WHERE user_id = auth.uid()
      AND expires_at > now()
  );
$$;


-- ─── RPC: grant_who_liked_me_access ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_who_liked_me_access()
RETURNS void
LANGUAGE sql SECURITY DEFINER
AS $$
  INSERT INTO public.who_liked_access (user_id, expires_at)
  VALUES (auth.uid(), now() + interval '24 hours')
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at = GREATEST(who_liked_access.expires_at, now()) + interval '24 hours';
$$;


-- ─── RPC: get_who_liked_me_count ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_who_liked_me_count()
RETURNS integer
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_swiped us
  WHERE us.profile_id = auth.uid()
    AND us.liked = true;
$$;


-- ─── RPC: get_who_liked_me ────────────────────────────────────────────────────
-- Returns profile snapshots of users who liked the current user.
-- Only callable when the user has active who_liked_access.
CREATE OR REPLACE FUNCTION public.get_who_liked_me()
RETURNS TABLE (
  user_id  uuid,
  name     text,
  age      integer,
  bio      text,
  photos   text[],
  gender   text
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    up.user_id,
    up.name,
    up.age,
    up.bio,
    up.photos,
    up.gender
  FROM public.user_swiped us
  JOIN public.user_profiles up ON up.user_id = us.user_id
  WHERE us.profile_id = auth.uid()
    AND us.liked = true
  ORDER BY us.created_at DESC NULLS LAST;
$$;
