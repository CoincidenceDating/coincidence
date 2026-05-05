import type { LocationData, Profile } from "./data";

declare const __HERE_API_KEY__: string;

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

// HERE category IDs for nightlife/food/drink venues
// 200-2000 = Nightlife, 200-2100 = Bar/Pub, 100-1000-0000 = Restaurant,
// 100-1100-0010 = Coffee/Tea, 200-2200 = Adult Entertainment (excluded)
const HERE_VENUE_CATEGORIES = "200-2000,200-2100,100-1000-0000,100-1100-0010";

function hereCategoryToIcon(categories: Array<{ id: string; name: string }> | undefined): string {
  if (!categories?.length) return "sparkles";
  const id = categories[0].id;
  if (id.startsWith("100-1100")) return "coffee"; // café/tea
  if (id.startsWith("200-2100")) return "beer";   // bar/pub
  if (id.startsWith("200-2000")) return "wine";   // nightlife
  return "sparkles";
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

interface HereItem {
  id: string;
  title: string;
  position: { lat: number; lng: number };
  categories?: Array<{ id: string; name: string }>;
  distance?: number;
}

async function hereDiscover(
  endpoint: string,
  params: Record<string, string>,
  allUsers: Profile[],
): Promise<LocationData[]> {
  const apiKey = __HERE_API_KEY__;
  const url = new URL(`https://discover.search.hereapi.com/v1/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HERE API error ${res.status}`);
  const json = await res.json() as { items: HereItem[] };

  const seen = new Set<string>();
  return (json.items ?? [])
    .filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      name: item.title,
      icon: hereCategoryToIcon(item.categories),
      lat: item.position.lat,
      lng: item.position.lng,
      users: assignUsersToVenue(item.title, allUsers),
    }));
}

export async function fetchNearbyVenues(
  lat: number,
  lng: number,
  allUsers: Profile[],
): Promise<LocationData[]> {
  const results = await hereDiscover("browse", {
    at: `${lat},${lng}`,
    categories: HERE_VENUE_CATEGORIES,
    circle: `${lat},${lng};r=2000`,
  }, allUsers);

  if (results.length === 0) throw new Error("No venues found");

  // Sort by distance from user
  return results
    .map((v) => ({ ...v, distMi: haversineDistanceMiles(lat, lng, v.lat ?? 0, v.lng ?? 0) }))
    .sort((a, b) => a.distMi - b.distMi)
    .slice(0, 10)
    .map(({ distMi: _d, ...v }) => v);
}

export async function searchVenuesByName(
  query: string,
  lat: number | null,
  lng: number | null,
  allUsers: Profile[],
): Promise<LocationData[]> {
  if (!query.trim()) return [];

  const params: Record<string, string> = { q: query };
  if (lat != null && lng != null) {
    params.at = `${lat},${lng}`;
  }

  try {
    return await hereDiscover("discover", params, allUsers);
  } catch {
    return [];
  }
}
