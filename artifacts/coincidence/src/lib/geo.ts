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

// HERE Geocoding & Search — bars, pubs, nightclubs, cafés, restaurants
const HERE_VENUE_CATEGORIES = "200-2000,200-2100,100-1000-0000,100-1100-0010";

// Strict allowlist: primary category must be one of these venue types.
// Excludes take-out only, fast food, grocery, cinemas, event companies, etc.
const PRIMARY_CATEGORY_ALLOWLIST = [
  "200-2000-0011", // Bar or Pub
  "200-2000-0012", // Disco or Night Club
  "200-2100",      // Bar/Pub parent
  "100-1100-0010", // Coffee or Tea House
  "100-1100-0011", // Juice Bar
  "100-1100",      // Coffee/Tea parent
  "100-1000-0000", // Restaurant (general)
  "100-1000-0001", // Casual Dining
  "100-1000-0002", // Fine Dining
  "100-1000-0003", // Food Court
  "100-1000-0004", // Breakfast/Brunch
];

// Sub-categories we explicitly exclude even if parent matched
const PRIMARY_CATEGORY_EXCLUDE = [
  "100-1000-0005", // Fast Food
  "100-1000-0006", // Take Out & Delivery Only
];

function isPrimaryVenueCategory(categories?: Array<{ id: string }>): boolean {
  if (!categories?.length) return false;
  const primary = categories[0].id;
  if (PRIMARY_CATEGORY_EXCLUDE.some((ex) => primary.startsWith(ex))) return false;
  return PRIMARY_CATEGORY_ALLOWLIST.some((allowed) => primary.startsWith(allowed));
}

function hereCategoryToIcon(categories?: Array<{ id: string; name: string }>): string {
  if (!categories?.length) return "sparkles";
  const id = categories[0].id;
  if (id.startsWith("100-1100")) return "coffee";
  if (id === "200-2000-0011" || id.startsWith("200-2100")) return "beer";
  if (id.startsWith("200-2000")) return "wine";
  return "sparkles"; // restaurants
}

function osmAmenityToIcon(amenity: string): string {
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

/* ── HERE Places API ──────────────────────────────────────── */

interface HereItem {
  id: string;
  title: string;
  position: { lat: number; lng: number };
  categories?: Array<{ id: string; name: string }>;
}

async function fetchVenuesFromHere(
  lat: number,
  lng: number,
  allUsers: Profile[],
): Promise<LocationData[]> {
  const apiKey = __HERE_API_KEY__;
  if (!apiKey) throw new Error("HERE_API_KEY not configured");

  // Browse API: https://browse.search.hereapi.com/v1/browse
  const url = new URL("https://browse.search.hereapi.com/v1/browse");
  url.searchParams.set("at", `${lat},${lng}`);
  url.searchParams.set("categories", HERE_VENUE_CATEGORIES);
  url.searchParams.set("radius", "2000");
  url.searchParams.set("limit", "100");
  url.searchParams.set("sortBy", "distance");
  url.searchParams.set("apiKey", apiKey);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    const body = await res.text();
    console.error("[HERE] Browse API error", res.status, body);
    throw new Error(`HERE API ${res.status}: ${body}`);
  }

  const json = await res.json() as { items: HereItem[] };
  const seen = new Set<string>();

  return (json.items ?? [])
    .filter((item) => isPrimaryVenueCategory(item.categories))
    .filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({
      id: item.id,
      name: item.title,
      icon: hereCategoryToIcon(item.categories),
      lat: item.position.lat,
      lng: item.position.lng,
      users: assignUsersToVenue(item.title, allUsers),
    }));
}

/* ── OpenStreetMap fallback ───────────────────────────────── */

async function fetchVenuesFromOSM(
  lat: number,
  lng: number,
  allUsers: Profile[],
): Promise<LocationData[]> {
  const radius = 2000;
  const amenityFilter = "^(bar|pub|cafe|restaurant|nightclub|wine_bar|cocktail_bar)$";
  // Note: OSM uses disused:amenity for permanently closed places — they never match this query
  const query = `[out:json][timeout:15];(node["amenity"~"${amenityFilter}"]["name"](around:${radius},${lat},${lng});way["amenity"~"${amenityFilter}"]["name"](around:${radius},${lat},${lng}););out center;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(14000),
  });

  if (!res.ok) throw new Error("OSM Overpass error");
  const json = await res.json();

  const venues: RealVenue[] = (json.elements as Array<Record<string, unknown>>)
    .filter((el) => (el.tags as Record<string, string> | undefined)?.name)
    .map((el) => {
      const tags = el.tags as Record<string, string>;
      const elLat = typeof el.lat === "number" ? el.lat : (el.center as Record<string, number> | undefined)?.lat;
      const elLng = typeof el.lon === "number" ? el.lon : (el.center as Record<string, number> | undefined)?.lon;
      return { id: String(el.id), name: tags.name, amenity: tags.amenity, lat: elLat!, lng: elLng! };
    })
    .filter((v) => v.lat != null && v.lng != null);

  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    icon: osmAmenityToIcon(v.amenity),
    lat: v.lat,
    lng: v.lng,
    users: assignUsersToVenue(v.name, allUsers),
  }));
}

/* ── Public API ───────────────────────────────────────────── */

export async function fetchNearbyVenues(
  lat: number,
  lng: number,
  allUsers: Profile[],
): Promise<LocationData[]> {
  let venues: LocationData[] = [];

  // Run HERE and OSM in parallel.
  // OSM is the source of truth for closure: permanently closed venues are
  // retagged as disused:amenity in OSM and never appear in its results.
  // Strategy: include all OSM venues + HERE venues whose names also appear in
  // OSM (cross-validated as open). If OSM is empty/fails, fall back to HERE alone.
  const [hereResult, osmResult] = await Promise.allSettled([
    fetchVenuesFromHere(lat, lng, allUsers),
    fetchVenuesFromOSM(lat, lng, allUsers),
  ]);

  const hereVenues = hereResult.status === "fulfilled" ? hereResult.value : [];
  const osmVenues  = osmResult.status  === "fulfilled" ? osmResult.value  : [];

  if (hereResult.status === "rejected") console.warn("[venues] HERE failed:", hereResult.reason);
  if (osmResult.status  === "rejected") console.warn("[venues] OSM failed:",  osmResult.reason);

  console.info(`[venues] HERE=${hereVenues.length} OSM=${osmVenues.length}`);

  if (osmVenues.length > 0) {
    // Normalise names for comparison: lowercase, strip non-alphanumeric
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const osmNames = new Set(osmVenues.map((v) => norm(v.name)));

    // OSM venues first (closure-accurate), then HERE venues confirmed by OSM
    const osmById = new Map(osmVenues.map((v) => [v.id, v]));
    const merged  = [...osmVenues];

    for (const hv of hereVenues) {
      const key = norm(hv.name);
      // Add HERE venue only if OSM also lists it (confirms it's still open)
      // AND it's not a duplicate of an OSM venue we already have
      if (osmNames.has(key) && !osmById.has(hv.id)) {
        // Replace matching OSM entry with the HERE version (better icon/category)
        const osmMatch = osmVenues.find((v) => norm(v.name) === key);
        if (osmMatch) {
          const idx = merged.findIndex((v) => v.id === osmMatch.id);
          if (idx !== -1) merged[idx] = { ...hv, id: osmMatch.id };
        }
      }
    }
    venues = merged;
  } else {
    // OSM unavailable — use HERE on its own
    venues = hereVenues;
  }

  if (venues.length === 0) throw new Error("No venues found nearby");

  // Hard cap: only return venues within 2 km of the user's position.
  // Both APIs request a 2 000 m radius but can return outliers beyond it.
  const MAX_RADIUS_MI = 2000 / 1609.344; // exactly 2 km → ~1.2427 mi

  return venues
    .map((v) => ({ ...v, distMi: haversineDistanceMiles(lat, lng, v.lat ?? 0, v.lng ?? 0) }))
    .filter((v) => v.distMi <= MAX_RADIUS_MI)
    .sort((a, b) => a.distMi - b.distMi)
    .map(({ distMi: _d, ...v }) => v);
}

