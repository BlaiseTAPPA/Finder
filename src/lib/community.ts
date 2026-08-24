/**
 * Reine Logik der Community-Ebene (Bestätigungen / Meldungen).
 *
 * Wichtig: Diese Ebene liegt NUR über den offiziellen Tankerkönig-Preisen.
 * Sie verändert niemals den angezeigten Preis, sondern liefert ein
 * zusätzliches Vertrauenssignal.
 */
import type { Coords, FuelType } from "@/types/station";

/** Gleitendes Fenster für die Bewertung. */
export const WINDOW_HOURS = 48;
/** Halbwertszeit der Gewichtung. */
export const HALF_LIFE_HOURS = 12;
/** Mindestgewicht, ab dem überhaupt ein Badge erscheint. */
export const MIN_WEIGHT = 2;
/** Schwelle für "confirmed" / "disputed". */
export const SCORE_THRESHOLD = 0.34;
/** Pflicht-Nähe für Bestätigungen (Meter). */
export const CONFIRM_RADIUS_M = 500;

export type CommunityStatusKind = "confirmed" | "disputed" | "neutral";

export interface CommunityStatus {
  stationId: string;
  fuelType: FuelType;
  status: CommunityStatusKind;
  confirmationsCount: number;
  reportsCount: number;
  lastActivityAt: string | null;
}

export interface Activity {
  createdAt: number;
}

/** Frischegewicht eines Ereignisses (0 außerhalb des Fensters). */
export function freshnessWeight(createdAt: number, now = Date.now()): number {
  const ageHours = (now - createdAt) / 3_600_000;
  if (ageHours < 0) return 1;
  if (ageHours > WINDOW_HOURS) return 0;
  return 0.5 ** (ageHours / HALF_LIFE_HOURS);
}

function sumWeights(items: Activity[], now: number): number {
  return items.reduce((sum, item) => sum + freshnessWeight(item.createdAt, now), 0);
}

/** Gewichtete Klassifizierung von Bestätigungen gegen Meldungen. */
export function classifyCommunity(
  confirmations: Activity[],
  reports: Activity[],
  now = Date.now(),
): CommunityStatusKind {
  const c = sumWeights(confirmations, now);
  const r = sumWeights(reports, now);
  const total = c + r;
  if (total < MIN_WEIGHT) return "neutral";
  const score = (c - r) / total;
  if (score >= SCORE_THRESHOLD) return "confirmed";
  if (score <= -SCORE_THRESHOLD) return "disputed";
  return "neutral";
}

/** Vollständiger Status inklusive Rohzahlen im Fenster. */
export function buildStatus(
  stationId: string,
  fuelType: FuelType,
  confirmations: Activity[],
  reports: Activity[],
  now = Date.now(),
): CommunityStatus {
  const inWindow = (a: Activity) => freshnessWeight(a.createdAt, now) > 0;
  const c = confirmations.filter(inWindow);
  const r = reports.filter(inWindow);
  const last = [...c, ...r].reduce((max, a) => Math.max(max, a.createdAt), 0);
  return {
    stationId,
    fuelType,
    status: classifyCommunity(c, r, now),
    confirmationsCount: c.length,
    reportsCount: r.length,
    lastActivityAt: last > 0 ? new Date(last).toISOString() : null,
  };
}

/** Entfernung in Metern (Haversine, ausreichend genau für 500 m). */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6_371_008.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isNearStation(user: Coords, station: Coords): boolean {
  return distanceMeters(user, station) <= CONFIRM_RADIUS_M;
}

/** Koordinaten auf ~100 m runden (Datensparsamkeit). */
export function coarsen(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Kurze Wortliste gegen offensichtlich unangemessene Kommentare. */
const BLOCKED = [
  "arschloch",
  "fotze",
  "wichser",
  "hurensohn",
  "nazi",
  "fuck",
  "bitch",
  "connard",
  "salope",
];

export function containsBlockedWords(text: string): boolean {
  const normalized = text.toLowerCase();
  return BLOCKED.some((word) => normalized.includes(word));
}

export const RATE_LIMITS = {
  /** Gleiche Station + Sorte: 1 Aktion pro Stunde und Typ. */
  perStationFuelHours: 1,
  /** Gesamtbudget pro Beitragender:r und Tag. */
  perDay: 10,
} as const;
