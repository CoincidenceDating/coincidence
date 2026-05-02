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

function amenityToIcon(amenity: string): string {
  if (amenity === "cafe") return "coffee";
  if (amenity === "bar") return "wine";
  if (amenity === "pub") return "beer";
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

export async function searchVenuesByName(
  query: string,
  lat: number | null,
  lng: number | null,
  allUsers: Profile[],
): Promise<LocationData[]> {
  if (!query.trim()) return [];
  const safeName = query.replace(/"/g, "").replace(/\\/g, "");
  const nameFilter = `["name"~"${safeName}",i]`;
  const areaFilter = lat != null && lng != null ? `(around:10000,${lat},${lng})` : "";
  const overpassQuery = `[out:json][timeout:14];(node${nameFilter}${areaFilter};way${nameFilter}${areaFilter};);out center 12;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(overpassQuery),
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) return [];
    const json = await res.json();

    const seen = new Set<string>();
    const venues: (RealVenue & { tags: Record<string, string> })[] = (json.elements as Array<Record<string, unknown>>)
      .filter((el) => (el.tags as Record<string, string> | undefined)?.name)
      .map((el) => {
        const tags = el.tags as Record<string, string>;
        const elLat = typeof el.lat === "number" ? el.lat : (el.center as Record<string, number> | undefined)?.lat;
        const elLng = typeof el.lon === "number" ? el.lon : (el.center as Record<string, number> | undefined)?.lon;
        return { id: String(el.id), name: tags.name, amenity: tags.amenity ?? "", lat: elLat!, lng: elLng!, tags };
      })
      .filter((v) => v.lat != null && v.lng != null)
      .filter((v) => {
        const key = v.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const sorted = lat != null && lng != null
      ? venues.map((v) => ({ ...v, distMi: haversineDistanceMiles(lat, lng, v.lat, v.lng) })).sort((a, b) => a.distMi - b.distMi)
      : venues.map((v) => ({ ...v, distMi: 0 }));

    return sorted.slice(0, 12).map((v) => ({
      id: v.id,
      name: v.name,
      icon: amenityToIcon(v.amenity),
      lat: v.lat,
      lng: v.lng,
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
  const radius = 2000;
  const query = `[out:json][timeout:12];(node["amenity"~"^(bar|pub|cafe|restaurant|nightclub)$"]["name"](around:${radius},${lat},${lng});way["amenity"~"^(bar|pub|cafe|restaurant|nightclub)$"]["name"](around:${radius},${lat},${lng}););out center 12;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(14000),
  });

  if (!res.ok) throw new Error("Overpass API error");

  const json = await res.json();

  const venues: RealVenue[] = (json.elements as Array<Record<string, unknown>>)
    .filter((el) => {
      const tags = el.tags as Record<string, string> | undefined;
      return tags?.name;
    })
    .map((el) => {
      const tags = el.tags as Record<string, string>;
      const elLat = typeof el.lat === "number" ? el.lat : (el.center as Record<string, number> | undefined)?.lat;
      const elLng = typeof el.lon === "number" ? el.lon : (el.center as Record<string, number> | undefined)?.lon;
      return { id: String(el.id), name: tags.name, amenity: tags.amenity, lat: elLat!, lng: elLng! };
    })
    .filter((v) => v.lat != null && v.lng != null);

  if (venues.length === 0) throw new Error("No venues found");

  const sorted = venues
    .map((v) => ({ ...v, distMi: haversineDistanceMiles(lat, lng, v.lat, v.lng) }))
    .sort((a, b) => a.distMi - b.distMi)
    .slice(0, 6);

  return sorted.map((v) => ({
    id: v.id,
    name: v.name,
    icon: amenityToIcon(v.amenity),
    lat: v.lat,
    lng: v.lng,
    users: assignUsersToVenue(v.name, allUsers),
  }));
}
