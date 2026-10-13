import { fetchApi } from "./server-fn-client";
import {
  historyInputSchema,
  type DailyPricePoint,
  type HistoryInput,
  type HistoryRange,
  type SummariesInput,
  type TrendInput,
} from "./trend-input";
import type { TrendResult } from "./trend";

export interface HistoryResult {
  /** Ein Punkt je Tag, aufsteigend; Tage ohne Daten fehlen. */
  points: DailyPricePoint[];
  avg: number | null;
  rangeDays: HistoryRange;
}

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

/** Tagesreihe für das Diagramm (7/15/30 Tage); Eingabe wird vorab validiert. */
export async function getPriceHistory(args: { data: HistoryInput }): Promise<HistoryResult> {
  return fetchApi<HistoryResult>("/api/trends/history", historyInputSchema.parse(args.data));
}

/** Trend, Klassifizierung und Empfehlung. */
export async function getPriceTrend(args: { data: TrendInput }): Promise<TrendResult> {
  return fetchApi<TrendResult>("/api/trends/trend", args.data);
}

/** Trend-Badges für die gesamte Ergebnisliste. */
export async function getTrendSummaries(args: { data: SummariesInput }): Promise<TrendSummary[]> {
  return fetchApi<TrendSummary[]>("/api/trends/summaries", args.data);
}
