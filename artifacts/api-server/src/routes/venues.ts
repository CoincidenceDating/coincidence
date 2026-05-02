import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY ?? "";
logger.info({ keySet: FSQ_API_KEY.length > 0, keyPrefix: FSQ_API_KEY.slice(0, 4), keyLength: FSQ_API_KEY.length }, "Foursquare key loaded");

const CATEGORY_TO_ICON: Record<string, string> = {
  "13003": "coffee",
  "13035": "beer",
  "13029": "wine",
  "13065": "sparkles",
  "13145": "sparkles",
};

function categoryIcon(categories: Array<{ id: string }> = []): string {
  for (const c of categories) {
    if (CATEGORY_TO_ICON[c.id]) return CATEGORY_TO_ICON[c.id];
    if (c.id.startsWith("1303")) return "sparkles";
  }
  return "sparkles";
}

router.get("/venues/search", async (req, res) => {
  const { q, lat, lng } = req.query as Record<string, string>;
  if (!q || q.trim().length < 2) {
    res.json({ results: [] });
    return;
  }

  if (!FSQ_API_KEY) {
    req.log.error("FOURSQUARE_API_KEY not set");
    res.status(500).json({ error: "Venue search not configured" });
    return;
  }

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
    const fsqRes = await fetch(
      `https://api.foursquare.com/v3/places/search?${params.toString()}`,
      {
        headers: {
          Authorization: FSQ_API_KEY,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!fsqRes.ok) {
      req.log.error({ status: fsqRes.status }, "Foursquare API error");
      res.status(502).json({ error: "Venue search failed" });
      return;
    }

    const json = (await fsqRes.json()) as {
      results: Array<{
        fsq_id: string;
        name: string;
        geocodes?: { main?: { latitude: number; longitude: number } };
        categories?: Array<{ id: string; name: string }>;
        distance?: number;
      }>;
    };

    const results = (json.results ?? []).map((place) => ({
      id: place.fsq_id,
      name: place.name,
      lat: place.geocodes?.main?.latitude ?? null,
      lng: place.geocodes?.main?.longitude ?? null,
      icon: categoryIcon(place.categories ?? []),
      distanceM: place.distance ?? null,
    }));

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Foursquare fetch error");
    res.status(502).json({ error: "Venue search failed" });
  }
});

router.get("/venues/nearby", async (req, res) => {
  const { lat, lng } = req.query as Record<string, string>;
  if (!lat || !lng) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  if (!FSQ_API_KEY) {
    req.log.error("FOURSQUARE_API_KEY not set");
    res.status(500).json({ error: "Venue search not configured" });
    return;
  }

  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    radius: "2000",
    categories: "13003,13029,13035,13065,13145",
    limit: "12",
    sort: "distance",
    fields: "fsq_id,name,geocodes,categories,distance",
  });

  try {
    const fsqRes = await fetch(
      `https://api.foursquare.com/v3/places/search?${params.toString()}`,
      {
        headers: {
          Authorization: FSQ_API_KEY,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!fsqRes.ok) {
      const body = await fsqRes.text().catch(() => "");
      req.log.error({ status: fsqRes.status, body }, "Foursquare nearby API error");
      res.status(502).json({ error: "Nearby venue search failed" });
      return;
    }

    const json = (await fsqRes.json()) as {
      results: Array<{
        fsq_id: string;
        name: string;
        geocodes?: { main?: { latitude: number; longitude: number } };
        categories?: Array<{ id: string; name: string }>;
        distance?: number;
      }>;
    };

    const results = (json.results ?? []).map((place) => ({
      id: place.fsq_id,
      name: place.name,
      lat: place.geocodes?.main?.latitude ?? null,
      lng: place.geocodes?.main?.longitude ?? null,
      icon: categoryIcon(place.categories ?? []),
      distanceM: place.distance ?? null,
    }));

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Foursquare nearby fetch error");
    res.status(502).json({ error: "Nearby venue search failed" });
  }
});

export default router;
