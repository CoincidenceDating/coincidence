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
  photos: string[]; gender?: string; hobbies?: string[];
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
    hobbies: raw.hobbies ?? [],
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

/**
 * Fully unmatches two users:
 *  - Deletes BOTH users' match rows (all sources)
 *  - Adds a MUTUAL block so neither sees the other anywhere
 *  - Cleans up swiped rows so no ghost likes remain
 * Returns true on full success (RPC available), false on partial fallback.
 *
 * Fallback (when unmatch_user RPC is not yet deployed):
 *  - Deletes our own match row (RLS allows this)
 *  - Inserts user_blocked row for the other person (triggers their realtime subscription)
 *  - Cannot delete their match row or insert the reverse block without the RPC
 */
export async function unmatch(targetProfileId: string): Promise<boolean> {
  const { error } = await supabase.rpc("unmatch_user", {
    p_target_id: targetProfileId,
  });
  if (!error) return true;

  console.warn("[unmatch] RPC unavailable, using fallback:", error.message);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  await Promise.all([
    // Delete our own match row (RLS allows owner deletes)
    supabase.from("user_matches").delete()
      .eq("user_id", user.id)
      .eq("profile_id", targetProfileId),
    // Block the other person from our side — this INSERT fires their
    // subscribeToUnmatches listener so their UI updates immediately
    supabase.from("user_blocked").upsert(
      { user_id: user.id, blocked_profile_id: targetProfileId },
      { onConflict: "user_id,blocked_profile_id" },
    ),
  ]);
  return false;
}

export async function promoteUndecided(profileId: string, myProfileData: object) {
  await supabase.rpc("promote_and_notify", {
    p_profile_id:      profileId,
    p_my_profile_data: myProfileData,
  });
}

/* ── mutual match RPC ─────────────────────────────────────── */

export async function createMutualMatch(
  targetUserId: string,
  targetProfileData: object,
  myProfileData: object,
  locationId?: string,
  locationName?: string,
  locationIcon?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("create_mutual_match", {
    target_user_id:   targetUserId,
    p_profile_data:   targetProfileData,
    p_my_profile_data: myProfileData,
    p_source:         locationId ?? "swipe",
    p_location_name:  locationName ?? null,
    p_location_icon:  locationIcon ?? null,
  });
  if (error) {
    console.warn("[createMutualMatch] RPC error:", error.message, error);
    return false;
  }
  console.info("[createMutualMatch] result:", data, "for target:", targetUserId);
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

export function subscribeToAllIncomingMessages(
  myId: string,
  onMessage: (senderId: string, msg: Message) => void,
) {
  return supabase
    .channel(`inbox:${myId}:${Date.now()}`)
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
        onMessage(row.sender_id, {
          id: row.id,
          text: row.text,
          from: "them",
          timestamp: new Date(row.created_at).getTime(),
        });
      },
    )
    .subscribe();
}

export interface NewMatchRow {
  profileId: string;
  profileData: object;
  source: string;
  locationName: string | null;
  locationIcon: string | null;
  matchedAt: number;
}

export function subscribeToNewMatches(
  myId: string,
  onMatch: (row: NewMatchRow) => void,
) {
  // Append a timestamp so each call gets a brand-new channel object;
  // Supabase caches channels by name and rejects .on() after .subscribe().
  return supabase
    .channel(`new-matches:${myId}:${Date.now()}`)
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
          source: string;
          location_name: string | null;
          location_icon: string | null;
          matched_at: number;
          is_undecided: boolean;
        };
        if (!row.is_undecided) {
          onMatch({
            profileId:    row.profile_id,
            profileData:  row.profile_data,
            source:       row.source ?? "swipe",
            locationName: row.location_name ?? null,
            locationIcon: row.location_icon ?? null,
            matchedAt:    row.matched_at ?? Date.now(),
          });
        }
      },
    )
    .subscribe();
}

/**
 * Listens for INSERT events on user_blocked where blocked_profile_id = myId.
 * Fires onUnmatch(blockerId) whenever another user unmatch/blocks us.
 *
 * Using INSERT on user_blocked (rather than DELETE on user_matches) means:
 *  - No REPLICA IDENTITY FULL required — INSERT payloads always contain payload.new
 *  - Works the moment the unmatch_user RPC (or fallback path) writes the block row
 */
export function subscribeToUnmatches(
  myId: string,
  onUnmatch: (profileId: string) => void,
) {
  return supabase
    .channel(`unmatches:${myId}:${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_blocked",
        filter: `blocked_profile_id=eq.${myId}`,
      },
      (payload) => {
        const row = payload.new as { user_id?: string };
        if (row.user_id) {
          onUnmatch(row.user_id);
        }
      },
    )
    .subscribe();
}

/**
 * Fetches the single most-recent message for each real-user conversation
 * so the Matches page preview is accurate on first load.
 */
export async function getLastRealMessagePerPartner(
  partnerIds: string[],
): Promise<Record<string, Message>> {
  if (partnerIds.length === 0) return {};
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const myId = user.id;
  const filter = partnerIds
    .map((p) => `and(sender_id.eq.${myId},receiver_id.eq.${p}),and(sender_id.eq.${p},receiver_id.eq.${myId})`)
    .join(",");

  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, text, created_at")
    .or(filter)
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const out: Record<string, Message> = {};
  for (const r of data ?? []) {
    const partnerId = (r.sender_id as string) === myId ? r.receiver_id as string : r.sender_id as string;
    if (!partnerIds.includes(partnerId)) continue;
    if (seen.has(partnerId)) continue;
    seen.add(partnerId);
    out[partnerId] = {
      id: r.id as string,
      text: r.text as string,
      from: (r.sender_id as string) === myId ? "me" : "them",
      timestamp: new Date(r.created_at as string).getTime(),
    };
  }
  return out;
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

export async function reportUser(profileId: string, reason: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_reports").insert({
    reporter_id: user.id,
    reported_profile_id: profileId,
    reason,
  });
  // Always block the reported user so they never appear again
  await addBlocked(profileId);
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

/* ── distance helpers ─────────────────────────────────────── */

function calcDistanceMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDistanceMi(mi: number): string {
  if (mi < 0.1) return "< 0.1 mi away";
  if (mi < 10)  return `${mi.toFixed(1)} mi away`;
  return `${Math.round(mi)} mi away`;
}

/* ── discover real profiles ───────────────────────────────── */

const COINCIDENCE_ACTIVE_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function getDiscoverProfiles(
  lookingFor: string,
  ageMin: number,
  ageMax: number,
  lat?: number | null,
  lng?: number | null,
  radiusMiles?: number | null,
  myHobbies?: string[],
): Promise<import("./data").Profile[]> {
  const radiusKm = radiusMiles != null ? radiusMiles * 1.60934 : null;

  const baseParams = {
    p_looking_for: lookingFor,
    p_age_min:     ageMin,
    p_age_max:     ageMax,
    p_lat:         lat       ?? null,
    p_lng:         lng       ?? null,
    p_radius_km:   radiusKm  ?? null,
  };

  // Try the newer function signature (with p_my_hobbies for server-side ordering).
  // If the migration hasn't been run yet, Supabase returns PGRST202 "function not found"
  // and we fall back to the old signature — client-side sort handles ordering instead.
  let profilesResult = await supabase.rpc("get_discover_profiles", {
    ...baseParams,
    p_my_hobbies: myHobbies && myHobbies.length > 0 ? myHobbies : null,
  });

  if (profilesResult.error?.code === "PGRST202") {
    // Migration 032 not yet applied — retry without the new param
    profilesResult = await supabase.rpc("get_discover_profiles", baseParams);
  }

  if (profilesResult.error) {
    console.warn("[discover] RPC error:", profilesResult.error.message, profilesResult.error);
    return [];
  }

  console.info(
    `[discover] RPC returned ${(profilesResult.data ?? []).length} rows`,
    { lookingFor, ageMin, ageMax, lat, lng, radiusMiles },
  );

  type RpcRow = {
    user_id: string; name: string; age: number; bio: string;
    photos: string[]; gender: string; lat: number | null; lng: number | null;
    looking_for?: string; hobbies?: string[];
  };

  const callerHasRadius = lat != null && lng != null && radiusMiles != null;

  // Secondary client-side distance guard — ensures floating-point edge cases
  // from the SQL haversine don't leak profiles just outside the radius.
  // Profiles without GPS are excluded when the caller has GPS (the RPC already
  // enforces this, but we keep it here as a safety net).
  const filtered: RpcRow[] = (profilesResult.data ?? [])
    .filter((r: RpcRow) => {
      if (!callerHasRadius) return true;
      if (r.lat == null || r.lng == null) return false;
      return calcDistanceMi(lat!, lng!, r.lat, r.lng) <= radiusMiles!;
    });

  const profiles = filtered.map((r: RpcRow) => {
    const profile = buildProfileSnapshot(r);
    if (lat != null && lng != null && r.lat != null && r.lng != null) {
      profile.distance = fmtDistanceMi(calcDistanceMi(lat, lng, r.lat, r.lng));
    }
    return profile;
  });

  // Client-side interest sort: used as a fallback when the DB function hasn't
  // been updated to do server-side ordering (migration 032 not yet run), or
  // when the returned rows already carry hobbies and we want a stable sort.
  if (myHobbies && myHobbies.length > 0) {
    const mySet = new Set(myHobbies.map((h) => h.toLowerCase()));
    profiles.sort((a, b) => {
      const scoreA = (a.hobbies ?? []).filter((h) => mySet.has(h.toLowerCase())).length;
      const scoreB = (b.hobbies ?? []).filter((h) => mySet.has(h.toLowerCase())).length;
      return scoreB - scoreA; // higher shared count first
    });
  }

  return profiles;
}

export async function updateUserLocation(lat: number, lng: number, radiusKm?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const row: Record<string, unknown> = { user_id: user.id, lat, lng, updated_at: new Date().toISOString() };
  if (radiusKm != null) row.discover_radius_km = radiusKm;
  await supabase.from("user_profiles").upsert(row, { onConflict: "user_id" });
}

export async function updateDiscoverRadius(radiusKm: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_profiles")
    .update({ discover_radius_km: radiusKm })
    .eq("user_id", user.id);
}

export async function clearUserLocation() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_profiles")
    .update({ lat: null, lng: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
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

// Subscribes to live user join/leave events for a specific active venue.
// Used by the coincidence swipe deck to add/remove cards in real time.
export function subscribeToVenueUsers(
  venueId: string,
  myId: string,
  onJoin: (profile: import("./data").Profile) => void,
  onLeave: (userId: string) => void,
) {
  return supabase
    .channel(`venue-users:${venueId}:${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_presence",
        filter: `venue_id=eq.${venueId}`,
      },
      (payload) => {
        const row = payload.new as { user_id: string; profile_data: object };
        if (row.user_id !== myId) {
          onJoin(row.profile_data as import("./data").Profile);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "user_presence",
        filter: `venue_id=eq.${venueId}`,
      },
      (payload) => {
        const row = payload.old as { user_id: string };
        if (row.user_id !== myId) {
          onLeave(row.user_id);
        }
      },
    )
    .subscribe();
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

/* ── venue like notifications ─────────────────────────────── */

// Fires whenever someone at the current venue sends the calling user a like.
// Requires migration 025 (realtime on user_swiped + SELECT policy).
export function subscribeToIncomingVenueLikes(
  myId: string,
  isAtVenue: (userId: string) => boolean,
  onLike: () => void,
) {
  return supabase
    .channel(`venue-likes:${myId}:${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_swiped",
        filter: `profile_id=eq.${myId}`,
      },
      (payload) => {
        const row = payload.new as { user_id: string; liked: boolean };
        if (row.liked && isAtVenue(row.user_id)) {
          onLike();
        }
      },
    )
    .subscribe();
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

/* ── clean up stale matches from deleted accounts ─────────── */

export async function cleanStaleMatches(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fetch all match profile_ids for real users (UUID format)
  const { data: rows } = await supabase
    .from("user_matches")
    .select("profile_id")
    .eq("user_id", user.id);

  if (!rows?.length) return;

  const realIds = [...new Set(
    rows.map((r) => r.profile_id as string).filter((id) => UUID_RE.test(id))
  )];
  if (!realIds.length) return;

  // Check which of those UUIDs still have a profile row
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("user_id")
    .in("user_id", realIds);

  const existingSet = new Set((existing ?? []).map((p) => p.user_id as string));
  const staleIds = realIds.filter((id) => !existingSet.has(id));
  if (!staleIds.length) return;

  // Delete matches and undecided rows referencing deleted accounts
  await supabase
    .from("user_matches")
    .delete()
    .eq("user_id", user.id)
    .in("profile_id", staleIds);
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
