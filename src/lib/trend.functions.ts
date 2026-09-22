import { fetchApi } from "./server-fn-client";
import type { HistoryInput, SummariesInput, TrendInput } from "./trend-input";
import type { HistoryPoint, TrendResult } from "./trend";

export interface HistoryResult {
  points: HistoryPoint[];
  avg: number | null;
  days: number;
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

/** Verlaufspunkte für das Diagramm (7/14/30 Tage). */
export async function getPriceHistory(args: { data: HistoryInput }): Promise<HistoryResult> {
  return fetchApi<HistoryResult>("/api/trends/history", args.data);
}

/** Trend, Klassifizierung und Empfehlung. */
export async function getPriceTrend(args: { data: TrendInput }): Promise<TrendResult> {
  return fetchApi<TrendResult>("/api/trends/trend", args.data);
}

/** Trend-Badges für die gesamte Ergebnisliste. */
export async function getTrendSummaries(args: { data: SummariesInput }): Promise<TrendSummary[]> {
  return fetchApi<TrendSummary[]>("/api/trends/summaries", args.data);
}
