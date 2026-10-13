/**
 * Suchzustand der Startseite für die laufende Browser-Sitzung (sessionStorage).
 * Hält Ort, Umkreis, Sorte, Sortierung, Tab und Trajet über Seitenwechsel
 * (z. B. Preisalarme → zurück) und Neuladen hinweg – nur in diesem Tab,
 * nie in der URL, damit der Standort nicht in geteilten Links landet.
 */
import { z } from "zod";

const KEY = "tankstellen:search";

const coords = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const label = z.string().max(300);
const tripPoint = coords.extend({ label });
const corridorKm = z.number().min(0.5).max(10);

const schema = z.object({
  v: z.literal(1),
  center: coords.nullable(),
  placeLabel: label.nullable(),
  radius: z.number().int().min(1).max(25),
  fuel: z.enum(["e5", "e10", "diesel"]),
  sort: z.enum(["price", "distance"]),
  tab: z.enum(["search", "trip", "favorites"]),
  trip: z.object({
    origin: tripPoint.nullable(),
    destination: tripPoint.nullable(),
    originText: label,
    destinationText: label,
    corridorKm,
    routeSort: z.enum(["best", "price", "detour"]),
    /** Zuletzt ausgeführte Trajet-Suche (null = noch keine). */
    query: z.object({ origin: coords, destination: coords, corridorKm }).nullable(),
  }),
});

export type SearchSession = Omit<z.infer<typeof schema>, "v">;

/** Liest einen gespeicherten Zustand; ungültige oder veraltete Einträge ergeben null. */
export function parseSearchSession(raw: string | null): SearchSession | null {
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(json);
  if (!result.success) return null;
  const { v: _version, ...session } = result.data;
  return session;
}

export function serializeSearchSession(session: SearchSession): string {
  return JSON.stringify({ v: 1, ...session });
}

/** Speicher-Cache, damit der Zustand auch bei blockiertem sessionStorage Seitenwechsel übersteht. */
let cache: SearchSession | null = null;

export function loadSearchSession(): SearchSession | null {
  if (cache) return cache;
  try {
    cache = parseSearchSession(sessionStorage.getItem(KEY));
  } catch {
    cache = null;
  }
  return cache;
}

export function saveSearchSession(session: SearchSession): void {
  cache = session;
  try {
    sessionStorage.setItem(KEY, serializeSearchSession(session));
  } catch {
    /* Speicher blockiert – Zustand bleibt nur im Speicher-Cache */
  }
}
