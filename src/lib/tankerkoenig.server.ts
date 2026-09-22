/**
 * Server-only HTTP-Client für Tankerkönig + Nominatim.
 * Enthält den In-Memory-Cache (TTL) und die Quota-Behandlung.
 * Darf niemals direkt aus Komponenten importiert werden.
 */
import "./env.server";
import {
  listResponseSchema,
  normalizePrices,
  normalizeStation,
  pricesResponseSchema,
} from "./tankerkoenig";
import type { ApiErrorShape, FuelPrices, Station } from "@/types/station";

const BASE = "https://creativecommons.tankerkoenig.de/json";

/** Kleiner TTL-Cache. Reicht pro Worker-Instanz und schont das Quota deutlich. */
const cache = new Map<string, { value: unknown; expires: number }>();

function readCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function writeCache(key: string, value: unknown, ttlMs: number) {
  if (cache.size > 200) cache.clear();
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

export class TankerkoenigError extends Error {
  kind: ApiErrorShape["kind"];
  constructor(kind: ApiErrorShape["kind"], message: string) {
    super(message);
    this.kind = kind;
    this.name = "TankerkoenigError";
  }
}

function isInvalidKey(key: string | undefined): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (!trimmed) return true;
  if (/^0{8}-0{4}-0{4}-0{4}-0{12}$/i.test(trimmed)) return true;
  if (/^0+$/.test(trimmed)) return true;
  return false;
}

function apiKey(): string | null {
  const key = process.env["TANKERKOENIG_API_KEY"] || process.env["VITE_TANKERKOENIG_API_KEY"];
  if (isInvalidKey(key)) {
    console.warn(
      "[Tankerkönig Server] ⚠️ Aucun clé API valide trouvée dans les variables d'environnement.",
    );
    return null;
  }
  return key!.trim();
}

/** Requête HTTP sécurisée avec Timeout de 5s pour éviter tout blocage du SSR */
async function request(url: string, timeoutMs = 5000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const errorObj = err as { name?: string } | null;
    if (errorObj?.name === "AbortError") {
      throw new TankerkoenigError("network", "Délai d'attente dépassé (Timeout) vers Tankerkönig.");
    }
    throw new TankerkoenigError("network", "Tankerkönig ist nicht erreichbar.");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429 || res.status === 503) {
    throw new TankerkoenigError(
      "quota",
      "Das Anfragekontingent von Tankerkönig ist erschöpft. Bitte kurz warten.",
    );
  }
  if (!res.ok) {
    throw new TankerkoenigError("upstream", `Tankerkönig-Fehler (${res.status}).`);
  }

  const json = (await res.json()) as { ok?: boolean; message?: string };
  if (json && json.ok === false) {
    const msg = json.message ?? "Unbekannter Fehler";
    const isApiKeyError = /apikey|key.*existiert|key.*deaktiviert|invalid.*key/i.test(msg);
    const isQuotaError = /limit|quota|too many/i.test(msg);

    if (isApiKeyError || isQuotaError) {
      throw new TankerkoenigError(
        isApiKeyError ? "missing-key" : "quota",
        isApiKeyError
          ? "Der Tankerkönig-API-Schlüssel wurde abgelehnt (ungültig oder deaktiviert)."
          : "Anfragekontingent überschritten. Bitte in einigen Minuten erneut versuchen.",
      );
    }
    throw new TankerkoenigError("upstream", msg);
  }
  return json;
}

/**
 * Stationen im Umkreis.
 */
export async function fetchStations(input: {
  lat: number;
  lng: number;
  radius: number;
}): Promise<Station[]> {
  const key_api = apiKey();
  if (!key_api) {
    throw new TankerkoenigError(
      "missing-key",
      "Kein gültiger Tankerkönig-API-Schlüssel konfiguriert. Bitte TANKERKOENIG_API_KEY hinterlegen.",
    );
  }

  const gridLat = input.lat.toFixed(2);
  const gridLng = input.lng.toFixed(2);
  const key = `list:${gridLat}:${gridLng}:${input.radius}`;

  const cached = readCache<Station[]>(key);
  if (cached) return cached;

  const url = `${BASE}/list.php?lat=${input.lat}&lng=${input.lng}&rad=${input.radius}&sort=dist&type=all&apikey=${key_api}`;
  const raw = await request(url);
  const parsed = listResponseSchema.parse(raw);
  const stations = (parsed.stations ?? []).map(normalizeStation);

  writeCache(key, stations, 5 * 60 * 1000);
  return stations;
}

/**
 * Aktualisierte Preise für bereits geladene Stationen.
 */
export async function fetchPrices(
  ids: string[],
): Promise<Record<string, { isOpen: boolean; prices: FuelPrices }>> {
  const key_api = apiKey();
  if (!key_api || ids.length === 0) {
    return {};
  }

  const sorted = [...ids].sort();
  const key = `prices:${sorted.join(",")}`;

  const cached = readCache<Record<string, { isOpen: boolean; prices: FuelPrices }>>(key);
  if (cached) return cached;

  try {
    const url = `${BASE}/prices.php?ids=${sorted.join(",")}&apikey=${key_api}`;
    const raw = await request(url);
    const parsed = pricesResponseSchema.parse(raw);

    const result: Record<string, { isOpen: boolean; prices: FuelPrices }> = {};
    for (const [id, entry] of Object.entries(parsed.prices ?? {})) {
      result[id] = normalizePrices(entry);
    }

    writeCache(key, result, 3 * 60 * 1000);
    return result;
  } catch (error) {
    console.error("[Tankerkönig Server] Échec de récupération des prix :", error);
    return {};
  }
}

/** Geocoding über Nominatim (Ort oder PLZ), auf Deutschland beschränkt. */
export async function geocode(
  query: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const key = `geo:${query.toLowerCase().trim()}`;
  const cached = readCache<{ lat: number; lng: number; label: string } | null>(key);
  if (cached !== null) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000); // 4s timeout

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q=${encodeURIComponent(query)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Tankstellen-Finder",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return null;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) return null;

  const json = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const first = json[0];
  const value = first
    ? {
        lat: Number(first.lat),
        lng: Number(first.lon),
        label: first.display_name.split(",").slice(0, 2).join(",").trim(),
      }
    : null;

  writeCache(key, value, 24 * 60 * 60 * 1000);
  return value;
}
