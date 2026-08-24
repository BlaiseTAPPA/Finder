/** Eingabe-Schemas der Community-Server-Funktionen (client-sicher). */
import { z } from "zod";

const fuel = z.enum(["e5", "e10", "diesel"]);
const stationId = z.string().min(1).max(64);
const contributorId = z
  .string()
  .regex(/^(clerk:[A-Za-z0-9_-]{4,60}|[0-9a-f-]{36})$/i, "invalid contributor");
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const reportInputSchema = z.object({
  stationId,
  fuelType: fuel,
  contributorId,
  reportedPrice: z.number().min(0.5).max(5).nullish(),
  comment: z.string().trim().max(200).nullish(),
  lat: lat.nullish(),
  lng: lng.nullish(),
});

export const confirmInputSchema = z.object({
  stationId,
  fuelType: fuel,
  contributorId,
  lat,
  lng,
});

export const statusInputSchema = z.object({
  stationId,
  fuelType: fuel,
});

export const statusesInputSchema = z.object({
  fuelType: fuel,
  stationIds: z.array(stationId).min(1).max(60),
});

export type ReportInput = z.infer<typeof reportInputSchema>;
export type ConfirmInput = z.infer<typeof confirmInputSchema>;

/** Ergebnis einer Beitrags-Aktion (nie ein geworfener Fehler für Fachfälle). */
export type ContributionResult =
  | { ok: true }
  | { ok: false; reason: "rate_limited" | "too_far" | "invalid_input" | "unknown" };

export const RESULT_MESSAGES: Record<
  Exclude<ContributionResult, { ok: true }>["reason"],
  string
> = {
  rate_limited: "Du hast das kürzlich schon gemeldet. Bitte später erneut versuchen.",
  too_far: "Geh näher an die Tankstelle (max. 500 m), um den Preis zu bestätigen.",
  invalid_input: "Eingabe ungültig oder unangemessen. Bitte prüfen.",
  unknown: "Das hat gerade nicht geklappt. Bitte später erneut versuchen.",
};
