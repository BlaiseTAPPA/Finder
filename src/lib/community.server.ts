/**
 * Server-only Datenzugriff für Community-Beiträge.
 * Schreibt ausschließlich mit Service-Role; die Tabellen sind für anon gesperrt.
 */
import type { FuelType } from "@/types/station";
import { WINDOW_HOURS, type Activity } from "./community";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const HOUR = 3_600_000;

export interface StationCoords {
  lat: number;
  lng: number;
}

/** Koordinaten einer registrierten Station (für die Nähe-Prüfung). */
export async function stationCoords(stationId: string): Promise<StationCoords | null> {
  const db = await admin();
  const { data, error } = await db
    .from("stations")
    .select("lat, lng")
    .eq("id", stationId)
    .maybeSingle();
  if (error || !data) return null;
  return { lat: data.lat, lng: data.lng };
}

/** true, wenn der Beitragende das Tageslimit erreicht hat. */
export async function overDailyLimit(contributorId: string, max: number): Promise<boolean> {
  const db = await admin();
  const since = new Date(Date.now() - 24 * HOUR).toISOString();
  const [reports, confirmations] = await Promise.all([
    db
      .from("price_reports")
      .select("id", { count: "exact", head: true })
      .eq("contributor_id", contributorId)
      .gte("created_at", since),
    db
      .from("price_confirmations")
      .select("id", { count: "exact", head: true })
      .eq("contributor_id", contributorId)
      .gte("created_at", since),
  ]);
  return (reports.count ?? 0) + (confirmations.count ?? 0) >= max;
}

/** true, wenn für (Station, Sorte) innerhalb der Sperrzeit schon eine Aktion existiert. */
export async function actedRecently(
  table: "price_reports" | "price_confirmations",
  contributorId: string,
  stationId: string,
  fuelType: FuelType,
  hours: number,
): Promise<boolean> {
  const db = await admin();
  const since = new Date(Date.now() - hours * HOUR).toISOString();
  const { count } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("contributor_id", contributorId)
    .eq("station_id", stationId)
    .eq("fuel_type", fuelType)
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

export async function insertReport(row: {
  station_id: string;
  fuel_type: FuelType;
  contributor_id: string;
  reported_price: number | null;
  comment: string | null;
  user_lat: number | null;
  user_lng: number | null;
}): Promise<void> {
  const db = await admin();
  const { error } = await db.from("price_reports").insert(row);
  if (error) throw new Error(error.message);
}

export async function insertConfirmation(row: {
  station_id: string;
  fuel_type: FuelType;
  contributor_id: string;
  user_lat: number;
  user_lng: number;
}): Promise<void> {
  const db = await admin();
  const { error } = await db.from("price_confirmations").insert(row);
  if (error) throw new Error(error.message);
}

export interface ActivityBuckets {
  confirmations: Map<string, Activity[]>;
  reports: Map<string, Activity[]>;
}

/** Alle Ereignisse im Fenster für mehrere Stationen (zwei Abfragen). */
export async function readActivity(
  stationIds: string[],
  fuelType: FuelType,
): Promise<ActivityBuckets> {
  const confirmations = new Map<string, Activity[]>();
  const reports = new Map<string, Activity[]>();
  if (stationIds.length === 0) return { confirmations, reports };

  const db = await admin();
  const since = new Date(Date.now() - WINDOW_HOURS * HOUR).toISOString();
  const ids = stationIds.slice(0, 60);

  const [conf, rep] = await Promise.all([
    db
      .from("price_confirmations")
      .select("station_id, created_at")
      .in("station_id", ids)
      .eq("fuel_type", fuelType)
      .gte("created_at", since)
      .limit(5000),
    db
      .from("price_reports")
      .select("station_id, created_at")
      .in("station_id", ids)
      .eq("fuel_type", fuelType)
      .gte("created_at", since)
      .limit(5000),
  ]);

  for (const row of conf.data ?? []) {
    const list = confirmations.get(row.station_id) ?? [];
    list.push({ createdAt: new Date(row.created_at).getTime() });
    confirmations.set(row.station_id, list);
  }
  for (const row of rep.data ?? []) {
    const list = reports.get(row.station_id) ?? [];
    list.push({ createdAt: new Date(row.created_at).getTime() });
    reports.set(row.station_id, list);
  }
  return { confirmations, reports };
}
