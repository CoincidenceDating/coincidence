import type { LocationData, Profile } from "./data";

export type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";
export type VenueStatus = "idle" | "loading" | "ready" | "error";

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface RealVenue {
  id: string;
  name: string;
  amenity: string;
  lat: number;
  lng: number;
}

export function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function formatDistance(miles: number): string {
  if (miles < 0.05) return "Here now";
  if (miles < 0.2) return `${Math.round((miles * 5280) / 50) * 50} ft`;
  return `${miles.toFixed(1)} mi`;
}

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function assignUsersToVenue(venueName: string, pool: Profile[]): Profile[] {
  const seed = deterministicHash(venueName);
  const count = 2 + (seed % 3);
  const indices = new Set<number>();
  let h = seed;
  while (indices.size < Math.min(count, pool.length)) {
    h = deterministicHash(String(h));
    indices.add(h % pool.length);
  }
  return Array.from(indices).map((i) => pool[i]);
}

interface FsqVenueResult {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  icon: string;
  distanceM: number | null;
}

const API_BASE = "/api";

export async function searchVenuesByName(
  query: string,
  lat: number | null,
  lng: number | null,
  allUsers: Profile[],
): Promise<LocationData[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({ q: query.trim() });
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  try {
    const res = await fetch(`${API_BASE}/venues/search?${params.toString()}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results: FsqVenueResult[] };

    return (json.results ?? [])
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => ({
        id: v.id,
        name: v.name,
        icon: v.icon,
        lat: v.lat!,
        lng: v.lng!,
        users: assignUsersToVenue(v.name, allUsers),
      }));
  } catch {
    return [];
  }
}

export async function fetchNearbyVenues(
  lat: number,
  lng: number,
  allUsers: Profile[],
): Promise<LocationData[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });

  const res = await fetch(`${API_BASE}/venues/nearby?${params.toString()}`, {
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error("Venue search failed");

  const json = (await res.json()) as { results: FsqVenueResult[] };
  const venues = (json.results ?? []).filter((v) => v.lat != null && v.lng != null);

  if (venues.length === 0) throw new Error("No venues found");

  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    icon: v.icon,
    lat: v.lat!,
    lng: v.lng!,
    users: assignUsersToVenue(v.name, allUsers),
  }));
}
