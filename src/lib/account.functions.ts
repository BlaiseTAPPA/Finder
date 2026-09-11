/** Server-Funktionen für konto-gebundene Daten (Favoriten, Trajets, Alarme). */
import { createServerFn } from "@tanstack/react-start";
import { requireClerkAuth } from "./clerk-auth";
import {
  idSchema,
  saveTripSchema,
  setFavoriteSchema,
  syncSchema,
  toggleAlertSchema,
  upsertAlertSchema,
  type PriceAlert,
} from "./account-input";
import type { SavedTrip, Station } from "@/types/station";

/** Öffentlicher Clerk-Schlüssel (Publishable Key) für den Browser. */
export const getClerkPublishableKey = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
    return env["CLERK_PUBLISHABLE_KEY"] ?? null;
  },
);

export interface AccountData {
  favorites: Station[];
  trips: SavedTrip[];
  alerts: PriceAlert[];
}

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }): Promise<AccountData> => {
    const { listAlerts, listFavorites, listTrips, latestPrices } = await import(
      "./account.server"
    );
    const [favorites, trips, alerts] = await Promise.all([
      listFavorites(context.clerkUserId),
      listTrips(context.clerkUserId),
      listAlerts(context.clerkUserId),
    ]);
    const prices = await latestPrices([...new Set(alerts.map((a) => a.stationId))]);
    return {
      favorites,
      trips,
      alerts: alerts.map((a) => ({
        ...a,
        currentPrice: prices[a.stationId]?.[a.fuelType] ?? null,
      })),
    };
  });

/** Einmalige Übernahme lokaler Daten nach der Anmeldung. */
export const syncLocalData = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator((input: unknown) => syncSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { addFavorite, addTrip, upsertProfile } = await import("./account.server");
    await upsertProfile(context.clerkUserId, data.username ?? null, data.avatarUrl ?? null);
    for (const station of data.favorites) {
      await addFavorite(context.clerkUserId, station as unknown as Station);
    }
    for (const trip of data.trips) {
      await addTrip(context.clerkUserId, trip as unknown as SavedTrip);
    }
    return { ok: true };
  });

export const setFavorite = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator((input: unknown) => setFavoriteSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { addFavorite, removeFavorite } = await import("./account.server");
    if (data.favorite) {
      await addFavorite(context.clerkUserId, data.station as unknown as Station);
    } else {
      await removeFavorite(context.clerkUserId, data.station.id);
    }
    return { ok: true };
  });

export const saveTripForUser = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator((input: unknown) => saveTripSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { addTrip } = await import("./account.server");
    await addTrip(context.clerkUserId, data.trip as unknown as SavedTrip);
    return { ok: true };
  });

export const deleteTripForUser = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { removeTrip } = await import("./account.server");
    await removeTrip(context.clerkUserId, data.id);
    return { ok: true };
  });

export const saveAlert = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator((input: unknown) => upsertAlertSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { upsertAlert } = await import("./account.server");
    await upsertAlert(context.clerkUserId, data);
    return { ok: true };
  });

export const toggleAlert = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator((input: unknown) => toggleAlertSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { setAlertActive } = await import("./account.server");
    await setAlertActive(context.clerkUserId, data.id, data.active);
    return { ok: true };
  });

export const removeAlert = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { deleteAlert } = await import("./account.server");
    await deleteAlert(context.clerkUserId, data.id);
    return { ok: true };
  });