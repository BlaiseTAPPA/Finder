/** Eingabe-Schemas für die Trend-Server-Funktionen (client-sicher). */
import { z } from "zod";

export const HISTORY_RANGES = [7, 14, 30] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

const fuel = z.enum(["e5", "e10", "diesel"]);

export const historyInputSchema = z.object({
  stationId: z.string().min(1).max(64),
  fuelType: fuel,
  days: z.union([z.literal(7), z.literal(14), z.literal(30)]).default(7),
});

export const trendInputSchema = z.object({
  stationId: z.string().min(1).max(64),
  fuelType: fuel,
  days: z.union([z.literal(7), z.literal(14), z.literal(30)]).default(7),
  current: z.number().positive().nullish(),
});

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
