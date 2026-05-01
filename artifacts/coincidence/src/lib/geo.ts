export type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface GeoCoords {
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
  if (miles < 0.2) return `${Math.round(miles * 5280 / 50) * 50} ft`;
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

export function getMockLocationCoords(locationId: string, userLat: number, userLng: number): GeoCoords {
  const h1 = deterministicHash(locationId + "_lat");
  const h2 = deterministicHash(locationId + "_lng");
  // Spread locations within ~0.1–1.8 miles of user
  const latOff = ((h1 % 10000) / 10000 - 0.5) * 0.052;
  const lngOff = ((h2 % 10000) / 10000 - 0.5) * 0.065;
  return { lat: userLat + latOff, lng: userLng + lngOff };
}
