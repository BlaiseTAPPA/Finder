/**
 * Budgetbewusste Empfehlungen (Feature 0003): Kosten einer Tankfüllung inklusive Anfahrt,
 * bezahlbare Liter und die beste Station für das Budget. Reine Logik, ohne Abhängigkeiten.
 *
 * Geplante Menge ist immer die Tankgröße – der Füllstand ist unbekannt, und gleiche Mengen
 * machen Stationen vergleichbar. Zeit zählt nicht: das Budget ist tatsächlich ausgegebenes Geld.
 */
import type { VehicleProfile } from "./account-input";
import { affordableLiters, roundMoney } from "./budget";
import { medianPrice } from "./route-score";
import type { FuelType, Station } from "@/types/station";

/** Ab diesem Betrag wird die Anfahrt erwähnt. */
export const MIN_ACCESS_COST = 0.05;
/** Ab dieser Ersparnis gegenüber dem Mittelwert wird sie genannt. */
export const MIN_BEST_SAVING = 0.5;

export interface FillPlan {
  liters: number;
  price: number;
  /** Liter × Preis. */
  fillCost: number;
  /** Kraftstoff für die Anfahrt bzw. den Umweg. */
  accessCost: number;
  effectiveCost: number;
}

/** Kosten der geplanten Füllung; `detourKm` null = keine Anfahrt berücksichtigen. */
export function planFill(
  price: number,
  vehicle: Pick<VehicleProfile, "tankCapacity" | "consumption">,
  detourKm: number | null,
): FillPlan {
  const liters = vehicle.tankCapacity;
  const fillCost = roundMoney(liters * price);
  const accessCost =
    detourKm !== null && detourKm > 0
      ? roundMoney(((detourKm * vehicle.consumption) / 100) * price)
      : 0;
  return { liters, price, fillCost, accessCost, effectiveCost: roundMoney(fillCost + accessCost) };
}

export interface StationAdvice {
  plan: FillPlan;
  /** Mit dem Restbudget bezahlbare Liter; null ohne Budget. */
  affordable: number | null;
  /** Restbudget deckt die volle Füllung (inkl. Anfahrt) nicht. */
  shortfall: boolean;
  /** Restbudget ist aufgebraucht. */
  exhausted: boolean;
}

export interface AdviceInput {
  stations: Station[];
  fuel: FuelType;
  vehicle: Pick<VehicleProfile, "tankCapacity" | "consumption">;
  /** Restbudget in €; null ohne Budget. */
  remaining: number | null;
  /** Umweg bzw. Anfahrt je Station (km); null = nicht berücksichtigen. */
  detourKmOf: (station: Station) => number | null;
}

/** Empfehlung je Station mit Preis für die Sorte. */
export function adviseStations({
  stations,
  fuel,
  vehicle,
  remaining,
  detourKmOf,
}: AdviceInput): Map<string, StationAdvice> {
  const out = new Map<string, StationAdvice>();
  for (const station of stations) {
    const price = station.prices[fuel];
    if (price === null || price <= 0) continue;
    const plan = planFill(price, vehicle, detourKmOf(station));
    // Die Anfahrt kostet zuerst; was übrig bleibt, geht in den Tank.
    const budgetForFuel = remaining === null ? null : remaining - plan.accessCost;
    out.set(station.id, {
      plan,
      affordable: budgetForFuel === null ? null : affordableLiters(budgetForFuel, price),
      shortfall: remaining !== null && remaining < plan.effectiveCost,
      exhausted: remaining !== null && remaining <= 0,
    });
  }
  return out;
}

export interface BestChoice {
  station: Station;
  advice: StationAdvice;
  /** Mittelwert (Median) der effektiven Kosten minus beste; ≥ 0. */
  savingVsMedian: number;
  candidates: number;
}

/** Geöffnete Station mit den niedrigsten effektiven Kosten; null bei weniger als 2 Kandidaten. */
export function bestChoice(
  stations: Station[],
  advice: Map<string, StationAdvice>,
): BestChoice | null {
  const candidates = stations.filter((s) => s.isOpen && advice.has(s.id));
  if (candidates.length < 2) return null;
  let best = candidates[0]!;
  for (const station of candidates) {
    const cost = advice.get(station.id)!.plan.effectiveCost;
    const bestCost = advice.get(best.id)!.plan.effectiveCost;
    // Gleichstand: die nähere Station.
    if (cost < bestCost || (cost === bestCost && station.dist < best.dist)) best = station;
  }
  const bestAdvice = advice.get(best.id)!;
  const median = medianPrice(candidates.map((s) => advice.get(s.id)!.plan.effectiveCost)) ?? 0;
  return {
    station: best,
    advice: bestAdvice,
    savingVsMedian: Math.max(0, roundMoney(median - bestAdvice.plan.effectiveCost)),
    candidates: candidates.length,
  };
}

export interface BudgetRange {
  liters: number;
  km: number;
  price: number;
}

/** Reichweite des Restbudgets beim angegebenen Preis; null ohne Restbudget. */
export function budgetRange(
  remaining: number,
  price: number,
  consumption: number,
): BudgetRange | null {
  const liters = affordableLiters(remaining, price);
  if (liters <= 0 || consumption <= 0) return null;
  return { liters, km: Math.floor((liters / consumption) * 100), price };
}
