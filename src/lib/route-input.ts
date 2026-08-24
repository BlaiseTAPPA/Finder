/** Eingabe-Schemas der Routen-Server-Funktionen (client-sicher). */
import { z } from "zod";

export const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const planRouteInputSchema = z.object({
  origin: coordsSchema,
  destination: coordsSchema,
});

export const routeStationsInputSchema = z.object({
  origin: coordsSchema,
  destination: coordsSchema,
  corridorKm: z.number().min(0.5).max(10),
  fuelType: z.enum(["e5", "e10", "diesel"]),
});

export const suggestInputSchema = z.object({
  query: z.string().min(3).max(120),
});

export type PlanRouteInput = z.infer<typeof planRouteInputSchema>;
export type RouteStationsInput = z.infer<typeof routeStationsInputSchema>;
