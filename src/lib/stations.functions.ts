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
  .validator((input: unknown) => listInputSchema.parse(input))
  .handler(async ({ data }): Promise<ListResult> => {
    try {
      const { fetchStations, TankerkoenigError } = await import(
        "./tankerkoenig.server"
      );

      const stations = await fetchStations(data);

      // Enregistrement asynchrone non-bloquant pour la base de données
      if (stations.length > 0) {
        import("./price-history.server")
          .then(({ upsertSeenStations }) => upsertSeenStations(stations))
          .catch((err) => console.warn("[DB] Enregistrement d'historique ignoré :", err?.message || err));
      }

      return { ok: true, stations, fetchedAt: Date.now() };
    } catch (error: any) {
      if (error?.name === "TankerkoenigError" || error?.kind) {
        return { ok: false, error: { kind: error.kind, message: error.message } };
      }
      console.error("[listStations] Échec de l'appel :", error);
      return {
        ok: false,
        error: { kind: "upstream", message: "Données temporairement indisponibles." },
      };
    }
  });

/** Preis-Aktualisierung für bereits geladene Stationen (Proxy auf prices.php). */
export const refreshPrices = createServerFn({ method: "POST" })
  .validator((input: unknown) => pricesInputSchema.parse(input))
  .handler(async ({ data }): Promise<PricesResult> => {
    try {
      const { fetchPrices } = await import("./tankerkoenig.server");
      const updates = await fetchPrices(data.ids);
      return { ok: true, updates, fetchedAt: Date.now() };
    } catch (error: any) {
      if (error?.name === "TankerkoenigError" || error?.kind) {
        return { ok: false, error: { kind: error.kind, message: error.message } };
      }
      console.error("[refreshPrices] Échec de l'appel :", error);
      return {
        ok: false,
        error: { kind: "upstream", message: "Impossible de mettre à jour les prix." },
      };
    }
  });

/** Ort oder PLZ in Koordinaten auflösen (Nominatim). */
export const geocodePlace = createServerFn({ method: "POST" })
  .validator((input: unknown) => geocodeInputSchema.parse(input))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    try {
      const { geocode } = await import("./tankerkoenig.server");
      const hit = await geocode(data.query);
      if (!hit) {
        return {
          ok: false,
          error: { kind: "upstream", message: "Kein Ort mit diesem Namen gefunden." },
        };
      }
      return { ok: true, ...hit };
    } catch (error: any) {
      if (error?.name === "TankerkoenigError" || error?.kind) {
        return { ok: false, error: { kind: error.kind, message: error.message } };
      }
      console.error("[geocodePlace] Échec du géocodage :", error);
      return {
        ok: false,
        error: { kind: "upstream", message: "Ortssuche fehlgeschlagen." },
      };
    }
  });