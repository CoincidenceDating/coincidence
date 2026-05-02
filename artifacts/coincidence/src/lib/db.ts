import { supabase } from "./supabase";
import type { Match, CheckIn } from "./data";
import type { Message } from "@/pages/chat";

/* ── UUID helper ──────────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function baseProfileId(id: string): string {
  return id.replace(/_b[23]$/, "");
}

export function isRealUserId(id: string): boolean {
  return UUID_RE.test(baseProfileId(id));
}

export async function getBoostedProfileIds(): Promise<string[]> {
  const { data } = await supabase
    .from("user_boosts")
    .select("user_id")
    .gt("until", Date.now());
  return (data ?? []).map((r) => r.user_id as string);
}

/* ── profile ──────────────────────────────────────────────── */

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return data as {
    user_id: string; name: string; age: number; bio: string;
    hometown: string; height: string; hobbies: string[];
    looking_for: string; age_min: number; age_max: number;
    setup_complete: boolean; photos: string[]; gender: string;
  } | null;
}

/* ── photos ───────────────────────────────────────────────── */

export async function uploadPhoto(file: File): Promise<{ url: string | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { url: null, error: "Not logged in" };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("profile-photos").upload(path, file);
  if (error) {
    console.error("[uploadPhoto]", error.message, error);
    return { url: null, error: error.message };
  }
  const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return { url: publicUrl, error: null };
}

export async function savePhotos(photos: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_profiles").upsert(
    { user_id: user.id, photos, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

export async function deletePhoto(url: string, currentPhotos: string[]): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return currentPhotos;
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/profile-photos/");
    if (parts.length >= 2) {
      await supabase.storage.from("profile-photos").remove([decodeURIComponent(parts[1])]);
    }
  } catch {}
  const next = currentPhotos.filter(p => p !== url);
  await savePhotos(next);
  return next;
}

export async function upsertProfile(fields: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_profiles").upsert(
    { user_id: user.id, ...fields, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

/* ── profile snapshot builder ─────────────────────────────── */

const GRADIENTS = [
  "linear-gradient(160deg,#1a1a2e 0%,#2d1b69 100%)",
  "linear-gradient(160deg,#141e30 0%,#243b55 100%)",
  "linear-gradient(160deg,#0f2027 0%,#2c5364 100%)",
  "linear-gradient(160deg,#232526 0%,#414345 100%)",
  "linear-gradient(160deg,#1c1c2e 0%,#3d3d5c 100%)",
  "linear-gradient(160deg,#2c3e50 0%,#4ca1af 100%)",
];

export function buildProfileSnapshot(raw: {
  user_id: string; name: string; age: number; bio: string;
  photos: string[]; gender?: string;
}): import("./data").Profile {
  const initials = raw.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const gradientIdx = raw.user_id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length;
  return {
    id: raw.user_id,
    name: raw.name,
    age: raw.age,
    bio: raw.bio,
    avatar: initials,
    distance: "Nearby",
    gradient: GRADIENTS[gradientIdx],
    gender: (raw.gender ?? "prefer-not-to-say") as import("./data").Gender,
    photo: raw.photos?.[0],
    photos: raw.photos ?? [],
  };
}

/* ── matches ──────────────────────────────────────────────── */

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

/* ── mutual match RPC ─────────────────────────────────────── */

export async function createMutualMatch(
  targetUserId: string,
  targetProfileData: object,
  myProfileData: object,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("create_mutual_match", {
    target_user_id: targetUserId,
    p_profile_data: targetProfileData,
    p_my_profile_data: myProfileData,
  });
  if (error) return false;
  return data === true;
}

/* ── real-time messages ───────────────────────────────────── */

export async function sendRealMessage(receiverId: string, text: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    text,
  });
}

export async function getRealMessages(partnerId: string): Promise<Message[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, text, created_at")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: r.text as string,
    from: (r.sender_id as string) === user.id ? "me" : "them",
    timestamp: new Date(r.created_at as string).getTime(),
  }));
}

export function subscribeToMessages(
  myId: string,
  partnerId: string,
  onMessage: (msg: Message) => void,
) {
  return supabase
    .channel(`chat:${myId}:${partnerId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${myId}`,
      },
      (payload) => {
        const row = payload.new as {
          id: string; text: string; sender_id: string; created_at: string;
        };
        if (row.sender_id === partnerId) {
          onMessage({
            id: row.id,
            text: row.text,
            from: "them",
            timestamp: new Date(row.created_at).getTime(),
          });
        }
      },
    )
    .subscribe();
}

export function subscribeToNewMatches(
  myId: string,
  onMatch: (profileId: string, profileData: object) => void,
) {
  return supabase
    .channel(`new-matches:${myId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_matches",
        filter: `user_id=eq.${myId}`,
      },
      (payload) => {
        const row = payload.new as {
          profile_id: string;
          profile_data: object;
          is_undecided: boolean;
        };
        if (!row.is_undecided) {
          onMatch(row.profile_id, row.profile_data);
        }
      },
    )
    .subscribe();
}

/* ── threads (messages for fake profiles) ────────────────── */

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

/* ── check-ins ────────────────────────────────────────────── */

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

/* ── boost / string credits ───────────────────────────────── */

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

/* ── blocked ──────────────────────────────────────────────── */

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

/* ── swiped ───────────────────────────────────────────────── */

export async function getSwiped(): Promise<string[]> {
  const { data } = await supabase.from("user_swiped").select("profile_id");
  return (data ?? []).map((r) => r.profile_id as string);
}

export async function addSwiped(profileId: string, liked = false) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_swiped").upsert(
    { user_id: user.id, profile_id: profileId, liked },
    { onConflict: "user_id,profile_id" }
  );
}

/* ── discover real profiles ───────────────────────────────── */

export async function getDiscoverProfiles(
  lookingFor: string,
  ageMin: number,
  ageMax: number,
  lat?: number | null,
  lng?: number | null,
  radiusMiles?: number | null,
): Promise<import("./data").Profile[]> {
  const radiusKm = radiusMiles != null ? radiusMiles * 1.60934 : null;
  const { data, error } = await supabase.rpc("get_discover_profiles", {
    p_looking_for: lookingFor,
    p_age_min: ageMin,
    p_age_max: ageMax,
    p_lat:       lat       ?? null,
    p_lng:       lng       ?? null,
    p_radius_km: radiusKm  ?? null,
  });
  if (error) return [];
  return (data ?? []).map((r: {
    user_id: string; name: string; age: number; bio: string;
    photos: string[]; gender: string;
  }) => buildProfileSnapshot(r));
}

export async function updateUserLocation(lat: number, lng: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_profiles").upsert(
    { user_id: user.id, lat, lng, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

export async function checkMutualLike(targetUserId: string): Promise<boolean> {
  const { data } = await supabase.rpc("check_mutual_like", { target_user_id: targetUserId });
  return data === true;
}

/* ── presence ─────────────────────────────────────────────── */

export async function upsertPresence(venueId: string, venueName: string, profileData: object) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_presence").upsert(
    {
      user_id: user.id,
      venue_id: venueId,
      venue_name: venueName,
      profile_data: profileData,
      activated_at: Date.now(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function clearPresence() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_presence").delete().eq("user_id", user.id);
}

const PRESENCE_WINDOW_MS = 10 * 60 * 1000;

export async function getVenuePresenceCounts(venueIds: string[]): Promise<Record<string, number>> {
  if (!venueIds.length) return {};
  const cutoff = Date.now() - PRESENCE_WINDOW_MS;
  const { data } = await supabase
    .from("user_presence")
    .select("venue_id")
    .in("venue_id", venueIds)
    .gt("activated_at", cutoff);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.venue_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export function subscribeToVenuePresence(
  venueIds: string[],
  onChange: (venueId: string, delta: 1 | -1) => void,
) {
  const channel = supabase
    .channel("venue-presence-counts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "user_presence" },
      (payload) => {
        const venueId = (payload.new as { venue_id: string }).venue_id;
        if (venueIds.includes(venueId)) onChange(venueId, 1);
      },
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "user_presence" },
      (payload) => {
        const venueId = (payload.old as { venue_id: string }).venue_id;
        if (venueIds.includes(venueId)) onChange(venueId, -1);
      },
    )
    .subscribe();
  return channel;
}

export async function getActiveUsersAtVenue(venueId: string): Promise<import("./data").Profile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  const { data } = await supabase
    .from("user_presence")
    .select("profile_data")
    .eq("venue_id", venueId)
    .neq("user_id", user.id)
    .gt("activated_at", cutoff);
  return (data ?? []).map((r) => r.profile_data as import("./data").Profile);
}

/* ── who liked me ─────────────────────────────────────────── */

export async function getWhoLikedMeCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_who_liked_me_count");
  if (error) return 0;
  return (data as number) ?? 0;
}

export async function getWhoLikedMe(): Promise<import("./data").Profile[]> {
  const { data, error } = await supabase.rpc("get_who_liked_me");
  if (error) return [];
  return (data ?? []).map((r: {
    user_id: string; name: string; age: number; bio: string;
    photos: string[]; gender: string;
  }) => buildProfileSnapshot(r));
}

export async function hasWhoLikedMeAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_who_liked_me_access");
  if (error) return false;
  return data === true;
}

export async function grantWhoLikedMeAccess(): Promise<void> {
  await supabase.rpc("grant_who_liked_me_access");
}

export async function getWhoLikedMeExpiry(): Promise<number | null> {
  const { data } = await supabase
    .from("who_liked_access")
    .select("expires_at")
    .maybeSingle();
  if (!data?.expires_at) return null;
  const ms = new Date(data.expires_at as string).getTime();
  return ms > Date.now() ? ms : null;
}

/* ── nuke all user data ───────────────────────────────────── */

export async function deleteAllUserData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const uid = user.id;
  const { data: files } = await supabase.storage.from("profile-photos").list(uid);
  if (files && files.length > 0) {
    await supabase.storage.from("profile-photos").remove(files.map(f => `${uid}/${f.name}`));
  }
  await Promise.all([
    supabase.from("messages").delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
    supabase.from("user_profiles").delete().eq("user_id", uid),
    supabase.from("user_matches").delete().eq("user_id", uid),
    supabase.from("user_threads").delete().eq("user_id", uid),
    supabase.from("user_checkins").delete().eq("user_id", uid),
    supabase.from("user_boosts").delete().eq("user_id", uid),
    supabase.from("user_blocked").delete().eq("user_id", uid),
    supabase.from("user_swiped").delete().eq("user_id", uid),
    supabase.from("usernames").delete().eq("user_id", uid),
    supabase.from("user_presence").delete().eq("user_id", uid),
  ]);
  await supabase.rpc("delete_user");
}
