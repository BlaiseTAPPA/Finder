/**
 * Server-Funktionen für Preisverlauf und Trend.
 * Dünne Hülle: Berechnung und Datenzugriff liegen in eigenen Modulen.
 */
import { createServerFn } from "@tanstack/react-start";
import {
  historyInputSchema,
  summariesInputSchema,
  trendInputSchema,
} from "./trend-input";
import type { HistoryPoint, TrendResult } from "./trend";

export interface HistoryResult {
  points: HistoryPoint[];
  avg: number | null;
  days: number;
}

/** Verlaufspunkte für das Diagramm (7/14/30 Tage). */
export const getPriceHistory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => historyInputSchema.parse(input))
  .handler(async ({ data }): Promise<HistoryResult> => {
    const { readHistory } = await import("./price-history.server");
    const points = await readHistory(data.stationId, data.fuelType, data.days);
    const avg =
      points.length > 0
        ? Math.round(
            (points.reduce((sum, p) => sum + p.price, 0) / points.length) * 1000,
          ) / 1000
        : null;
    return { points, avg, days: data.days };
  });

/** Trend, Klassifizierung und Empfehlung (alles serverseitig berechnet). */
export const getPriceTrend = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => trendInputSchema.parse(input))
  .handler(async ({ data }): Promise<TrendResult> => {
    const { readHistory } = await import("./price-history.server");
    const { computeTrend } = await import("./trend");
    const points = await readHistory(data.stationId, data.fuelType, data.days);
    return computeTrend({
      fuel: data.fuelType,
      days: data.days,
      points,
      current: data.current ?? null,
    });
  });

export interface TrendSummary {
  stationId: string;
  confident: boolean;
  samples: number;
  percentile: number | null;
  classification: TrendResult["classification"];
  recommendation: TrendResult["recommendation"];
  min: number | null;
  max: number | null;
  avg: number | null;
}

/** Trend-Badges für die gesamte Ergebnisliste in einer einzigen Abfrage. */
export const getTrendSummaries = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => summariesInputSchema.parse(input))
  .handler(async ({ data }): Promise<TrendSummary[]> => {
    const { readHistoryBulk } = await import("./price-history.server");
    const { computeTrend } = await import("./trend");
    const ids = data.stations.map((s) => s.id);
    const history = await readHistoryBulk(ids, data.fuelType, 7);
    return data.stations.map((station) => {
      const trend = computeTrend({
        fuel: data.fuelType,
        days: 7,
        points: history.get(station.id) ?? [],
        current: station.current ?? null,
      });
      return {
        stationId: station.id,
        confident: trend.confident,
        samples: trend.samples,
        percentile: trend.percentile,
        classification: trend.classification,
        recommendation: trend.recommendation,
        min: trend.min,
        max: trend.max,
        avg: trend.avg,
      };
    });
  });
