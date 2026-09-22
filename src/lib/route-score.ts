/**
 * Bewertung von Stationen entlang einer Route.
 * Reine Rechenlogik – im Client und im Server nutzbar.
 */

/** Angenommene Tankmenge für die Ersparnis-Rechnung. */
export const TANK_LITERS = 50;
/** Durchschnittsgeschwindigkeit auf dem Umweg. */
export const DETOUR_SPEED_KMH = 45;
/** Fixer Zeitaufwand für Abfahren, Halten, Wiedereinfädeln. */
export const DETOUR_FIXED_MIN = 2;
/** Verbrauch auf dem Umweg (l/100 km). */
export const DETOUR_CONSUMPTION = 7;
/** Bewertung der eigenen Zeit (€/Stunde). */
export const TIME_VALUE_EUR_H = 12;

export interface Detour {
  detourKm: number;
  detourMin: number;
}

/**
 * Vereinfachter Umweg: hin und zurück zur Route.
 * Siehe README – ignoriert Einbahnstraßen und Autobahnauffahrten.
 */
export function estimateDetour(corridorDistanceKm: number): Detour {
  const detourKm = corridorDistanceKm * 2;
  const detourMin = (detourKm / DETOUR_SPEED_KMH) * 60 + DETOUR_FIXED_MIN;
  return { detourKm, detourMin };
}

/**
 * Netto-Ersparnis in Euro: gesparter Spritpreis gegenüber dem
 * Referenzpreis, abzüglich Kraftstoff und Zeit des Umwegs.
 */
export function detourScore(
  price: number | null,
  referencePrice: number | null,
  detour: Detour,
): number {
  if (price === null || referencePrice === null) return Number.NEGATIVE_INFINITY;
  const savings = (referencePrice - price) * TANK_LITERS;
  const fuelCost = ((detour.detourKm * DETOUR_CONSUMPTION) / 100) * price;
  const timeCost = (detour.detourMin / 60) * TIME_VALUE_EUR_H;
  return savings - fuelCost - timeCost;
}

/** Median der vorhandenen Preise (Referenz für die Ersparnis). */
export function medianPrice(prices: Array<number | null>): number | null {
  const values = prices.filter((p): p is number => p !== null).sort((a, b) => a - b);
  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1]! + values[middle]!) / 2 : values[middle]!;
}
