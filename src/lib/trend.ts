/**
 * Reine Berechnungen für Preistrend und Tagesrhythmus.
 * Client-sicher: keine Secrets, kein HTTP, keine DB — daher gut testbar.
 */
import type { FuelType } from "@/types/station";

export interface HistoryPoint {
  /** Zeitstempel in ms (UTC). */
  t: number;
  price: number;
}

export type TrendClass = "low" | "mid" | "high";

export interface HourlyPoint {
  hour: number;
  avg: number;
  samples: number;
}

export interface Recommendation {
  kind: "good-now" | "wait";
  /** Stunde des typischen Tagestiefs (Europe/Berlin). */
  hour: number;
  text: string;
}

export interface TrendResult {
  fuel: FuelType;
  days: number;
  samples: number;
  /** Anzahl unterschiedlicher Tage mit Datenpunkten. */
  distinctDays: number;
  confident: boolean;
  current: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  /** Position des aktuellen Preises in der Periode, 0..100. */
  percentile: number | null;
  classification: TrendClass | null;
  hourly: HourlyPoint[];
  troughHour: number | null;
  peakHour: number | null;
  recommendation: Recommendation | null;
}

/** Mindestanforderung, damit eine Empfehlung überhaupt sinnvoll ist. */
export const MIN_DISTINCT_DAYS = 4;
export const MIN_SAMPLES = 20;

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Stunde (0-23) und Kalendertag in deutscher Ortszeit. */
const berlin = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
});

export function berlinParts(ms: number): { day: string; hour: number } {
  const parts = berlin.formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const hour = Number(get("hour")) % 24;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

/** Anteil der Werte, die kleiner sind als `value` (0..100). */
export function percentileOf(values: number[], value: number): number {
  if (values.length === 0) return 50;
  const below = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  return ((below + equal / 2) / values.length) * 100;
}

export function classify(percentile: number): TrendClass {
  if (percentile < 25) return "low";
  if (percentile > 75) return "high";
  return "mid";
}

/** Durchschnittspreis je Tagesstunde (Ortszeit Berlin). */
export function hourlyPattern(points: HistoryPoint[]): HourlyPoint[] {
  const buckets = new Map<number, { sum: number; n: number }>();
  for (const p of points) {
    const { hour } = berlinParts(p.t);
    const b = buckets.get(hour) ?? { sum: 0, n: 0 };
    b.sum += p.price;
    b.n += 1;
    buckets.set(hour, b);
  }
  return [...buckets.entries()]
    .map(([hour, b]) => ({ hour, avg: round3(b.sum / b.n), samples: b.n }))
    .sort((a, b) => a.hour - b.hour);
}

function extremes(hourly: HourlyPoint[]) {
  // Nur Stunden mit mindestens zwei Beobachtungen zählen als Muster.
  const solid = hourly.filter((h) => h.samples >= 2);
  if (solid.length < 4) return { trough: null, peak: null };
  let trough = solid[0]!;
  let peak = solid[0]!;
  for (const h of solid) {
    if (h.avg < trough.avg) trough = h;
    if (h.avg > peak.avg) peak = h;
  }
  return { trough, peak };
}

const hoursUntil = (from: number, to: number) => (to - from + 24) % 24;

export interface TrendInput {
  fuel: FuelType;
  days: number;
  points: HistoryPoint[];
  current: number | null;
  /** Referenzzeit (Test-Injektion). */
  now?: number;
}

export function computeTrend({
  fuel,
  days,
  points,
  current,
  now = Date.now(),
}: TrendInput): TrendResult {
  const prices = points.map((p) => p.price);
  const distinctDays = new Set(points.map((p) => berlinParts(p.t).day)).size;
  const confident = distinctDays >= MIN_DISTINCT_DAYS && points.length >= MIN_SAMPLES;

  const base: TrendResult = {
    fuel,
    days,
    samples: points.length,
    distinctDays,
    confident,
    current,
    min: prices.length ? round3(Math.min(...prices)) : null,
    max: prices.length ? round3(Math.max(...prices)) : null,
    avg: prices.length
      ? round3(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null,
    percentile: null,
    classification: null,
    hourly: hourlyPattern(points),
    troughHour: null,
    peakHour: null,
    recommendation: null,
  };

  if (current !== null && prices.length >= 5) {
    const percentile = Math.round(percentileOf(prices, current));
    base.percentile = percentile;
    base.classification = classify(percentile);
  }

  const { trough, peak } = extremes(base.hourly);
  base.troughHour = trough?.hour ?? null;
  base.peakHour = peak?.hour ?? null;

  if (!confident || !trough || !peak) return base;

  const nowHour = berlinParts(now).hour;
  const untilTrough = hoursUntil(nowHour, trough.hour);
  const spread = peak.avg - trough.avg;

  // Zu flaches Muster: keine Aussage treffen.
  if (spread < 0.02) return base;

  if (untilTrough <= 1 || untilTrough >= 23) {
    base.recommendation = {
      kind: "good-now",
      hour: trough.hour,
      text: "Guter Zeitpunkt – du bist im üblichen Tagestief.",
    };
  } else if (untilTrough <= 6) {
    base.recommendation = {
      kind: "wait",
      hour: trough.hour,
      text: `Der Preis fällt üblicherweise gegen ${trough.hour} Uhr – wenn möglich warten.`,
    };
  }

  return base;
}
