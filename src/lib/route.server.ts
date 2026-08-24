/**
 * Server-only Logik für Routen: OSRM-Aufruf mit Cache und
 * Sammeln der Tankstellen im Korridor entlang der Strecke.
 */
import { boundsOf, distanceToPolylineKm, samplePolyline } from "./geo";
import { detourScore, estimateDetour, medianPrice } from "./route-score";
import { routingProvider, RoutingError } from "./routing";
import type { Coords, FuelType, RouteInfo, RouteStation, Station } from "@/types/station";

const cache = new Map<string, { value: unknown; expires: number }>();

function readCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function writeCache(key: string, value: unknown, ttlMs: number) {
  if (cache.size > 100) cache.clear();
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

const round = (value: number) => value.toFixed(4);

/** Route berechnen; identische Endpunkte liefern eine Stunde lang das Cache-Ergebnis. */
export async function planRouteServer(
  origin: Coords,
  destination: Coords,
): Promise<RouteInfo> {
  const key = `route:${round(origin.lat)},${round(origin.lng)}->${round(destination.lat)},${round(destination.lng)}`;
  const cached = readCache<RouteInfo>(key);
  if (cached) return cached;

  const route = await routingProvider().route(origin, destination);
  const value: RouteInfo = {
    polyline: route.polyline,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
  };
  writeCache(key, value, 60 * 60 * 1000);
  return value;
}

export { RoutingError };

/** Maximale Anzahl list.php-Aufrufe pro Trajet (Quota-Schutz). */
const MAX_PROBES = 12;

/**
 * Stationen entlang der Route einsammeln.
 * Die Polylinie wird abgetastet; um jeden Abtastpunkt läuft eine Umkreissuche.
 */
export async function collectRouteStations(
  route: RouteInfo,
  corridorKm: number,
  fuel: FuelType,
): Promise<RouteStation[]> {
  const { fetchStations } = await import("./tankerkoenig.server");

  const searchRadius = Math.min(25, Math.max(corridorKm + 4, 5));
  // Abtastschritt so wählen, dass sich die Suchkreise überlappen …
  let stepKm = searchRadius * 1.4;
  let probes = samplePolyline(route.polyline, stepKm);
  // … aber nie mehr als MAX_PROBES Aufrufe erzeugen.
  if (probes.length > MAX_PROBES) {
    stepKm = Math.max(stepKm, route.distanceKm / MAX_PROBES);
    probes = samplePolyline(route.polyline, stepKm).slice(0, MAX_PROBES);
  }

  const unique = new Map<string, Station>();
  const results = await Promise.allSettled(
    probes.map((point) =>
      fetchStations({ lat: point.lat, lng: point.lng, radius: searchRadius }),
    ),
  );
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const station of result.value) {
      if (!unique.has(station.id)) unique.set(station.id, station);
    }
  }
  // Wenn alle Abfragen scheitern, den Fehler nach oben reichen.
  if (unique.size === 0 && results.every((r) => r.status === "rejected")) {
    const first = results[0];
    if (first && first.status === "rejected") throw first.reason;
  }

  const inCorridor: Array<{ station: Station; corridorKm: number }> = [];
  for (const station of unique.values()) {
    const { km } = distanceToPolylineKm(
      { lat: station.lat, lng: station.lng },
      route.polyline,
    );
    if (km <= corridorKm) inCorridor.push({ station, corridorKm: km });
  }

  const reference = medianPrice(inCorridor.map((e) => e.station.prices[fuel]));

  return inCorridor.map(({ station, corridorKm: distance }) => {
    const detour = estimateDetour(distance);
    return {
      // `dist` bezeichnet in der Trajet-Ansicht den Abstand zur Route.
      station: { ...station, dist: distance },
      corridorKm: distance,
      detourKm: detour.detourKm,
      detourMin: detour.detourMin,
      score: detourScore(station.prices[fuel], reference, detour),
    };
  });
}

export { boundsOf };
