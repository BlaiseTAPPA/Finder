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

export interface PriceAlert {
  id: string;
  stationId: string;
  stationName: string;
  fuelType: "e5" | "e10" | "diesel";
  threshold: number;
  active: boolean;
  currentPrice: number | null;
}
