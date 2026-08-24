/**
 * Server-only Datenzugriff für konto-gebundene Daten.
 * Schreibt ausschließlich mit Service-Role; die Tabellen sind für anon gesperrt.
 */
import type { Station, SavedTrip } from "@/types/station";
import type { PriceAlert } from "./account-input";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function upsertProfile(
  clerkUserId: string,
  username: string | null,
  avatarUrl: string | null,
) {
  const db = await admin();
  await db
    .from("profiles")
    .upsert(
      { clerk_user_id: clerkUserId, username, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
      { onConflict: "clerk_user_id" },
    );
}

export async function listFavorites(clerkUserId: string): Promise<Station[]> {
  const db = await admin();
  const { data } = await db
    .from("user_favorites")
    .select("station")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => row.station as unknown as Station);
}

export async function addFavorite(clerkUserId: string, station: Station) {
  const db = await admin();
  await db.from("user_favorites").upsert(
    {
      clerk_user_id: clerkUserId,
      station_id: station.id,
      station: station as unknown as never,
    },
    { onConflict: "clerk_user_id,station_id" },
  );
}

export async function removeFavorite(clerkUserId: string, stationId: string) {
  const db = await admin();
  await db
    .from("user_favorites")
    .delete()
    .eq("clerk_user_id", clerkUserId)
    .eq("station_id", stationId);
}

export async function listTrips(clerkUserId: string): Promise<SavedTrip[]> {
  const db = await admin();
  const { data } = await db
    .from("user_trips")
    .select("trip")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => row.trip as unknown as SavedTrip);
}

export async function addTrip(clerkUserId: string, trip: SavedTrip) {
  const db = await admin();
  await db.from("user_trips").upsert(
    {
      clerk_user_id: clerkUserId,
      name: trip.name,
      trip: trip as unknown as never,
    },
    { onConflict: "clerk_user_id,name" },
  );
}

export async function removeTrip(clerkUserId: string, tripId: string) {
  const db = await admin();
  const { data } = await db
    .from("user_trips")
    .select("id, trip")
    .eq("clerk_user_id", clerkUserId);
  const match = (data ?? []).find(
    (row) => (row.trip as unknown as SavedTrip | null)?.id === tripId,
  );
  if (!match) return;
  await db.from("user_trips").delete().eq("id", match.id);
}

export async function listAlerts(clerkUserId: string): Promise<PriceAlert[]> {
  const db = await admin();
  const { data } = await db
    .from("price_alerts")
    .select("id, station_id, station_name, fuel_type, threshold, active")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    fuelType: row.fuel_type,
    threshold: Number(row.threshold),
    active: row.active,
    currentPrice: null,
  }));
}

export async function upsertAlert(
  clerkUserId: string,
  input: { stationId: string; stationName: string; fuelType: PriceAlert["fuelType"]; threshold: number },
) {
  const db = await admin();
  await db.from("price_alerts").upsert(
    {
      clerk_user_id: clerkUserId,
      station_id: input.stationId,
      station_name: input.stationName,
      fuel_type: input.fuelType,
      threshold: input.threshold,
      active: true,
    },
    { onConflict: "clerk_user_id,station_id,fuel_type" },
  );
}

export async function setAlertActive(clerkUserId: string, id: string, active: boolean) {
  const db = await admin();
  await db
    .from("price_alerts")
    .update({ active })
    .eq("clerk_user_id", clerkUserId)
    .eq("id", id);
}

export async function deleteAlert(clerkUserId: string, id: string) {
  const db = await admin();
  await db.from("price_alerts").delete().eq("clerk_user_id", clerkUserId).eq("id", id);
}

/** Aktuelle Preise der Alarm-Stationen (aus der Preishistorie). */
export async function latestPrices(
  stationIds: string[],
): Promise<Record<string, Partial<Record<PriceAlert["fuelType"], number>>>> {
  if (stationIds.length === 0) return {};
  const db = await admin();
  const { data } = await db
    .from("price_history")
    .select("station_id, fuel_type, price, recorded_at")
    .in("station_id", stationIds)
    .order("recorded_at", { ascending: false })
    .limit(500);
  const out: Record<string, Partial<Record<PriceAlert["fuelType"], number>>> = {};
  for (const row of data ?? []) {
    const entry = (out[row.station_id] ??= {});
    if (entry[row.fuel_type] === undefined) entry[row.fuel_type] = Number(row.price);
  }
  return out;
}
