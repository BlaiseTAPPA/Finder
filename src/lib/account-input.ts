/** Eingabe-Schemas für konto-gebundene Server-Funktionen (client-sicher). */
import { z } from "zod";

const fuel = z.enum(["e5", "e10", "diesel"]);

export const stationSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().default(""),
  brand: z.string().default(""),
  street: z.string().default(""),
  houseNumber: z.string().default(""),
  postCode: z.string().default(""),
  place: z.string().default(""),
  lat: z.number(),
  lng: z.number(),
  dist: z.number().default(0),
  isOpen: z.boolean().default(false),
  prices: z.object({
    e5: z.number().nullable(),
    e10: z.number().nullable(),
    diesel: z.number().nullable(),
  }),
});

export const tripSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(80),
    createdAt: z.number().optional(),
    from: z.unknown().optional(),
    to: z.unknown().optional(),
  })
  .passthrough();

export const setFavoriteSchema = z.object({
  station: stationSchema,
  favorite: z.boolean(),
});

export const saveTripSchema = z.object({ trip: tripSchema });
export const idSchema = z.object({ id: z.string().min(1).max(80) });

export const syncSchema = z.object({
  favorites: z.array(stationSchema).max(200).default([]),
  trips: z.array(tripSchema).max(100).default([]),
  username: z.string().max(80).nullish(),
  avatarUrl: z.string().max(500).nullish(),
});

export const upsertAlertSchema = z.object({
  stationId: z.string().min(1).max(64),
  stationName: z.string().max(120).default(""),
  fuelType: fuel,
  threshold: z.number().min(0.5).max(5),
});

export const toggleAlertSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

// ----- Tankbudget (Feature 0002) -----

export const vehicleSchema = z.object({
  name: z.string().trim().max(40).nullish(),
  fuelType: fuel,
  consumption: z.number().min(2).max(30),
  tankCapacity: z.number().min(10).max(150),
});

export const budgetSchema = z.object({
  amount: z.number().min(1).max(10000),
  period: z.enum(["weekly", "monthly"]),
});

const stationSnapshot = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(120),
  brand: z.string().max(80),
  place: z.string().max(80),
});

export const fuelLogSchema = z.object({
  /** ISO-Zeitpunkt des Tankvorgangs; nicht in der Zukunft (5 Min. Toleranz für Uhrabweichungen). */
  filledAt: z
    .string()
    .datetime({ offset: true })
    .refine((v) => Date.parse(v) <= Date.now() + 5 * 60_000, "Datum liegt in der Zukunft"),
  station: stationSnapshot.nullable(),
  fuelType: fuel,
  liters: z.number().min(0.5).max(150),
  pricePerLiter: z.number().min(0.5).max(5),
});

export const fuelLogUpdateSchema = fuelLogSchema.extend({ id: z.string().uuid() });
export const uuidSchema = z.object({ id: z.string().uuid() });
export const fuelBudgetQuerySchema = z.object({ since: z.string().datetime({ offset: true }) });

export type BudgetPeriod = z.infer<typeof budgetSchema>["period"];
export type VehicleInput = z.input<typeof vehicleSchema>;
export type BudgetInput = z.input<typeof budgetSchema>;
export type FuelLogInput = z.input<typeof fuelLogSchema>;
export type FuelLogUpdateInput = z.input<typeof fuelLogUpdateSchema>;

export interface VehicleProfile {
  name: string | null;
  fuelType: "e5" | "e10" | "diesel";
  consumption: number;
  tankCapacity: number;
}

export interface FuelBudget {
  amount: number;
  period: BudgetPeriod;
}

export interface FuelLog {
  id: string;
  filledAt: string;
  station: { id: string; name: string; brand: string; place: string } | null;
  fuelType: "e5" | "e10" | "diesel";
  liters: number;
  pricePerLiter: number;
}

export interface FuelBudgetData {
  vehicle: VehicleProfile | null;
  budget: FuelBudget | null;
  /** Tankvorgänge ab dem angefragten Zeitpunkt, neueste zuerst. */
  logs: FuelLog[];
}

/* Eingabetypen für die Client-Aufrufe: z.input, damit Felder mit .default() optional bleiben. */
export type SetFavoriteInput = z.input<typeof setFavoriteSchema>;
export type SaveTripInput = z.input<typeof saveTripSchema>;
export type SyncInput = z.input<typeof syncSchema>;
export type UpsertAlertInput = z.input<typeof upsertAlertSchema>;
export type ToggleAlertInput = z.input<typeof toggleAlertSchema>;

export interface PriceAlert {
  id: string;
  stationId: string;
  stationName: string;
  fuelType: "e5" | "e10" | "diesel";
  threshold: number;
  active: boolean;
  currentPrice: number | null;
}
