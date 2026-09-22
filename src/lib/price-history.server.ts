/**
 * Server-only Datenzugriff für Preisverlauf und Stationsregister.
 * Nutzt den Service-Role-Client (Schreibzugriff) und darf niemals
 * aus Komponenten importiert werden.
 */
import type { FuelType, Station } from "@/types/station";
import type { HistoryPoint } from "./trend";

const FUELS: FuelType[] = ["e5", "e10", "diesel"];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Gesehene Stationen registrieren (Grundlage für die Sammlung). */
export async function upsertSeenStations(stations: Station[]): Promise<void> {
  if (stations.length === 0) return;
  try {
    const { isServiceRoleKeyValid } = await import("@/integrations/supabase/client.server");
    if (!isServiceRoleKeyValid()) {
      // Wenn kein passender Service-Role-Schlüssel konfiguriert ist, Upsert überspringen
      return;
    }
    const db = await admin();
    const rows = stations.slice(0, 200).map((s) => ({
      id: s.id,
      name: s.name,
      brand: s.brand,
      street: s.street,
      house_number: s.houseNumber,
      post_code: s.postCode,
      place: s.place,
      lat: s.lat,
      lng: s.lng,
      last_seen_at: new Date().toISOString(),
    }));
    const { error } = await db.from("stations").upsert(rows, { onConflict: "id" });
    if (error) console.warn("[price-history] upsertSeenStations übersprungen:", error.message);
  } catch (err: unknown) {
    console.warn("[price-history] upsertSeenStations Fehler:", (err as Error)?.message || err);
  }
}

/** Verlaufspunkte einer Station für eine Sorte. */
export async function readHistory(
  stationId: string,
  fuel: FuelType,
  days: number,
): Promise<HistoryPoint[]> {
  const db = await admin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("price_history")
    .select("price, recorded_at")
    .eq("station_id", stationId)
    .eq("fuel_type", fuel)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(5000);
  if (error) {
    console.warn("[price-history] readHistory nicht verfügbar:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    t: new Date(row.recorded_at).getTime(),
    price: Number(row.price),
  }));
}

/** Stationen, die zuletzt von Nutzern gesehen wurden (Sammel-Pool). */
export async function collectablePool(limit: number, afterId: string | null): Promise<string[]> {
  const db = await admin();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  let query = db
    .from("stations")
    .select("id")
    .gte("last_seen_at", since)
    .order("id", { ascending: true })
    .limit(limit);
  if (afterId) query = query.gt("id", afterId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

/** Letzter gespeicherter Preis je (Station, Sorte). */
export async function lastKnownPrices(ids: string[]): Promise<Map<string, number>> {
  const db = await admin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("price_history")
    .select("station_id, fuel_type, price, recorded_at")
    .in("station_id", ids)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(20000);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(`${row.station_id}:${row.fuel_type}`, Number(row.price));
  }
  return map;
}

export interface PriceSnapshot {
  stationId: string;
  prices: Record<FuelType, number | null>;
}

/** Nur geänderte Preise schreiben (differenzielles Insert). */
export function diffRows(
  snapshots: PriceSnapshot[],
  known: Map<string, number>,
  recordedAt = new Date(),
) {
  const rows: Array<{
    station_id: string;
    fuel_type: FuelType;
    price: number;
    recorded_at: string;
  }> = [];
  for (const snap of snapshots) {
    for (const fuel of FUELS) {
      const price = snap.prices[fuel];
      if (price === null || !Number.isFinite(price) || price <= 0) continue;
      const previous = known.get(`${snap.stationId}:${fuel}`);
      if (previous !== undefined && Math.abs(previous - price) < 0.0005) continue;
      rows.push({
        station_id: snap.stationId,
        fuel_type: fuel,
        price,
        recorded_at: recordedAt.toISOString(),
      });
    }
  }
  return rows;
}

export async function insertHistoryRows(rows: ReturnType<typeof diffRows>): Promise<number> {
  if (rows.length === 0) return 0;
  const db = await admin();
  const { error } = await db.from("price_history").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export interface CollectorState {
  status: string;
  lease_until: string | null;
  cursor: string | null;
}

/** Single-Flight-Lock: gibt false zurück, wenn bereits ein Lauf aktiv ist. */
export async function acquireLease(
  minutes = 5,
): Promise<{ acquired: boolean; state: CollectorState | null }> {
  const db = await admin();
  const { data: current } = await db
    .from("collector_state")
    .select("status, lease_until, cursor")
    .eq("id", "prices")
    .maybeSingle();

  const state = (current as CollectorState | null) ?? null;
  const leased = state?.lease_until ? new Date(state.lease_until).getTime() : 0;
  if (leased > Date.now()) return { acquired: false, state };

  const { error } = await db
    .from("collector_state")
    .update({
      lease_until: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", "prices");
  if (error) throw new Error(error.message);
  return { acquired: true, state };
}

export async function releaseLease(patch: {
  status: string;
  cursor?: string | null;
  lastError?: string | null;
}): Promise<void> {
  const db = await admin();
  await db
    .from("collector_state")
    .update({
      status: patch.status,
      cursor: patch.cursor ?? null,
      last_error: patch.lastError ?? null,
      lease_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "prices");
}

/** Verlaufspunkte für mehrere Stationen (eine Abfrage statt N). */
export async function readHistoryBulk(
  stationIds: string[],
  fuel: FuelType,
  days: number,
): Promise<Map<string, HistoryPoint[]>> {
  const map = new Map<string, HistoryPoint[]>();
  if (stationIds.length === 0) return map;
  const db = await admin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("price_history")
    .select("station_id, price, recorded_at")
    .in("station_id", stationIds.slice(0, 60))
    .eq("fuel_type", fuel)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(20000);
  if (error) {
    console.warn("[price-history] readHistoryBulk nicht verfügbar:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const list = map.get(row.station_id) ?? [];
    list.push({ t: new Date(row.recorded_at).getTime(), price: Number(row.price) });
    map.set(row.station_id, list);
  }
  return map;
}
