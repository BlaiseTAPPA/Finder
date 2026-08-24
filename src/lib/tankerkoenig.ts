/**
 * Zod-Schemas + Normalisierung für die Tankerkönig-API.
 * Client-sicher: enthält keine Secrets und keine HTTP-Aufrufe.
 */
import { z } from "zod";
import type { FuelPrices, Station } from "@/types/station";

/** Tankerkönig liefert Preise als Zahl oder `false`, wenn nicht verfügbar. */
const priceSchema = z.union([z.number(), z.literal(false), z.null()]).optional();

const toPrice = (value: number | false | null | undefined): number | null =>
  typeof value === "number" && value > 0 ? value : null;

/** Rohe Station aus /json/list.php */
export const rawStationSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  brand: z.string().optional().default(""),
  street: z.string().optional().default(""),
  houseNumber: z.string().nullish(),
  postCode: z.union([z.string(), z.number()]).nullish(),
  place: z.string().optional().default(""),
  lat: z.number(),
  lng: z.number(),
  dist: z.number().optional().default(0),
  isOpen: z.boolean().optional().default(false),
  diesel: priceSchema,
  e5: priceSchema,
  e10: priceSchema,
});

export const listResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
  status: z.string().optional(),
  stations: z.array(rawStationSchema).optional(),
});

/** /json/prices.php liefert eine Map id -> Preisobjekt. */
export const pricesEntrySchema = z.object({
  status: z.string(),
  e5: priceSchema,
  e10: priceSchema,
  diesel: priceSchema,
});

export const pricesResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
  prices: z.record(z.string(), pricesEntrySchema).optional(),
});

export type RawStation = z.infer<typeof rawStationSchema>;
export type PricesEntry = z.infer<typeof pricesEntrySchema>;

/** Rohstation -> UI-Modell. */
export function normalizeStation(raw: RawStation): Station {
  return {
    id: raw.id,
    name: raw.name?.trim() || raw.brand || "Tankstelle",
    brand: raw.brand?.trim() || raw.name?.trim() || "Frei",
    street: raw.street ?? "",
    houseNumber: raw.houseNumber ? String(raw.houseNumber) : "",
    postCode: raw.postCode ? String(raw.postCode) : "",
    place: raw.place ?? "",
    lat: raw.lat,
    lng: raw.lng,
    dist: raw.dist ?? 0,
    isOpen: Boolean(raw.isOpen),
    prices: {
      e5: toPrice(raw.e5),
      e10: toPrice(raw.e10),
      diesel: toPrice(raw.diesel),
    },
  };
}

/** Preis-Update aus prices.php in das FuelPrices-Modell überführen. */
export function normalizePrices(entry: PricesEntry): {
  isOpen: boolean;
  prices: FuelPrices;
} {
  return {
    isOpen: entry.status === "open",
    prices: {
      e5: toPrice(entry.e5),
      e10: toPrice(entry.e10),
      diesel: toPrice(entry.diesel),
    },
  };
}

/** Eingabe-Schemas der Server-Funktionen (auch im Client zur Validierung nutzbar). */
export const listInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(1).max(25),
});

export const pricesInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const geocodeInputSchema = z.object({
  query: z.string().min(2).max(120),
});

export type ListInput = z.infer<typeof listInputSchema>;
export type PricesInput = z.infer<typeof pricesInputSchema>;
