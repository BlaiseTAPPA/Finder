/**
 * Server-Funktionen für die Trajet-Suche.
 * Entsprechen den geplanten Endpunkten /api/route und /api/route/stations.
 */
import { createServerFn } from "@tanstack/react-start";
import {
  planRouteInputSchema,
  routeStationsInputSchema,
  suggestInputSchema,
} from "./route-input";
import type { ApiErrorShape, RouteInfo, RouteStation } from "@/types/station";

export type PlanRouteResult =
  | { ok: true; route: RouteInfo }
  | { ok: false; error: ApiErrorShape };

export type RouteStationsResult =
  | { ok: true; route: RouteInfo; stations: RouteStation[]; fetchedAt: number }
  | { ok: false; error: ApiErrorShape };

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
}

function toError(error: unknown, fallback: string): ApiErrorShape {
  if (error && typeof error === "object" && "kind" in error && "message" in error) {
    const kind = (error as { kind: string }).kind;
    const message = String((error as { message: string }).message);
    if (kind === "quota" || kind === "missing-key" || kind === "network") {
      return { kind, message };
    }
    return { kind: "upstream", message };
  }
  console.error(fallback, error);
  return { kind: "upstream", message: fallback };
}

/** POST /api/route – Route zwischen zwei Punkten (gecacht). */
export const planRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => planRouteInputSchema.parse(input))
  .handler(async ({ data }): Promise<PlanRouteResult> => {
    const { planRouteServer } = await import("./route.server");
    try {
      return { ok: true, route: await planRouteServer(data.origin, data.destination) };
    } catch (error) {
      return { ok: false, error: toError(error, "Route konnte nicht berechnet werden.") };
    }
  });

/** GET-Äquivalent zu /api/route/stations – Stationen im Korridor mit Umweg. */
export const routeStations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => routeStationsInputSchema.parse(input))
  .handler(async ({ data }): Promise<RouteStationsResult> => {
    const { planRouteServer, collectRouteStations } = await import("./route.server");
    try {
      const route = await planRouteServer(data.origin, data.destination);
      const stations = await collectRouteStations(route, data.corridorKm, data.fuelType);

      // Gesehene Stationen für die Preishistorie registrieren.
      try {
        const { upsertSeenStations } = await import("./price-history.server");
        await upsertSeenStations(stations.map((entry) => entry.station));
      } catch (error) {
        console.error("upsertSeenStations (route) failed", error);
      }

      return { ok: true, route, stations, fetchedAt: Date.now() };
    } catch (error) {
      return {
        ok: false,
        error: toError(error, "Stationen entlang der Route konnten nicht geladen werden."),
      };
    }
  });

/** Autocomplete für Adressen (Nominatim, auf Deutschland begrenzt). */
export const suggestPlaces = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => suggestInputSchema.parse(input))
  .handler(async ({ data }): Promise<PlaceSuggestion[]> => {
    const { searchPlaces } = await import("./nominatim.server");
    try {
      return await searchPlaces(data.query);
    } catch (error) {
      console.error("suggestPlaces failed", error);
      return [];
    }
  });
