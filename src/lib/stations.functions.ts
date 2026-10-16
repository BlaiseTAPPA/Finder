import { fetchApi } from "./server-fn-client";
import type { ApiErrorShape, FuelPrices, Station } from "@/types/station";
import type { GeocodeInput, ListInput, PricesInput } from "./tankerkoenig";

export type ListResult =
  { ok: true; stations: Station[]; fetchedAt: number } | { ok: false; error: ApiErrorShape };

export type PricesResult =
  | {
      ok: true;
      updates: Record<string, { isOpen: boolean; prices: FuelPrices }>;
      fetchedAt: number;
    }
  | { ok: false; error: ApiErrorShape };

export type GeocodeResult =
  { ok: true; lat: number; lng: number; label: string } | { ok: false; error: ApiErrorShape };

/** Stationen im Umkreis. */
export async function listStations(args: { data: ListInput }): Promise<ListResult> {
  return fetchApi<ListResult>("/api/stations/list", args.data);
}

/** Preis-Aktualisierung für bereits geladene Stationen. */
export async function refreshPrices(args: { data: PricesInput }): Promise<PricesResult> {
  return fetchApi<PricesResult>("/api/stations/refresh", args.data);
}

/** Ort oder PLZ in Koordinaten auflösen (Nominatim). */
/** Ortsname zur Position (für das Ortsfeld); { ok: false } ohne Treffer. */
export async function reverseGeocodePlace(args: {
  data: { lat: number; lng: number };
}): Promise<{ ok: true; label: string } | { ok: false }> {
  return fetchApi<{ ok: true; label: string } | { ok: false }>(
    "/api/stations/reverse-geocode",
    args.data,
  );
}

export async function geocodePlace(args: { data: GeocodeInput }): Promise<GeocodeResult> {
  return fetchApi<GeocodeResult>("/api/stations/geocode", args.data);
}
