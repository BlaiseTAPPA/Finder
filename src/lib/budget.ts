/**
 * Reine Logik des Tankbudgets (Feature 0002): Perioden in Berliner Zeit, Ausgaben,
 * Restbetrag und Hochrechnung. Ohne Abhängigkeiten, damit sie überall testbar ist.
 *
 * Perioden: Woche = Montag 00:00 bis Montag 00:00, Monat = Kalendermonat, jeweils
 * Europe/Berlin. Zeiten sind UTC-Millisekunden; `end` ist exklusiv.
 */
import type { BudgetPeriod, FuelBudget, FuelLog } from "./account-input";

const TZ = "Europe/Berlin";
const DAY_MS = 86_400_000;

/** Hochrechnung erst ab diesem Periodentag und dieser Anzahl Tankvorgänge. */
export const PROJECTION_MIN_DAY = 3;
export const PROJECTION_MIN_ENTRIES = 2;

interface CivilDate {
  y: number;
  /** 1–12 */
  m: number;
  d: number;
}

const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function berlinParts(ms: number) {
  const out: Record<string, number> = {};
  for (const p of partsFormat.formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

function civilOf(ms: number): CivilDate {
  const p = berlinParts(ms);
  return { y: p.year, m: p.month, d: p.day };
}

/** Abstand Berlin–UTC zum Zeitpunkt `ms` (CET +1 h, CEST +2 h). */
function berlinOffsetMs(ms: number): number {
  const p = berlinParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Berliner Mitternacht eines Kalendertags als UTC-Zeitpunkt (Tage dürfen überlaufen). */
function berlinMidnight({ y, m, d }: CivilDate): number {
  const naive = Date.UTC(y, m - 1, d);
  // Zweimal nähern: der Offset kann sich zwischen Schätzung und Ergebnis ändern (Zeitumstellung).
  const first = naive - berlinOffsetMs(naive);
  return naive - berlinOffsetMs(first);
}

function normalize(c: CivilDate): CivilDate {
  const t = new Date(Date.UTC(c.y, c.m - 1, c.d));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function civilDayNumber(c: CivilDate): number {
  return Math.round(Date.UTC(c.y, c.m - 1, c.d) / DAY_MS);
}

export interface PeriodBounds {
  start: number;
  end: number;
  totalDays: number;
}

/** Periode, in der `now` liegt. */
export function periodBounds(period: BudgetPeriod, now: number): PeriodBounds {
  const today = civilOf(now);
  if (period === "weekly") {
    const weekday = new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay(); // 0 = So
    const sinceMonday = (weekday + 6) % 7;
    const start = normalize({ ...today, d: today.d - sinceMonday });
    const end = normalize({ ...start, d: start.d + 7 });
    return { start: berlinMidnight(start), end: berlinMidnight(end), totalDays: 7 };
  }
  const start = { y: today.y, m: today.m, d: 1 };
  const end = normalize({ y: today.y, m: today.m + 1, d: 1 });
  const totalDays = new Date(Date.UTC(today.y, today.m, 0)).getUTCDate();
  return { start: berlinMidnight(start), end: berlinMidnight(end), totalDays };
}

/** Aktuelle Periode und die `count - 1` davor, neueste zuerst. */
export function recentPeriods(period: BudgetPeriod, now: number, count: number): PeriodBounds[] {
  const out: PeriodBounds[] = [];
  let ref = now;
  for (let i = 0; i < count; i++) {
    const bounds = periodBounds(period, ref);
    out.push(bounds);
    ref = bounds.start - 1;
  }
  return out;
}

/** 1-basierter Kalendertag von `now` innerhalb der Periode (Berliner Datum). */
export function dayOfPeriod(bounds: PeriodBounds, now: number): number {
  const day = civilDayNumber(civilOf(now)) - civilDayNumber(civilOf(bounds.start)) + 1;
  return Math.min(Math.max(day, 1), bounds.totalDays);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Betrag eines Tankvorgangs. */
export function logTotal(log: Pick<FuelLog, "liters" | "pricePerLiter">): number {
  return roundMoney(log.liters * log.pricePerLiter);
}

export function litersFromAmount(amount: number, pricePerLiter: number): number {
  return Math.round((amount / pricePerLiter) * 100) / 100;
}

export function amountFromLiters(liters: number, pricePerLiter: number): number {
  return roundMoney(liters * pricePerLiter);
}

/** Liter, die mit `remaining` € bezahlbar sind – abgerundet auf 0,1 L, nie negativ. */
export function affordableLiters(remaining: number, pricePerLiter: number): number {
  if (remaining <= 0 || pricePerLiter <= 0) return 0;
  return Math.floor((remaining / pricePerLiter) * 10 + 1e-9) / 10;
}

export function logsInPeriod(logs: FuelLog[], bounds: PeriodBounds): FuelLog[] {
  return logs.filter((log) => {
    const t = Date.parse(log.filledAt);
    return t >= bounds.start && t < bounds.end;
  });
}

export type BudgetStatusKind = "ok" | "at-risk" | "over";

export interface BudgetSummary {
  bounds: PeriodBounds;
  budget: number;
  spent: number;
  liters: number;
  entries: number;
  remaining: number;
  /** Heute eingeschlossen. */
  daysLeft: number;
  /** Geschätzte Ausgaben zum Periodenende; null bei zu wenig Daten. */
  projected: number | null;
  status: BudgetStatusKind;
}

export function summarizeBudget(budget: FuelBudget, logs: FuelLog[], now: number): BudgetSummary {
  const bounds = periodBounds(budget.period, now);
  const current = logsInPeriod(logs, bounds);
  const spent = roundMoney(current.reduce((sum, log) => sum + logTotal(log), 0));
  const liters = Math.round(current.reduce((sum, log) => sum + log.liters, 0) * 100) / 100;
  const day = dayOfPeriod(bounds, now);
  const projected =
    day >= PROJECTION_MIN_DAY && current.length >= PROJECTION_MIN_ENTRIES
      ? roundMoney((spent / day) * bounds.totalDays)
      : null;
  const status: BudgetStatusKind =
    spent > budget.amount
      ? "over"
      : projected !== null && projected > budget.amount
        ? "at-risk"
        : "ok";
  return {
    bounds,
    budget: budget.amount,
    spent,
    liters,
    entries: current.length,
    remaining: roundMoney(budget.amount - spent),
    daysLeft: bounds.totalDays - day + 1,
    projected,
    status,
  };
}

export interface PeriodTotal {
  bounds: PeriodBounds;
  spent: number;
  liters: number;
  entries: number;
}

/** Summen der `count` letzten Perioden (inkl. aktueller), neueste zuerst. */
export function periodTotals(
  period: BudgetPeriod,
  logs: FuelLog[],
  now: number,
  count: number,
): PeriodTotal[] {
  return recentPeriods(period, now, count).map((bounds) => {
    const current = logsInPeriod(logs, bounds);
    return {
      bounds,
      spent: roundMoney(current.reduce((sum, log) => sum + logTotal(log), 0)),
      liters: Math.round(current.reduce((sum, log) => sum + log.liters, 0) * 100) / 100,
      entries: current.length,
    };
  });
}

const monthLabel = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  month: "long",
  year: "numeric",
});
const dayMonthLabel = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});

/** "Oktober 2026" bzw. "12. Okt. – 18. Okt." */
export function periodLabel(period: BudgetPeriod, bounds: PeriodBounds): string {
  if (period === "monthly") return monthLabel.format(new Date(bounds.start));
  return `${dayMonthLabel.format(new Date(bounds.start))} – ${dayMonthLabel.format(new Date(bounds.end - 1))}`;
}
