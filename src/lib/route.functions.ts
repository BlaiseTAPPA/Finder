import { fetchApi } from "./server-fn-client";
import type { ApiErrorShape, RouteInfo, RouteStation } from "@/types/station";
import type { PlanRouteInput, RouteStationsInput, SuggestInput } from "./route-input";

export type PlanRouteResult = { ok: true; route: RouteInfo } | { ok: false; error: ApiErrorShape };

export type RouteStationsResult =
  | { ok: true; route: RouteInfo; stations: RouteStation[]; fetchedAt: number }
  | { ok: false; error: ApiErrorShape };

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
}

/** Route zwischen zwei Punkten. */
export async function planRoute(args: { data: PlanRouteInput }): Promise<PlanRouteResult> {
  return fetchApi<PlanRouteResult>("/api/routes/plan", args.data);
}

/** Stationen im Korridor mit Umweg. */
export async function routeStations(args: {
  data: RouteStationsInput;
}): Promise<RouteStationsResult> {
  return fetchApi<RouteStationsResult>("/api/routes/stations", args.data);
}

/** Autocomplete für Adressen. */
export async function suggestPlaces(args: { data: SuggestInput }): Promise<PlaceSuggestion[]> {
  return fetchApi<PlaceSuggestion[]>("/api/routes/suggest", args.data);
}
