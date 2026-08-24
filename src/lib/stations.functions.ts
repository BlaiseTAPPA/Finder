/**
 * Server-Funktionen als Proxy zur Tankerkönig-API.
 * Der API-Schlüssel wird ausschließlich serverseitig gelesen.
 */
import { createServerFn } from "@tanstack/react-start";
import {
  geocodeInputSchema,
  listInputSchema,
  pricesInputSchema,
} from "./tankerkoenig";
import type { ApiErrorShape, FuelPrices, Station } from "@/types/station";

export type ListResult =
  | { ok: true; stations: Station[]; fetchedAt: number }
  | { ok: false; error: ApiErrorShape };

export type PricesResult =
  | {
      ok: true;
      updates: Record<string, { isOpen: boolean; prices: FuelPrices }>;
      fetchedAt: number;
    }
  | { ok: false; error: ApiErrorShape };

export type GeocodeResult =
  | { ok: true; lat: number; lng: number; label: string }
  | { ok: false; error: ApiErrorShape };

/** Stationen im Umkreis (Proxy auf list.php, serverseitig gecacht). */
export const listStations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listInputSchema.parse(input))
  .handler(async ({ data }): Promise<ListResult> => {
    const { fetchStations, TankerkoenigError } = await import(
      "./tankerkoenig.server"
    );
    try {
      const stations = await fetchStations(data);
      // Gesehene Stationen registrieren – Grundlage für die Preishistorie.
      try {
        const { upsertSeenStations } = await import("./price-history.server");
        await upsertSeenStations(stations);
      } catch (error) {
        console.error("upsertSeenStations failed", error);
      }
      return { ok: true, stations, fetchedAt: Date.now() };

    } catch (error) {
      if (error instanceof TankerkoenigError) {
        return { ok: false, error: { kind: error.kind, message: error.message } };
      }
      console.error("listStations failed", error);
      return {
        ok: false,
        error: { kind: "upstream", message: "Daten konnten nicht geladen werden." },
      };
    }
  });

/** Preis-Aktualisierung für bereits geladene Stationen (Proxy auf prices.php). */
export const refreshPrices = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => pricesInputSchema.parse(input))
  .handler(async ({ data }): Promise<PricesResult> => {
    const { fetchPrices, TankerkoenigError } = await import("./tankerkoenig.server");
    try {
      const updates = await fetchPrices(data.ids);
      return { ok: true, updates, fetchedAt: Date.now() };
    } catch (error) {
      if (error instanceof TankerkoenigError) {
        return { ok: false, error: { kind: error.kind, message: error.message } };
      }
      console.error("refreshPrices failed", error);
      return {
        ok: false,
        error: { kind: "upstream", message: "Preise konnten nicht aktualisiert werden." },
      };
    }
  });

/** Ort oder PLZ in Koordinaten auflösen (Nominatim). */
export const geocodePlace = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => geocodeInputSchema.parse(input))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    const { geocode, TankerkoenigError } = await import("./tankerkoenig.server");
    try {
      const hit = await geocode(data.query);
      if (!hit) {
        return {
          ok: false,
          error: { kind: "upstream", message: "Kein Ort mit diesem Namen gefunden." },
        };
      }
      return { ok: true, ...hit };
    } catch (error) {
      if (error instanceof TankerkoenigError) {
        return { ok: false, error: { kind: error.kind, message: error.message } };
      }
      console.error("geocodePlace failed", error);
      return {
        ok: false,
        error: { kind: "upstream", message: "Ortssuche fehlgeschlagen." },
      };
    }
  });
