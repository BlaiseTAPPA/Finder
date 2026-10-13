/** Eingabe-Schemas für die Trend-Server-Funktionen (client-sicher). */
import { z } from "zod";

/** Zeiträume des Verlaufsdiagramms (Tage). */
export const HISTORY_RANGES = [7, 15, 30] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

/** Ein Tageswert der Preisreihe (Datum in Ortszeit Berlin, YYYY-MM-DD). */
export interface DailyPricePoint {
  date: string;
  price: number;
}

const fuel = z.enum(["e5", "e10", "diesel"]);

export const historyInputSchema = z.object({
  stationId: z.string().min(1).max(64),
  fuelType: fuel,
  rangeDays: z.union([z.literal(7), z.literal(15), z.literal(30)]).default(7),
});
export type HistoryInput = z.input<typeof historyInputSchema>;

export const trendInputSchema = z.object({
  stationId: z.string().min(1).max(64),
  fuelType: fuel,
  days: z.union([z.literal(7), z.literal(14), z.literal(30)]).default(7),
  current: z.number().positive().nullish(),
});
export type TrendInput = z.input<typeof trendInputSchema>;

export const summariesInputSchema = z.object({
  fuelType: fuel,
  stations: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        current: z.number().positive().nullish(),
      }),
    )
    .min(1)
    .max(60),
});
export type SummariesInput = z.input<typeof summariesInputSchema>;
