import { supabase } from "./supabase";
import type { Match, CheckIn } from "./data";
import type { Message } from "@/pages/chat";

/* ── profile ──────────────────────────────────────────── */

export async function getProfile() {
  const { data } = await supabase.from("user_profiles").select("*").maybeSingle();
  return data as {
    user_id: string; name: string; age: number; bio: string;
    hometown: string; height: string; hobbies: string[];
    looking_for: string; age_min: number; age_max: number;
    setup_complete: boolean;
  } | null;
}

export async function upsertProfile(fields: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_profiles").upsert(
    { user_id: user.id, ...fields, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

/* ── matches ──────────────────────────────────────────── */

export async function getMatches(isUndecided: boolean): Promise<Match[]> {
  const { data } = await supabase
    .from("user_matches")
    .select("*")
    .eq("is_undecided", isUndecided)
    .order("matched_at", { ascending: true });
  return (data ?? []).map((r) => ({
    profile: r.profile_data as Match["profile"],
    source: r.source as string,
    locationName: r.location_name ?? undefined,
    locationIcon: r.location_icon ?? undefined,
    matchedAt: r.matched_at as number,
    superLike: r.super_like as boolean,
  }));
}

export async function addMatch(match: Match, isUndecided: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_matches").upsert(
    {
      user_id: user.id,
      profile_id: match.profile.id,
      profile_data: match.profile,
      source: match.source,
      location_name: match.locationName ?? null,
      location_icon: match.locationIcon ?? null,
      matched_at: match.matchedAt,
      super_like: match.superLike ?? false,
      is_undecided: isUndecided,
    },
    { onConflict: "user_id,profile_id,source" }
  );
}

export async function removeMatch(profileId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_matches").delete()
    .eq("user_id", user.id)
    .eq("profile_id", profileId);
}

export async function promoteUndecided(profileId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_matches")
    .update({ is_undecided: false })
    .eq("user_id", user.id)
    .eq("profile_id", profileId);
}

/* ── threads (messages) ───────────────────────────────── */

export async function getThreads(): Promise<Record<string, Message[]>> {
  const { data } = await supabase.from("user_threads").select("profile_id, messages");
  const out: Record<string, Message[]> = {};
  for (const row of data ?? []) {
    out[row.profile_id as string] = (row.messages as Message[]) ?? [];
  }
  return out;
}

export async function upsertThread(profileId: string, messages: Message[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_threads").upsert(
    { user_id: user.id, profile_id: profileId, messages, updated_at: new Date().toISOString() },
    { onConflict: "user_id,profile_id" }
  );
}

/* ── check-ins ────────────────────────────────────────── */

export async function getCheckins(): Promise<CheckIn[]> {
  const { data } = await supabase
    .from("user_checkins")
    .select("*")
    .order("checked_in_at", { ascending: true });
  return (data ?? []).map((r) => ({
    locationId: r.location_id as string,
    locationName: r.location_name as string,
    locationIcon: r.location_icon as string,
    checkedInAt: r.checked_in_at as number,
  }));
}

export async function addCheckin(c: CheckIn) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_checkins").upsert(
    {
      user_id: user.id,
      location_id: c.locationId,
      location_name: c.locationName,
      location_icon: c.locationIcon,
      checked_in_at: c.checkedInAt,
    },
    { onConflict: "user_id,location_id" }
  );
}

/* ── boost / string credits ───────────────────────────── */

export async function getBoost(): Promise<{ credits: number; until: number | null; radius: number }> {
  const { data } = await supabase.from("user_boosts").select("*").maybeSingle();
  if (!data) return { credits: 3, until: null, radius: 5 };
  return { credits: data.credits as number, until: data.until as number | null, radius: data.radius as number };
}

export async function upsertBoost(credits: number, until: number | null, radius: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_boosts").upsert(
    { user_id: user.id, credits, until, radius },
    { onConflict: "user_id" }
  );
}

/* ── blocked ──────────────────────────────────────────── */

export async function getBlocked(): Promise<string[]> {
  const { data } = await supabase.from("user_blocked").select("blocked_profile_id");
  return (data ?? []).map((r) => r.blocked_profile_id as string);
}

export async function addBlocked(profileId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_blocked").upsert(
    { user_id: user.id, blocked_profile_id: profileId },
    { onConflict: "user_id,blocked_profile_id" }
  );
}

/* ── swiped ───────────────────────────────────────────── */

export async function getSwiped(): Promise<string[]> {
  const { data } = await supabase.from("user_swiped").select("profile_id");
  return (data ?? []).map((r) => r.profile_id as string);
}

export async function addSwiped(profileId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_swiped").upsert(
    { user_id: user.id, profile_id: profileId },
    { onConflict: "user_id,profile_id" }
  );
}

/* ── nuke all user data ───────────────────────────────── */

export async function deleteAllUserData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const uid = user.id;
  await Promise.all([
    supabase.from("user_profiles").delete().eq("user_id", uid),
    supabase.from("user_matches").delete().eq("user_id", uid),
    supabase.from("user_threads").delete().eq("user_id", uid),
    supabase.from("user_checkins").delete().eq("user_id", uid),
    supabase.from("user_boosts").delete().eq("user_id", uid),
    supabase.from("user_blocked").delete().eq("user_id", uid),
    supabase.from("user_swiped").delete().eq("user_id", uid),
    supabase.from("usernames").delete().eq("user_id", uid),
  ]);
}
