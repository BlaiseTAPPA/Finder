/**
 * Server-only Datenzugriff für Preisverlauf und Stationsregister.
 * Nutzt den Service-Role-Client (Schreibzugriff) und darf niemals
 * aus Komponenten importiert werden.
 */
import type { FuelType, Station } from "@/types/station";
import { berlinParts, type HistoryPoint } from "./trend";
import type { DailyPricePoint, HistoryRange } from "./trend-input";

const FUELS: FuelType[] = ["e5", "e10", "diesel"];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

async function admin() {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Gesehene Stationen registrieren (Grundlage für die Sammlung). */
export async function upsertSeenStations(stations: Station[]): Promise<void> {
  if (stations.length === 0) return;
  try {
    const { isServiceRoleKeyValid } = await import("../integrations/supabase/client.server");
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
    if (error) {
      console.warn("[price-history] upsertSeenStations übersprungen:", error.message);
      return;
    }
    // Preise erst nach dem Stations-Upsert schreiben (Fremdschlüssel).
    await recordSeenPrices(stations.slice(0, 200));
  } catch (err: unknown) {
    console.warn("[price-history] upsertSeenStations Fehler:", (err as Error)?.message || err);
  }
}

/** Pro Instanz: wann eine Station zuletzt aus der Suche gespeichert wurde. */
const recentlyRecorded = new Map<string, number>();
const RECORD_THROTTLE_MS = 10 * MINUTE;
const KNOWN_CHUNK = 20;

/** Jüngster Preis je (Station, Sorte) der letzten 24 Stunden. */
async function latestPrices(ids: string[]): Promise<Map<string, number>> {
  const db = await admin();
  const since = new Date(Date.now() - DAY).toISOString();
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += KNOWN_CHUNK) chunks.push(ids.slice(i, i + KNOWN_CHUNK));
  const results = await Promise.all(
    chunks.map((chunk) =>
      db
        .from("price_history")
        .select("station_id, fuel_type, price")
        .in("station_id", chunk)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: false })
        .limit(1000),
    ),
  );
  const map = new Map<string, number>();
  for (const { data, error } of results) {
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const key = `${row.station_id}:${row.fuel_type}`;
      // Absteigend sortiert: der erste Treffer ist der jüngste.
      if (!map.has(key)) map.set(key, Number(row.price));
    }
  }
  return map;
}

/**
 * Preise aus einer Nutzersuche in den Verlauf übernehmen (differenziell).
 * Fehler werden vom Aufrufer abgefangen und blockieren die Suche nie.
 */
async function recordSeenPrices(stations: Station[]): Promise<void> {
  const now = Date.now();
  const due = stations.filter((s) => {
    const last = recentlyRecorded.get(s.id);
    return (
      (last === undefined || now - last > RECORD_THROTTLE_MS) &&
      FUELS.some((fuel) => s.prices[fuel] !== null)
    );
  });
  if (due.length === 0) return;

  const known = await latestPrices(due.map((s) => s.id));
  const rows = diffRows(
    due.map((s) => ({ stationId: s.id, prices: s.prices })),
    known,
    new Date(now),
  );
  await insertHistoryRows(rows);

  for (const s of due) recentlyRecorded.set(s.id, now);
  if (recentlyRecorded.size > 5000) {
    for (const [id, at] of recentlyRecorded) {
      if (now - at > RECORD_THROTTLE_MS) recentlyRecorded.delete(id);
    }
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

/** Abtastraster für das zeitgewichtete Tagesmittel. */
const SAMPLE_STEP_MS = 10 * MINUTE;
/**
 * Wie lange ein Preis ohne neue Zeile als gültig gilt. Es werden nur
 * Änderungen gespeichert; nach dieser Spanne wird nicht mehr extrapoliert.
 */
const CARRY_FORWARD_MS = 48 * HOUR;

/** Kalendertage (Europe/Berlin) des Zeitraums, aufsteigend, inkl. heute. */
export function rangeDayKeys(rangeDays: number, now = Date.now()): string[] {
  const [y, m, d] = berlinParts(now).day.split("-").map(Number) as [number, number, number];
  const keys: string[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    keys.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
  }
  return keys;
}

/**
 * Verdichtet Änderungspunkte zu einem Wert je Tag (Ortszeit Berlin).
 * Da nur Preisänderungen gespeichert werden, ist ein einfacher Mittelwert
 * der Zeilen verzerrt; stattdessen wird die Treppenfunktion abgetastet
 * (zeitgewichtetes Mittel).
 */
export function aggregateDaily(
  points: HistoryPoint[],
  rangeDays: number,
  now = Date.now(),
): DailyPricePoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const keys = new Set(rangeDayKeys(rangeDays, now));
  const buckets = new Map<string, { sum: number; n: number }>();

  // Etwas früher starten, damit der erste Tag ab Mitternacht abgedeckt ist.
  const start = Math.max(sorted[0]!.t, now - (rangeDays + 1) * DAY);
  let idx = 0;
  for (let t = start; t <= now; t += SAMPLE_STEP_MS) {
    while (idx + 1 < sorted.length && sorted[idx + 1]!.t <= t) idx++;
    const current = sorted[idx]!;
    if (current.t > t || t - current.t > CARRY_FORWARD_MS) continue;
    const { day } = berlinParts(t);
    if (!keys.has(day)) continue;
    const bucket = buckets.get(day) ?? { sum: 0, n: 0 };
    bucket.sum += current.price;
    bucket.n += 1;
    buckets.set(day, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({ date, price: Math.round((b.sum / b.n) * 1000) / 1000 }));
}

const historyCache = new Map<string, { expires: number; value: DailyPricePoint[] }>();
const HISTORY_CACHE_TTL_MS = 5 * MINUTE;
const HISTORY_CACHE_MAX = 500;

/**
 * Tagesreihe einer Station für das Verlaufsdiagramm.
 * Rohdaten aus `price_history`, Lücken (älter als die Rohdaten-Retention)
 * werden aus `price_daily` ergänzt. Ergebnisse werden kurz zwischengespeichert.
 */
export async function getStationPriceHistory(
  stationId: string,
  fuelType: FuelType,
  rangeDays: HistoryRange,
): Promise<DailyPricePoint[]> {
  const cacheKey = `${stationId}:${fuelType}:${rangeDays}`;
  const cached = historyCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const now = Date.now();
  const db = await admin();
  // Rückblick über den Zeitraum hinaus, um den Startpreis des ersten Tages zu kennen.
  const since = new Date(now - (rangeDays + 1) * DAY - CARRY_FORWARD_MS).toISOString();
  const { data, error } = await db
    .from("price_history")
    .select("price, recorded_at")
    .eq("station_id", stationId)
    .eq("fuel_type", fuelType)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);

  const raw = (data ?? []).map((row) => ({
    t: new Date(row.recorded_at).getTime(),
    price: Number(row.price),
  }));
  const daily = aggregateDaily(raw, rangeDays, now);

  const keys = rangeDayKeys(rangeDays, now);
  if (daily.length < keys.length) {
    const present = new Set(daily.map((p) => p.date));
    const { data: compacted, error: dailyError } = await db
      .from("price_daily")
      .select("day, avg_price")
      .eq("station_id", stationId)
      .eq("fuel_type", fuelType)
      .gte("day", keys[0]!)
      .lte("day", keys[keys.length - 1]!);
    if (dailyError) {
      console.warn("[price-history] price_daily nicht verfügbar:", dailyError.message);
    } else {
      for (const row of compacted ?? []) {
        if (!present.has(row.day)) daily.push({ date: row.day, price: Number(row.avg_price) });
      }
      daily.sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  if (historyCache.size >= HISTORY_CACHE_MAX) {
    const oldest = historyCache.keys().next().value;
    if (oldest !== undefined) historyCache.delete(oldest);
  }
  historyCache.set(cacheKey, { expires: now + HISTORY_CACHE_TTL_MS, value: daily });
  return daily;
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
