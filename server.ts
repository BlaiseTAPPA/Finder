import express, { type Request, type Response, type NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import "./src/lib/env.server";

// Schemas & inputs
import { listInputSchema, pricesInputSchema, geocodeInputSchema } from "./src/lib/tankerkoenig";
import {
  planRouteInputSchema,
  routeStationsInputSchema,
  suggestInputSchema,
} from "./src/lib/route-input";
import { historyInputSchema, trendInputSchema, summariesInputSchema } from "./src/lib/trend-input";
import {
  reportInputSchema,
  confirmInputSchema,
  statusInputSchema,
  statusesInputSchema,
} from "./src/lib/community-input";
import {
  syncSchema,
  setFavoriteSchema,
  saveTripSchema,
  idSchema,
  upsertAlertSchema,
  toggleAlertSchema,
} from "./src/lib/account-input";
import type { Station, SavedTrip } from "./src/types/station";

// Server modules
import {
  fetchStations,
  fetchPrices,
  geocode,
  TankerkoenigError,
} from "./src/lib/tankerkoenig.server";
import {
  upsertSeenStations,
  readHistory,
  readHistoryBulk,
  diffRows,
  insertHistoryRows,
  lastKnownPrices,
  acquireLease,
  releaseLease,
  collectablePool,
} from "./src/lib/price-history.server";
import { planRouteServer, collectRouteStations } from "./src/lib/route.server";
import { searchPlaces } from "./src/lib/nominatim.server";
import { computeTrend } from "./src/lib/trend";
import {
  RATE_LIMITS,
  coarsen,
  containsBlockedWords,
  isNearStation,
  buildStatus,
} from "./src/lib/community";
import {
  overDailyLimit,
  actedRecently,
  insertReport,
  insertConfirmation,
  stationCoords,
  readActivity,
} from "./src/lib/community.server";
import { clerkUserIdFromToken } from "./src/lib/clerk.server";
import {
  listFavorites,
  listTrips,
  listAlerts,
  latestPrices,
  upsertProfile,
  addFavorite,
  removeFavorite,
  addTrip,
  removeTrip,
  upsertAlert,
  setAlertActive,
  deleteAlert,
} from "./src/lib/account.server";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "2mb" }));

// Helper for extracting Clerk user ID
async function getAuthUserId(req: Request): Promise<string | null> {
  const token =
    (req.headers["x-clerk-token"] as string) ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return clerkUserIdFromToken(token);
}

// -------------------------------------------------------------
// STATIONS API
// -------------------------------------------------------------
app.post("/api/stations/list", async (req: Request, res: Response) => {
  try {
    const data = listInputSchema.parse(req.body);
    const stations = await fetchStations(data);

    if (stations.length > 0) {
      upsertSeenStations(stations).catch((err) =>
        console.warn("[DB] Enregistrement d'historique ignoré :", err?.message || err),
      );
    }

    res.json({ ok: true, stations, fetchedAt: Date.now() });
  } catch (error: unknown) {
    const err = error as { name?: string; kind?: string; message?: string } | null;
    if (err?.name === "TankerkoenigError" || err?.kind) {
      res.json({
        ok: false,
        error: { kind: err.kind ?? "upstream", message: err.message ?? "Fehler" },
      });
      return;
    }
    console.error("[listStations] Erreur :", error);
    res.json({
      ok: false,
      error: { kind: "upstream", message: "Données temporairement indisponibles." },
    });
  }
});

app.post("/api/stations/refresh", async (req: Request, res: Response) => {
  try {
    const data = pricesInputSchema.parse(req.body);
    const updates = await fetchPrices(data.ids);
    res.json({ ok: true, updates, fetchedAt: Date.now() });
  } catch (error: unknown) {
    const err = error as { name?: string; kind?: string; message?: string } | null;
    if (err?.name === "TankerkoenigError" || err?.kind) {
      res.json({
        ok: false,
        error: { kind: err.kind ?? "upstream", message: err.message ?? "Fehler" },
      });
      return;
    }
    console.error("[refreshPrices] Erreur :", error);
    res.json({
      ok: false,
      error: { kind: "upstream", message: "Impossible de mettre à jour les prix." },
    });
  }
});

app.post("/api/stations/geocode", async (req: Request, res: Response) => {
  try {
    const data = geocodeInputSchema.parse(req.body);
    const hit = await geocode(data.query);
    if (!hit) {
      res.json({
        ok: false,
        error: { kind: "upstream", message: "Kein Ort mit diesem Namen gefunden." },
      });
      return;
    }
    res.json({ ok: true, ...hit });
  } catch (error: unknown) {
    const err = error as { name?: string; kind?: string; message?: string } | null;
    if (err?.name === "TankerkoenigError" || err?.kind) {
      res.json({
        ok: false,
        error: { kind: err.kind ?? "upstream", message: err.message ?? "Fehler" },
      });
      return;
    }
    console.error("[geocodePlace] Erreur :", error);
    res.json({ ok: false, error: { kind: "upstream", message: "Ortssuche fehlgeschlagen." } });
  }
});

// -------------------------------------------------------------
// ROUTES API
// -------------------------------------------------------------
app.post("/api/routes/plan", async (req: Request, res: Response) => {
  try {
    const data = planRouteInputSchema.parse(req.body);
    const route = await planRouteServer(data.origin, data.destination);
    res.json({ ok: true, route });
  } catch (error: unknown) {
    console.error("[planRoute] Erreur :", error);
    res.json({
      ok: false,
      error: { kind: "upstream", message: "Route konnte nicht berechnet werden." },
    });
  }
});

app.post("/api/routes/stations", async (req: Request, res: Response) => {
  try {
    const data = routeStationsInputSchema.parse(req.body);
    const route = await planRouteServer(data.origin, data.destination);
    const stations = await collectRouteStations(route, data.corridorKm, data.fuelType);

    upsertSeenStations(stations.map((entry) => entry.station)).catch((err) =>
      console.warn("[route] upsertSeenStations übersprungen:", err?.message || err),
    );

    res.json({ ok: true, route, stations, fetchedAt: Date.now() });
  } catch (error: unknown) {
    console.error("[routeStations] Erreur :", error);
    res.json({
      ok: false,
      error: {
        kind: "upstream",
        message: "Stationen entlang der Route konnten nicht geladen werden.",
      },
    });
  }
});

app.post("/api/routes/suggest", async (req: Request, res: Response) => {
  try {
    const data = suggestInputSchema.parse(req.body);
    const suggestions = await searchPlaces(data.query);
    res.json(suggestions);
  } catch (error) {
    console.error("[suggestPlaces] Erreur :", error);
    res.json([]);
  }
});

// -------------------------------------------------------------
// TRENDS API
// -------------------------------------------------------------
app.post("/api/trends/history", async (req: Request, res: Response) => {
  try {
    const data = historyInputSchema.parse(req.body);
    const points = await readHistory(data.stationId, data.fuelType, data.days);
    const avg =
      points.length > 0
        ? Math.round((points.reduce((sum, p) => sum + p.price, 0) / points.length) * 1000) / 1000
        : null;
    res.json({ points, avg, days: data.days });
  } catch (error) {
    console.error("[trends/history] Erreur :", error);
    res.json({ points: [], avg: null, days: req.body?.days ?? 7 });
  }
});

app.post("/api/trends/trend", async (req: Request, res: Response) => {
  try {
    const data = trendInputSchema.parse(req.body);
    const points = await readHistory(data.stationId, data.fuelType, data.days);
    const trend = computeTrend({
      fuel: data.fuelType,
      days: data.days,
      points,
      current: data.current ?? null,
    });
    res.json(trend);
  } catch (error) {
    console.error("[trends/trend] Erreur :", error);
    res.status(500).json({ error: "Fehler beim Berechnen des Trends" });
  }
});

app.post("/api/trends/summaries", async (req: Request, res: Response) => {
  try {
    const data = summariesInputSchema.parse(req.body);
    const ids = data.stations.map((s) => s.id);
    const history = await readHistoryBulk(ids, data.fuelType, 7);

    const summaries = data.stations.map((station) => {
      const trend = computeTrend({
        fuel: data.fuelType,
        days: 7,
        points: history.get(station.id) ?? [],
        current: station.current ?? null,
      });
      return {
        stationId: station.id,
        confident: trend.confident,
        samples: trend.samples,
        percentile: trend.percentile,
        classification: trend.classification,
        recommendation: trend.recommendation,
        min: trend.min,
        max: trend.max,
        avg: trend.avg,
      };
    });

    res.json(summaries);
  } catch (error) {
    console.error("[trends/summaries] Erreur :", error);
    res.json([]);
  }
});

// -------------------------------------------------------------
// COMMUNITY API
// -------------------------------------------------------------
app.post("/api/community/report", async (req: Request, res: Response) => {
  try {
    const data = reportInputSchema.parse(req.body);
    const comment = data.comment?.trim() ?? "";
    if (comment && containsBlockedWords(comment)) {
      res.json({ ok: false, reason: "invalid_input" });
      return;
    }

    if (await overDailyLimit(data.contributorId, RATE_LIMITS.perDay)) {
      res.json({ ok: false, reason: "rate_limited" });
      return;
    }

    if (
      await actedRecently(
        "price_reports",
        data.contributorId,
        data.stationId,
        data.fuelType,
        RATE_LIMITS.perStationFuelHours,
      )
    ) {
      res.json({ ok: false, reason: "rate_limited" });
      return;
    }

    await insertReport({
      station_id: data.stationId,
      fuel_type: data.fuelType,
      contributor_id: data.contributorId,
      reported_price: data.reportedPrice ?? null,
      comment: comment ? comment.slice(0, 200) : null,
      user_lat: typeof data.lat === "number" ? coarsen(data.lat) : null,
      user_lng: typeof data.lng === "number" ? coarsen(data.lng) : null,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("[community/report] Erreur :", error);
    res.json({ ok: false, reason: "unknown" });
  }
});

app.post("/api/community/confirm", async (req: Request, res: Response) => {
  try {
    const data = confirmInputSchema.parse(req.body);
    const coords = await stationCoords(data.stationId);
    if (!coords) {
      res.json({ ok: false, reason: "invalid_input" });
      return;
    }
    if (!isNearStation({ lat: data.lat, lng: data.lng }, coords)) {
      res.json({ ok: false, reason: "too_far" });
      return;
    }
    if (await overDailyLimit(data.contributorId, RATE_LIMITS.perDay)) {
      res.json({ ok: false, reason: "rate_limited" });
      return;
    }
    if (
      await actedRecently(
        "price_confirmations",
        data.contributorId,
        data.stationId,
        data.fuelType,
        RATE_LIMITS.perStationFuelHours,
      )
    ) {
      res.json({ ok: false, reason: "rate_limited" });
      return;
    }

    await insertConfirmation({
      station_id: data.stationId,
      fuel_type: data.fuelType,
      contributor_id: data.contributorId,
      user_lat: coarsen(data.lat),
      user_lng: coarsen(data.lng),
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("[community/confirm] Erreur :", error);
    res.json({ ok: false, reason: "unknown" });
  }
});

app.post("/api/community/status", async (req: Request, res: Response) => {
  try {
    const data = statusInputSchema.parse(req.body);
    const activity = await readActivity([data.stationId], data.fuelType);
    const status = buildStatus(
      data.stationId,
      data.fuelType,
      activity.confirmations.get(data.stationId) ?? [],
      activity.reports.get(data.stationId) ?? [],
    );
    res.json(status);
  } catch (error) {
    console.error("[community/status] Erreur :", error);
    res.status(500).json({ error: "Fehler beim Laden des Status" });
  }
});

app.post("/api/community/statuses", async (req: Request, res: Response) => {
  try {
    const data = statusesInputSchema.parse(req.body);
    const activity = await readActivity(data.stationIds, data.fuelType);
    const statuses = data.stationIds.map((id) =>
      buildStatus(
        id,
        data.fuelType,
        activity.confirmations.get(id) ?? [],
        activity.reports.get(id) ?? [],
      ),
    );
    res.json(statuses);
  } catch (error) {
    console.error("[community/statuses] Erreur :", error);
    res.json([]);
  }
});

// -------------------------------------------------------------
// ACCOUNT API
// -------------------------------------------------------------
app.get("/api/account/clerk-key", (_req: Request, res: Response) => {
  const publishableKey =
    process.env["CLERK_PUBLISHABLE_KEY"] || process.env["VITE_CLERK_PUBLISHABLE_KEY"] || null;
  res.json({ publishableKey });
});

app.get("/api/account", async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [favorites, trips, alerts] = await Promise.all([
      listFavorites(userId),
      listTrips(userId),
      listAlerts(userId),
    ]);
    const prices = await latestPrices([...new Set(alerts.map((a) => a.stationId))]);
    res.json({
      favorites,
      trips,
      alerts: alerts.map((a) => ({
        ...a,
        currentPrice: prices[a.stationId]?.[a.fuelType] ?? null,
      })),
    });
  } catch (error) {
    console.error("[account/get] Erreur :", error);
    res.status(500).json({ error: "Konto-Daten konnten nicht geladen werden" });
  }
});

app.post("/api/account/sync", async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = syncSchema.parse(req.body);
    await upsertProfile(userId, data.username ?? null, data.avatarUrl ?? null);
    for (const station of data.favorites) {
      await addFavorite(userId, station as unknown as Station);
    }
    for (const trip of data.trips) {
      await addTrip(userId, trip as unknown as SavedTrip);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/sync] Erreur :", error);
    res.status(500).json({ error: "Synchronisation fehlgeschlagen" });
  }
});

app.post("/api/account/favorite", async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = setFavoriteSchema.parse(req.body);
    if (data.favorite) {
      await addFavorite(userId, data.station as unknown as Station);
    } else {
      await removeFavorite(userId, data.station.id);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/favorite] Erreur :", error);
    res.status(500).json({ error: "Favorit konnte nicht aktualisiert werden" });
  }
});

app.post("/api/account/save-trip", async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = saveTripSchema.parse(req.body);
    await addTrip(userId, data.trip as unknown as SavedTrip);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/save-trip] Erreur :", error);
    res.status(500).json({ error: "Trajet konnte nicht gespeichert werden" });
  }
});

app.post("/api/account/delete-trip", async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = idSchema.parse(req.body);
    await removeTrip(userId, data.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/delete-trip] Erreur :", error);
    res.status(500).json({ error: "Trajet konnte nicht gelöscht werden" });
  }
});

app.post("/api/account/save-alert", async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = upsertAlertSchema.parse(req.body);
    await upsertAlert(userId, data);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/save-alert] Erreur :", error);
    res.status(500).json({ error: "Preisalarm konnte nicht gespeichert werden" });
  }
});

app.post("/api/account/toggle-alert", async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = toggleAlertSchema.parse(req.body);
    await setAlertActive(userId, data.id, data.active);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/toggle-alert] Erreur :", error);
    res.status(500).json({ error: "Preisalarm konnte nicht umgeschaltet werden" });
  }
});

app.post("/api/account/remove-alert", async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = idSchema.parse(req.body);
    await deleteAlert(userId, data.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/remove-alert] Erreur :", error);
    res.status(500).json({ error: "Preisalarm konnte nicht gelöscht werden" });
  }
});

// -------------------------------------------------------------
// CRON API
// -------------------------------------------------------------
const runPriceCollection = async () => {
  const BATCH_SIZE = 100;
  const MAX_BATCHES = 10;

  const lease = await acquireLease();
  if (!lease.acquired) {
    return { ok: true, skipped: "locked" };
  }

  const paused = lease.state?.status === "paused";
  const maxBatches = paused ? 1 : MAX_BATCHES;
  let cursor = lease.state?.cursor ?? null;
  let inserted = 0;
  let checked = 0;

  try {
    for (let batch = 0; batch < maxBatches; batch++) {
      let ids = await collectablePool(BATCH_SIZE, cursor);
      if (ids.length === 0 && cursor) {
        cursor = null;
        ids = await collectablePool(BATCH_SIZE, null);
      }
      if (ids.length === 0) break;

      const updates = await fetchPrices(ids);
      const snapshots = Object.entries(updates).map(([stationId, entry]) => ({
        stationId,
        prices: entry.prices,
      }));
      const known = await lastKnownPrices(ids);
      inserted += await insertHistoryRows(diffRows(snapshots, known));
      checked += ids.length;
      cursor = ids[ids.length - 1] ?? cursor;
      if (ids.length < BATCH_SIZE) {
        cursor = null;
        break;
      }
    }

    await releaseLease({ status: "idle", cursor });
    return { ok: true, checked, inserted, resumed: paused };
  } catch (error) {
    const quota =
      error instanceof TankerkoenigError &&
      (error.kind === "quota" || error.kind === "missing-key");
    const message = error instanceof Error ? error.message : String(error);
    await releaseLease({
      status: quota ? "paused" : "idle",
      cursor,
      lastError: message,
    });
    return { ok: false, paused: quota, error: message };
  }
};

app.all("/api/public/cron/collect-prices", async (_req: Request, res: Response) => {
  try {
    const result = await runPriceCollection();
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// -------------------------------------------------------------
// FRONTEND SERVING (Vite in Dev, Static in Prod)
// -------------------------------------------------------------
async function startServer() {
  if (process.env["NODE_ENV"] !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env["VERCEL"]) {
  startServer();
}

export { app };
export default app;
