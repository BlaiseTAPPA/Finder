/**
 * Routing-Abstraktion.
 *
 * Ein einziges Interface (`RoutingProvider`) kapselt den Routen-Dienst,
 * damit OSRM später ohne Änderungen am Rest der App gegen GraphHopper
 * oder Mapbox getauscht werden kann.
 *
 * Aktiver Provider: öffentliche OSRM-Instanz (kein Schlüssel, keine Garantie
 * auf Verfügbarkeit – für Produktionslast eine eigene Instanz betreiben).
 */
import type { Coords } from "@/types/station";

export interface RouteResult {
  /** Geometrie der Route als Punktliste (vereinfachte Übersicht). */
  polyline: Coords[];
  distanceKm: number;
  durationMin: number;
}

export type RoutingErrorKind = "network" | "timeout" | "no-route" | "upstream";

export class RoutingError extends Error {
  kind: RoutingErrorKind;
  constructor(kind: RoutingErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "RoutingError";
  }
}

export interface RoutingProvider {
  readonly name: string;
  route(origin: Coords, destination: Coords): Promise<RouteResult>;
}

const TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "Tankstellen-Finder" },
    });
    if (!res.ok) {
      throw new RoutingError("upstream", `Routing-Dienst antwortete mit ${res.status}.`);
    }
    return await res.json();
  } catch (error) {
    if (error instanceof RoutingError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new RoutingError("timeout", "Die Routenberechnung hat zu lange gedauert.");
    }
    throw new RoutingError("network", "Der Routing-Dienst ist nicht erreichbar.");
  } finally {
    clearTimeout(timer);
  }
}

/** Öffentliche OSRM-Instanz (Auto-Profil). */
export const osrmProvider: RoutingProvider = {
  name: "osrm",
  async route(origin, destination) {
    const base =
      process.env["OSRM_BASE_URL"] ?? "https://router.project-osrm.org";
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `${base}/route/v1/driving/${coords}?overview=simplified&geometries=geojson&alternatives=false&steps=false`;

    // Ein einziger Wiederholungsversuch: die öffentliche Instanz antwortet
    // gelegentlich mit einem kurzzeitigen Fehler.
    let json: unknown;
    try {
      json = await fetchJson(url);
    } catch (error) {
      if (error instanceof RoutingError && error.kind === "no-route") throw error;
      json = await fetchJson(url);
    }

    const payload = json as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };

    const route = payload.routes?.[0];
    if (payload.code !== "Ok" || !route?.geometry?.coordinates?.length) {
      throw new RoutingError(
        "no-route",
        "Zwischen Start und Ziel wurde keine Route gefunden.",
      );
    }

    return {
      polyline: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceKm: (route.distance ?? 0) / 1000,
      durationMin: (route.duration ?? 0) / 60,
    };
  },
};

/** Aktiver Provider – hier tauscht man den Dienst aus. */
export function routingProvider(): RoutingProvider {
  return osrmProvider;
}
