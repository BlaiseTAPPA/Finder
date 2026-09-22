import { fetchApi } from "./server-fn-client";
import type {
  PriceAlert,
  SaveTripInput,
  SetFavoriteInput,
  SyncInput,
  ToggleAlertInput,
  UpsertAlertInput,
} from "./account-input";
import type { SavedTrip, Station } from "@/types/station";

export interface AccountData {
  favorites: Station[];
  trips: SavedTrip[];
  alerts: PriceAlert[];
}

/** Öffentlicher Clerk-Schlüssel (Publishable Key) für den Browser. */
export async function getClerkPublishableKey(): Promise<string | null> {
  if (typeof import.meta !== "undefined" && import.meta.env?.["VITE_CLERK_PUBLISHABLE_KEY"]) {
    return import.meta.env["VITE_CLERK_PUBLISHABLE_KEY"] as string;
  }
  try {
    const res = await fetch("/api/account/clerk-key");
    if (!res.ok) return null;
    const json = (await res.json()) as { publishableKey: string | null };
    return json.publishableKey;
  } catch {
    return null;
  }
}

export async function getAccount(): Promise<AccountData> {
  return fetchApi<AccountData>("/api/account", undefined, "GET");
}

export async function syncLocalData(args: { data: SyncInput }): Promise<{ ok: true }> {
  return fetchApi<{ ok: true }>("/api/account/sync", args.data);
}

export async function setFavorite(args: { data: SetFavoriteInput }): Promise<{ ok: true }> {
  return fetchApi<{ ok: true }>("/api/account/favorite", args.data);
}

export async function saveTripForUser(args: { data: SaveTripInput }): Promise<{ ok: true }> {
  return fetchApi<{ ok: true }>("/api/account/save-trip", args.data);
}

export async function deleteTripForUser(args: { data: { id: string } }): Promise<{ ok: true }> {
  return fetchApi<{ ok: true }>("/api/account/delete-trip", args.data);
}

export async function saveAlert(args: { data: UpsertAlertInput }): Promise<{ ok: true }> {
  return fetchApi<{ ok: true }>("/api/account/save-alert", args.data);
}

export async function toggleAlert(args: { data: ToggleAlertInput }): Promise<{ ok: true }> {
  return fetchApi<{ ok: true }>("/api/account/toggle-alert", args.data);
}

export async function removeAlert(args: { data: { id: string } }): Promise<{ ok: true }> {
  return fetchApi<{ ok: true }>("/api/account/remove-alert", args.data);
}
