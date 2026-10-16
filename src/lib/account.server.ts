/**
 * Server-only Datenzugriff für konto-gebundene Daten.
 * Schreibt ausschließlich mit Service-Role; die Tabellen sind für anon gesperrt.
 */
import type { Station, SavedTrip } from "@/types/station";
import type {
  BudgetInput,
  FuelBudget,
  FuelBudgetData,
  FuelLog,
  FuelLogInput,
  PriceAlert,
  VehicleInput,
  VehicleProfile,
} from "./account-input";

async function admin() {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function upsertProfile(
  clerkUserId: string,
  username: string | null,
  avatarUrl: string | null,
) {
  const db = await admin();
  await db.from("profiles").upsert(
    {
      clerk_user_id: clerkUserId,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" },
  );
}

/** Supabase-Fehler weiterreichen, damit der Client einen fehlgeschlagenen Sync erkennt. */
function check(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export async function listFavorites(clerkUserId: string): Promise<Station[]> {
  const db = await admin();
  const { data, error } = await db
    .from("user_favorites")
    .select("station")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false });
  check(error, "listFavorites");
  return (data ?? []).map((row) => row.station as unknown as Station);
}

export async function addFavorite(clerkUserId: string, station: Station) {
  await addFavorites(clerkUserId, [station]);
}

/** Mehrere Favoriten in einem Upsert (Station-Snapshot wird aktualisiert). */
export async function addFavorites(clerkUserId: string, stations: Station[]) {
  // Doppelte IDs im selben Upsert lässt Postgres nicht zu.
  const unique = [...new Map(stations.map((s) => [s.id, s])).values()];
  if (unique.length === 0) return;
  const db = await admin();
  const { error } = await db.from("user_favorites").upsert(
    unique.map((station) => ({
      clerk_user_id: clerkUserId,
      station_id: station.id,
      station: station as unknown as never,
    })),
    { onConflict: "clerk_user_id,station_id" },
  );
  check(error, "addFavorites");
}

export async function removeFavorite(clerkUserId: string, stationId: string) {
  const db = await admin();
  const { error } = await db
    .from("user_favorites")
    .delete()
    .eq("clerk_user_id", clerkUserId)
    .eq("station_id", stationId);
  check(error, "removeFavorite");
}

export async function listTrips(clerkUserId: string): Promise<SavedTrip[]> {
  const db = await admin();
  const { data, error } = await db
    .from("user_trips")
    .select("trip")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false });
  check(error, "listTrips");
  return (data ?? []).map((row) => row.trip as unknown as SavedTrip);
}

export async function addTrip(clerkUserId: string, trip: SavedTrip) {
  await addTrips(clerkUserId, [trip]);
}

/** Mehrere Trajets in einem Upsert; gleicher Name ersetzt den vorhandenen Eintrag. */
export async function addTrips(clerkUserId: string, trips: SavedTrip[]) {
  const unique = [...new Map(trips.map((t) => [t.name, t])).values()];
  if (unique.length === 0) return;
  const db = await admin();
  const { error } = await db.from("user_trips").upsert(
    unique.map((trip) => ({
      clerk_user_id: clerkUserId,
      name: trip.name,
      trip: trip as unknown as never,
    })),
    { onConflict: "clerk_user_id,name" },
  );
  check(error, "addTrips");
}

export async function removeTrip(clerkUserId: string, tripId: string) {
  const db = await admin();
  const { error } = await db
    .from("user_trips")
    .delete()
    .eq("clerk_user_id", clerkUserId)
    .eq("trip->>id", tripId);
  check(error, "removeTrip");
}

/** Lokale Gast-Daten mit dem Konto vereinigen (Union, keine Löschungen). */
export async function syncLocalAccountData(
  clerkUserId: string,
  input: {
    favorites: Station[];
    trips: SavedTrip[];
    username: string | null;
    avatarUrl: string | null;
  },
) {
  await upsertProfile(clerkUserId, input.username, input.avatarUrl);
  await Promise.all([
    addFavorites(clerkUserId, input.favorites),
    addTrips(clerkUserId, input.trips),
  ]);
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
  input: {
    stationId: string;
    stationName: string;
    fuelType: PriceAlert["fuelType"];
    threshold: number;
  },
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
  await db.from("price_alerts").update({ active }).eq("clerk_user_id", clerkUserId).eq("id", id);
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

// ----- Tankbudget (Feature 0002) -----

type FuelLogRow = {
  id: string;
  filled_at: string;
  station_id: string | null;
  station_name: string | null;
  station_brand: string | null;
  station_place: string | null;
  fuel_type: FuelLog["fuelType"];
  liters: number;
  price_per_liter: number;
};

function toFuelLog(row: FuelLogRow): FuelLog {
  return {
    id: row.id,
    filledAt: row.filled_at,
    station: row.station_id
      ? {
          id: row.station_id,
          name: row.station_name ?? "",
          brand: row.station_brand ?? "",
          place: row.station_place ?? "",
        }
      : null,
    fuelType: row.fuel_type,
    liters: Number(row.liters),
    pricePerLiter: Number(row.price_per_liter),
  };
}

function fuelLogColumns(input: FuelLogInput) {
  return {
    filled_at: new Date(input.filledAt).toISOString(),
    station_id: input.station?.id ?? null,
    station_name: input.station?.name ?? null,
    station_brand: input.station?.brand ?? null,
    station_place: input.station?.place ?? null,
    fuel_type: input.fuelType,
    liters: input.liters,
    price_per_liter: input.pricePerLiter,
  };
}

/** Fahrzeug, Budget und Tankvorgänge ab `since` (neueste zuerst). */
export async function getFuelBudgetData(
  clerkUserId: string,
  since: string,
): Promise<FuelBudgetData> {
  const db = await admin();
  const [vehicle, budget, logs] = await Promise.all([
    db
      .from("vehicle_profiles")
      .select("name, fuel_type, consumption_l_per_100km, tank_capacity_l")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle(),
    db
      .from("fuel_budgets")
      .select("amount_eur, period")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle(),
    db
      .from("fuel_logs")
      .select(
        "id, filled_at, station_id, station_name, station_brand, station_place, fuel_type, liters, price_per_liter",
      )
      .eq("clerk_user_id", clerkUserId)
      .gte("filled_at", new Date(since).toISOString())
      .order("filled_at", { ascending: false })
      .limit(1000),
  ]);
  check(vehicle.error, "getVehicle");
  check(budget.error, "getBudget");
  check(logs.error, "listFuelLogs");

  const v = vehicle.data;
  const b = budget.data;
  return {
    vehicle: v
      ? {
          name: v.name,
          fuelType: v.fuel_type,
          consumption: Number(v.consumption_l_per_100km),
          tankCapacity: Number(v.tank_capacity_l),
        }
      : null,
    budget:
      b && (b.period === "weekly" || b.period === "monthly")
        ? { amount: Number(b.amount_eur), period: b.period }
        : null,
    logs: (logs.data ?? []).map(toFuelLog),
  };
}

export async function upsertVehicle(
  clerkUserId: string,
  input: VehicleInput,
): Promise<VehicleProfile> {
  const db = await admin();
  const name = input.name?.trim() || null;
  const { error } = await db.from("vehicle_profiles").upsert(
    {
      clerk_user_id: clerkUserId,
      name,
      fuel_type: input.fuelType,
      consumption_l_per_100km: input.consumption,
      tank_capacity_l: input.tankCapacity,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" },
  );
  check(error, "upsertVehicle");
  return {
    name,
    fuelType: input.fuelType,
    consumption: input.consumption,
    tankCapacity: input.tankCapacity,
  };
}

export async function upsertBudget(clerkUserId: string, input: BudgetInput): Promise<FuelBudget> {
  const db = await admin();
  const { error } = await db.from("fuel_budgets").upsert(
    {
      clerk_user_id: clerkUserId,
      amount_eur: input.amount,
      period: input.period,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" },
  );
  check(error, "upsertBudget");
  return { amount: input.amount, period: input.period };
}

export async function addFuelLog(clerkUserId: string, input: FuelLogInput): Promise<string> {
  const db = await admin();
  const { data, error } = await db
    .from("fuel_logs")
    .insert({ clerk_user_id: clerkUserId, ...fuelLogColumns(input) })
    .select("id")
    .single();
  check(error, "addFuelLog");
  return data!.id;
}

/** Aktualisiert nur eigene Einträge; false, wenn der Eintrag nicht (mehr) existiert. */
export async function updateFuelLog(
  clerkUserId: string,
  id: string,
  input: FuelLogInput,
): Promise<boolean> {
  const db = await admin();
  const { data, error } = await db
    .from("fuel_logs")
    .update(fuelLogColumns(input))
    .eq("clerk_user_id", clerkUserId)
    .eq("id", id)
    .select("id");
  check(error, "updateFuelLog");
  return (data ?? []).length > 0;
}

export async function deleteFuelLog(clerkUserId: string, id: string) {
  const db = await admin();
  const { error } = await db
    .from("fuel_logs")
    .delete()
    .eq("clerk_user_id", clerkUserId)
    .eq("id", id);
  check(error, "deleteFuelLog");
}
