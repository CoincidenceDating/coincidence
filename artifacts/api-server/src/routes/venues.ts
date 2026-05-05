import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY ?? "";
logger.info(
  { keySet: FSQ_API_KEY.length > 0, keyPrefix: FSQ_API_KEY.slice(0, 4), keyLength: FSQ_API_KEY.length },
  "Foursquare key loaded",
);

function categoryIcon(categories: Array<{ id: string }> = []): string {
  for (const c of categories) {
    if (c.id === "13003") return "coffee";
    if (c.id === "13035") return "beer";
    if (c.id === "13029") return "wine";
    if (c.id.startsWith("130")) return "sparkles";
  }
  return "sparkles";
}

interface FsqPlace {
  fsq_id: string;
  name: string;
  geocodes?: { main?: { latitude: number; longitude: number } };
  categories?: Array<{ id: string; name: string }>;
  distance?: number;
}

async function fsqFetch(path: string): Promise<Response> {
  return fetch(`https://api.foursquare.com/v3${path}`, {
    headers: { Authorization: FSQ_API_KEY, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
}

router.get("/venues/search", async (req, res) => {
  const { q, lat, lng } = req.query as Record<string, string>;
  if (!q || q.trim().length < 2) { res.json({ results: [] }); return; }
  if (!FSQ_API_KEY) { res.status(500).json({ error: "Venue search not configured" }); return; }

  const params = new URLSearchParams({
    query: q.trim(),
    limit: "12",
    fields: "fsq_id,name,geocodes,categories,distance",
  });
  if (lat && lng) {
    params.set("ll", `${lat},${lng}`);
    params.set("radius", "10000");
    params.set("sort", "distance");
  }

  try {
    const fsqRes = await fsqFetch(`/places/search?${params}`);
    if (!fsqRes.ok) {
      const body = await fsqRes.text().catch(() => "");
      req.log.error({ status: fsqRes.status, body }, "Foursquare search error");
      res.status(502).json({ error: "Venue search failed" });
      return;
    }
    const json = (await fsqRes.json()) as { results: FsqPlace[] };
    res.json({
      results: (json.results ?? [])
        .filter((p) => p.geocodes?.main)
        .map((p) => ({
          id: p.fsq_id,
          name: p.name,
          lat: p.geocodes!.main!.latitude,
          lng: p.geocodes!.main!.longitude,
          icon: categoryIcon(p.categories),
          distanceM: p.distance ?? null,
        })),
    });
  } catch (err) {
    req.log.error({ err }, "Foursquare search fetch error");
    res.status(502).json({ error: "Venue search failed" });
  }
});

router.get("/venues/nearby", async (req, res) => {
  const { lat, lng } = req.query as Record<string, string>;
  if (!lat || !lng) { res.status(400).json({ error: "lat and lng required" }); return; }
  if (!FSQ_API_KEY) { res.status(500).json({ error: "Venue search not configured" }); return; }

  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    radius: "2000",
    categories: "13003,13029,13035,13065,13145",
    limit: "12",
    sort: "distance",
    fields: "fsq_id,name,geocodes,categories,distance",
  });

  try {
    const fsqRes = await fsqFetch(`/places/search?${params}`);
    if (!fsqRes.ok) {
      const body = await fsqRes.text().catch(() => "");
      req.log.error({ status: fsqRes.status, body }, "Foursquare nearby error");
      res.status(502).json({ error: "Nearby search failed" });
      return;
    }
    const json = (await fsqRes.json()) as { results: FsqPlace[] };
    res.json({
      results: (json.results ?? [])
        .filter((p) => p.geocodes?.main)
        .map((p) => ({
          id: p.fsq_id,
          name: p.name,
          lat: p.geocodes!.main!.latitude,
          lng: p.geocodes!.main!.longitude,
          icon: categoryIcon(p.categories),
          distanceM: p.distance ?? null,
        })),
    });
  } catch (err) {
    req.log.error({ err }, "Foursquare nearby fetch error");
    res.status(502).json({ error: "Nearby search failed" });
  }
});

export default router;
