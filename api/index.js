var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/env.server.ts
import fs from "node:fs";
import path from "node:path";
function isPlaceholder(value) {
  if (!value) return true;
  if (/^0{8}-0{4}-0{4}-0{4}-0{12}$/i.test(value)) return true;
  if (/^0+$/.test(value)) return true;
  if (/^(placeholder|dummy|your_.*_here)$/i.test(value)) return true;
  return false;
}
function loadEnvFile() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
            val = val.slice(1, -1);
          }
          if (val && (!process.env[key] || isPlaceholder(process.env[key]))) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (e) {
    console.warn("[Env] Failed to load .env file:", e);
  }
}
var init_env_server = __esm({
  "src/lib/env.server.ts"() {
    "use strict";
    loadEnvFile();
  }
});

// src/lib/tankerkoenig.ts
import { z } from "zod";
function normalizeStation(raw) {
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
      diesel: toPrice(raw.diesel)
    }
  };
}
function normalizePrices(entry) {
  return {
    isOpen: entry.status === "open",
    prices: {
      e5: toPrice(entry.e5),
      e10: toPrice(entry.e10),
      diesel: toPrice(entry.diesel)
    }
  };
}
var priceSchema, toPrice, rawStationSchema, listResponseSchema, pricesEntrySchema, pricesResponseSchema, listInputSchema, pricesInputSchema, geocodeInputSchema;
var init_tankerkoenig = __esm({
  "src/lib/tankerkoenig.ts"() {
    "use strict";
    priceSchema = z.union([z.number(), z.literal(false), z.null()]).optional();
    toPrice = (value) => typeof value === "number" && value > 0 ? value : null;
    rawStationSchema = z.object({
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
      e10: priceSchema
    });
    listResponseSchema = z.object({
      ok: z.boolean(),
      message: z.string().optional(),
      status: z.string().optional(),
      stations: z.array(rawStationSchema).optional()
    });
    pricesEntrySchema = z.object({
      status: z.string(),
      e5: priceSchema,
      e10: priceSchema,
      diesel: priceSchema
    });
    pricesResponseSchema = z.object({
      ok: z.boolean(),
      message: z.string().optional(),
      prices: z.record(z.string(), pricesEntrySchema).optional()
    });
    listInputSchema = z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radius: z.number().min(1).max(25)
    });
    pricesInputSchema = z.object({
      ids: z.array(z.string().min(1)).min(1).max(100)
    });
    geocodeInputSchema = z.object({
      query: z.string().min(2).max(120)
    });
  }
});

// src/lib/tankerkoenig.server.ts
var tankerkoenig_server_exports = {};
__export(tankerkoenig_server_exports, {
  TankerkoenigError: () => TankerkoenigError,
  fetchPrices: () => fetchPrices,
  fetchStations: () => fetchStations,
  geocode: () => geocode
});
function readCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}
function writeCache(key, value, ttlMs) {
  if (cache.size > 200) cache.clear();
  cache.set(key, { value, expires: Date.now() + ttlMs });
}
function isInvalidKey(key) {
  if (!key) return true;
  const trimmed = key.trim();
  if (!trimmed) return true;
  if (/^0{8}-0{4}-0{4}-0{4}-0{12}$/i.test(trimmed)) return true;
  if (/^0+$/.test(trimmed)) return true;
  return false;
}
function apiKey() {
  const key = process.env["TANKERKOENIG_API_KEY"] || process.env["VITE_TANKERKOENIG_API_KEY"];
  if (isInvalidKey(key)) {
    console.warn(
      "[Tankerk\xF6nig Server] \u26A0\uFE0F Aucun cl\xE9 API valide trouv\xE9e dans les variables d'environnement."
    );
    return null;
  }
  return key.trim();
}
async function request(url, timeoutMs = 5e3) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    const errorObj = err;
    if (errorObj?.name === "AbortError") {
      throw new TankerkoenigError("network", "D\xE9lai d'attente d\xE9pass\xE9 (Timeout) vers Tankerk\xF6nig.");
    }
    throw new TankerkoenigError("network", "Tankerk\xF6nig ist nicht erreichbar.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429 || res.status === 503) {
    throw new TankerkoenigError(
      "quota",
      "Das Anfragekontingent von Tankerk\xF6nig ist ersch\xF6pft. Bitte kurz warten."
    );
  }
  if (!res.ok) {
    throw new TankerkoenigError("upstream", `Tankerk\xF6nig-Fehler (${res.status}).`);
  }
  const json = await res.json();
  if (json && json.ok === false) {
    const msg = json.message ?? "Unbekannter Fehler";
    const isApiKeyError = /apikey|key.*existiert|key.*deaktiviert|invalid.*key/i.test(msg);
    const isQuotaError = /limit|quota|too many/i.test(msg);
    if (isApiKeyError || isQuotaError) {
      throw new TankerkoenigError(
        isApiKeyError ? "missing-key" : "quota",
        isApiKeyError ? "Der Tankerk\xF6nig-API-Schl\xFCssel wurde abgelehnt (ung\xFCltig oder deaktiviert)." : "Anfragekontingent \xFCberschritten. Bitte in einigen Minuten erneut versuchen."
      );
    }
    throw new TankerkoenigError("upstream", msg);
  }
  return json;
}
async function fetchStations(input) {
  const key_api = apiKey();
  if (!key_api) {
    throw new TankerkoenigError(
      "missing-key",
      "Kein g\xFCltiger Tankerk\xF6nig-API-Schl\xFCssel konfiguriert. Bitte TANKERKOENIG_API_KEY hinterlegen."
    );
  }
  const gridLat = input.lat.toFixed(2);
  const gridLng = input.lng.toFixed(2);
  const key = `list:${gridLat}:${gridLng}:${input.radius}`;
  const cached = readCache(key);
  if (cached) return cached;
  const url = `${BASE}/list.php?lat=${input.lat}&lng=${input.lng}&rad=${input.radius}&sort=dist&type=all&apikey=${key_api}`;
  const raw = await request(url);
  const parsed = listResponseSchema.parse(raw);
  const stations = (parsed.stations ?? []).map(normalizeStation);
  writeCache(key, stations, 5 * 60 * 1e3);
  return stations;
}
async function fetchPrices(ids) {
  const key_api = apiKey();
  if (!key_api || ids.length === 0) {
    return {};
  }
  const sorted = [...ids].sort();
  const key = `prices:${sorted.join(",")}`;
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const url = `${BASE}/prices.php?ids=${sorted.join(",")}&apikey=${key_api}`;
    const raw = await request(url);
    const parsed = pricesResponseSchema.parse(raw);
    const result = {};
    for (const [id, entry] of Object.entries(parsed.prices ?? {})) {
      result[id] = normalizePrices(entry);
    }
    writeCache(key, result, 3 * 60 * 1e3);
    return result;
  } catch (error) {
    console.error("[Tankerk\xF6nig Server] \xC9chec de r\xE9cup\xE9ration des prix :", error);
    return {};
  }
}
async function geocode(query) {
  const key = `geo:${query.toLowerCase().trim()}`;
  const cached = readCache(key);
  if (cached !== null) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4e3);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q=${encodeURIComponent(query)}`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Tankstellen-Finder",
        Accept: "application/json"
      },
      signal: controller.signal
    });
  } catch {
    clearTimeout(timer);
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return null;
  const json = await res.json();
  const first = json[0];
  const value = first ? {
    lat: Number(first.lat),
    lng: Number(first.lon),
    label: first.display_name.split(",").slice(0, 2).join(",").trim()
  } : null;
  writeCache(key, value, 24 * 60 * 60 * 1e3);
  return value;
}
var BASE, cache, TankerkoenigError;
var init_tankerkoenig_server = __esm({
  "src/lib/tankerkoenig.server.ts"() {
    "use strict";
    init_env_server();
    init_tankerkoenig();
    BASE = "https://creativecommons.tankerkoenig.de/json";
    cache = /* @__PURE__ */ new Map();
    TankerkoenigError = class extends Error {
      kind;
      constructor(kind, message) {
        super(message);
        this.kind = kind;
        this.name = "TankerkoenigError";
      }
    };
  }
});

// src/integrations/supabase/client.server.ts
var client_server_exports = {};
__export(client_server_exports, {
  isServiceRoleKeyValid: () => isServiceRoleKeyValid,
  supabaseAdmin: () => supabaseAdmin
});
import { createClient } from "@supabase/supabase-js";
function isNewSupabaseApiKey(value) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}
function extractProjectRef(url) {
  if (!url) return null;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\./);
  return match ? match[1] : null;
}
function extractJwtRef(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      return payload.ref ?? null;
    }
  } catch {
  }
  return null;
}
function isServiceRoleKeyValid() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return false;
  const trimmed = key.trim();
  if (!trimmed || trimmed === "placeholder-service-key") return false;
  if (trimmed.startsWith("sb_secret_")) return true;
  const expectedRef = extractProjectRef(url);
  const tokenRef = extractJwtRef(trimmed);
  if (expectedRef && tokenRef && tokenRef !== expectedRef) {
    return false;
  }
  return true;
}
function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : void 0
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}
function createMockClient() {
  return createClient("https://placeholder.supabase.co", "placeholder-service-key", {
    global: {
      fetch: () => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    },
    auth: {
      storage: void 0,
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  let SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL) {
    console.warn("[Supabase] Missing SUPABASE_URL. Using mock fallback.");
    return createMockClient();
  }
  const validServiceKey = isServiceRoleKeyValid();
  if (!validServiceKey) {
    const tokenRef = extractJwtRef(SUPABASE_SERVICE_ROLE_KEY);
    const expectedRef = extractProjectRef(SUPABASE_URL);
    if (tokenRef && expectedRef && tokenRef !== expectedRef) {
      console.warn(
        `[Supabase] SUPABASE_SERVICE_ROLE_KEY belongs to project "${tokenRef}", but SUPABASE_URL is for "${expectedRef}". Falling back to publishable key for queries.`
      );
    }
    SUPABASE_SERVICE_ROLE_KEY = SUPABASE_PUBLISHABLE_KEY;
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[Supabase] Missing valid Supabase key. Using mock fallback.");
    return createMockClient();
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY)
    },
    auth: {
      storage: void 0,
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
var _supabaseAdmin, supabaseAdmin;
var init_client_server = __esm({
  "src/integrations/supabase/client.server.ts"() {
    "use strict";
    init_env_server();
    supabaseAdmin = new Proxy({}, {
      get(_, prop, receiver) {
        if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
        return Reflect.get(_supabaseAdmin, prop, receiver);
      }
    });
  }
});

// server.ts
init_env_server();
init_tankerkoenig();
import express from "express";
import path2 from "path";

// src/lib/route-input.ts
import { z as z2 } from "zod";
var coordsSchema = z2.object({
  lat: z2.number().min(-90).max(90),
  lng: z2.number().min(-180).max(180)
});
var planRouteInputSchema = z2.object({
  origin: coordsSchema,
  destination: coordsSchema
});
var routeStationsInputSchema = z2.object({
  origin: coordsSchema,
  destination: coordsSchema,
  corridorKm: z2.number().min(0.5).max(10),
  fuelType: z2.enum(["e5", "e10", "diesel"])
});
var suggestInputSchema = z2.object({
  query: z2.string().min(3).max(120)
});

// src/lib/trend-input.ts
import { z as z3 } from "zod";
var fuel = z3.enum(["e5", "e10", "diesel"]);
var historyInputSchema = z3.object({
  stationId: z3.string().min(1).max(64),
  fuelType: fuel,
  days: z3.union([z3.literal(7), z3.literal(14), z3.literal(30)]).default(7)
});
var trendInputSchema = z3.object({
  stationId: z3.string().min(1).max(64),
  fuelType: fuel,
  days: z3.union([z3.literal(7), z3.literal(14), z3.literal(30)]).default(7),
  current: z3.number().positive().nullish()
});
var summariesInputSchema = z3.object({
  fuelType: fuel,
  stations: z3.array(
    z3.object({
      id: z3.string().min(1).max(64),
      current: z3.number().positive().nullish()
    })
  ).min(1).max(60)
});

// src/lib/community-input.ts
import { z as z4 } from "zod";
var fuel2 = z4.enum(["e5", "e10", "diesel"]);
var stationId = z4.string().min(1).max(64);
var contributorId = z4.string().regex(/^(clerk:[A-Za-z0-9_-]{4,60}|[0-9a-f-]{36})$/i, "invalid contributor");
var lat = z4.number().min(-90).max(90);
var lng = z4.number().min(-180).max(180);
var reportInputSchema = z4.object({
  stationId,
  fuelType: fuel2,
  contributorId,
  reportedPrice: z4.number().min(0.5).max(5).nullish(),
  comment: z4.string().trim().max(200).nullish(),
  lat: lat.nullish(),
  lng: lng.nullish()
});
var confirmInputSchema = z4.object({
  stationId,
  fuelType: fuel2,
  contributorId,
  lat,
  lng
});
var statusInputSchema = z4.object({
  stationId,
  fuelType: fuel2
});
var statusesInputSchema = z4.object({
  fuelType: fuel2,
  stationIds: z4.array(stationId).min(1).max(60)
});

// src/lib/account-input.ts
import { z as z5 } from "zod";
var fuel3 = z5.enum(["e5", "e10", "diesel"]);
var stationSchema = z5.object({
  id: z5.string().min(1).max(64),
  name: z5.string().default(""),
  brand: z5.string().default(""),
  street: z5.string().default(""),
  houseNumber: z5.string().default(""),
  postCode: z5.string().default(""),
  place: z5.string().default(""),
  lat: z5.number(),
  lng: z5.number(),
  dist: z5.number().default(0),
  isOpen: z5.boolean().default(false),
  prices: z5.object({
    e5: z5.number().nullable(),
    e10: z5.number().nullable(),
    diesel: z5.number().nullable()
  })
});
var tripSchema = z5.object({
  id: z5.string().min(1).max(64),
  name: z5.string().min(1).max(80),
  createdAt: z5.number().optional(),
  from: z5.unknown().optional(),
  to: z5.unknown().optional()
}).passthrough();
var setFavoriteSchema = z5.object({
  station: stationSchema,
  favorite: z5.boolean()
});
var saveTripSchema = z5.object({ trip: tripSchema });
var idSchema = z5.object({ id: z5.string().min(1).max(80) });
var syncSchema = z5.object({
  favorites: z5.array(stationSchema).max(200).default([]),
  trips: z5.array(tripSchema).max(100).default([]),
  username: z5.string().max(80).nullish(),
  avatarUrl: z5.string().max(500).nullish()
});
var upsertAlertSchema = z5.object({
  stationId: z5.string().min(1).max(64),
  stationName: z5.string().max(120).default(""),
  fuelType: fuel3,
  threshold: z5.number().min(0.5).max(5)
});
var toggleAlertSchema = z5.object({
  id: z5.string().uuid(),
  active: z5.boolean()
});

// server.ts
init_tankerkoenig_server();

// src/lib/price-history.server.ts
var FUELS = ["e5", "e10", "diesel"];
async function admin() {
  const { supabaseAdmin: supabaseAdmin2 } = await Promise.resolve().then(() => (init_client_server(), client_server_exports));
  return supabaseAdmin2;
}
async function upsertSeenStations(stations) {
  if (stations.length === 0) return;
  try {
    const { isServiceRoleKeyValid: isServiceRoleKeyValid2 } = await Promise.resolve().then(() => (init_client_server(), client_server_exports));
    if (!isServiceRoleKeyValid2()) {
      return;
    }
    const db = await admin();
    const rows = stations.slice(0, 200).map((s) => ({
      id: s.id,
      name: s.name,
      brand: s.brand,
      street: s.street,
      house_number: s.houseNumber,
      post_code: s.postCode,
      place: s.place,
      lat: s.lat,
      lng: s.lng,
      last_seen_at: (/* @__PURE__ */ new Date()).toISOString()
    }));
    const { error } = await db.from("stations").upsert(rows, { onConflict: "id" });
    if (error) console.warn("[price-history] upsertSeenStations \xFCbersprungen:", error.message);
  } catch (err) {
    console.warn("[price-history] upsertSeenStations Fehler:", err?.message || err);
  }
}
async function readHistory(stationId2, fuel4, days) {
  const db = await admin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString();
  const { data, error } = await db.from("price_history").select("price, recorded_at").eq("station_id", stationId2).eq("fuel_type", fuel4).gte("recorded_at", since).order("recorded_at", { ascending: true }).limit(5e3);
  if (error) {
    console.warn("[price-history] readHistory nicht verf\xFCgbar:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    t: new Date(row.recorded_at).getTime(),
    price: Number(row.price)
  }));
}
async function collectablePool(limit, afterId) {
  const db = await admin();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1e3).toISOString();
  let query = db.from("stations").select("id").gte("last_seen_at", since).order("id", { ascending: true }).limit(limit);
  if (afterId) query = query.gt("id", afterId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}
async function lastKnownPrices(ids) {
  const db = await admin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString();
  const { data, error } = await db.from("price_history").select("station_id, fuel_type, price, recorded_at").in("station_id", ids).gte("recorded_at", since).order("recorded_at", { ascending: true }).limit(2e4);
  if (error) throw new Error(error.message);
  const map = /* @__PURE__ */ new Map();
  for (const row of data ?? []) {
    map.set(`${row.station_id}:${row.fuel_type}`, Number(row.price));
  }
  return map;
}
function diffRows(snapshots, known, recordedAt = /* @__PURE__ */ new Date()) {
  const rows = [];
  for (const snap of snapshots) {
    for (const fuel4 of FUELS) {
      const price = snap.prices[fuel4];
      if (price === null || !Number.isFinite(price) || price <= 0) continue;
      const previous = known.get(`${snap.stationId}:${fuel4}`);
      if (previous !== void 0 && Math.abs(previous - price) < 5e-4) continue;
      rows.push({
        station_id: snap.stationId,
        fuel_type: fuel4,
        price,
        recorded_at: recordedAt.toISOString()
      });
    }
  }
  return rows;
}
async function insertHistoryRows(rows) {
  if (rows.length === 0) return 0;
  const db = await admin();
  const { error } = await db.from("price_history").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
async function acquireLease(minutes = 5) {
  const db = await admin();
  const { data: current } = await db.from("collector_state").select("status, lease_until, cursor").eq("id", "prices").maybeSingle();
  const state = current ?? null;
  const leased = state?.lease_until ? new Date(state.lease_until).getTime() : 0;
  if (leased > Date.now()) return { acquired: false, state };
  const { error } = await db.from("collector_state").update({
    lease_until: new Date(Date.now() + minutes * 60 * 1e3).toISOString(),
    last_run_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", "prices");
  if (error) throw new Error(error.message);
  return { acquired: true, state };
}
async function releaseLease(patch) {
  const db = await admin();
  await db.from("collector_state").update({
    status: patch.status,
    cursor: patch.cursor ?? null,
    last_error: patch.lastError ?? null,
    lease_until: null,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", "prices");
}
async function readHistoryBulk(stationIds, fuel4, days) {
  const map = /* @__PURE__ */ new Map();
  if (stationIds.length === 0) return map;
  const db = await admin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString();
  const { data, error } = await db.from("price_history").select("station_id, price, recorded_at").in("station_id", stationIds.slice(0, 60)).eq("fuel_type", fuel4).gte("recorded_at", since).order("recorded_at", { ascending: true }).limit(2e4);
  if (error) {
    console.warn("[price-history] readHistoryBulk nicht verf\xFCgbar:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const list = map.get(row.station_id) ?? [];
    list.push({ t: new Date(row.recorded_at).getTime(), price: Number(row.price) });
    map.set(row.station_id, list);
  }
  return map;
}

// src/lib/geo.ts
var EARTH_RADIUS_KM = 6371.0088;
var toRad = (deg) => deg * Math.PI / 180;
function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
function project(point, originLat) {
  return {
    x: toRad(point.lng) * Math.cos(toRad(originLat)) * EARTH_RADIUS_KM,
    y: toRad(point.lat) * EARTH_RADIUS_KM
  };
}
function distancePointToSegmentKm(p, a, b) {
  const originLat = (a.lat + b.lat) / 2;
  const pp = project(p, originLat);
  const pa = project(a, originLat);
  const pb = project(b, originLat);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return haversineKm(p, a);
  let t = ((pp.x - pa.x) * dx + (pp.y - pa.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closest = {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t
  };
  return haversineKm(p, closest);
}
function distanceToPolylineKm(point, polyline) {
  if (polyline.length === 0) return { km: Number.POSITIVE_INFINITY, segmentIndex: -1 };
  if (polyline.length === 1) {
    return { km: haversineKm(point, polyline[0]), segmentIndex: 0 };
  }
  let best = Number.POSITIVE_INFINITY;
  let bestIndex = 0;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const d = distancePointToSegmentKm(point, polyline[i], polyline[i + 1]);
    if (d < best) {
      best = d;
      bestIndex = i;
    }
  }
  return { km: best, segmentIndex: bestIndex };
}
function samplePolyline(polyline, stepKm) {
  if (polyline.length === 0) return [];
  if (polyline.length === 1 || stepKm <= 0) return [polyline[0]];
  const samples = [polyline[0]];
  let carried = 0;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const segment = haversineKm(a, b);
    if (segment === 0) continue;
    let position = stepKm - carried;
    while (position <= segment) {
      const t = position / segment;
      samples.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t
      });
      position += stepKm;
    }
    carried = (carried + segment) % stepKm;
  }
  const last = polyline[polyline.length - 1];
  const tail = samples[samples.length - 1];
  if (haversineKm(tail, last) > stepKm / 4) samples.push(last);
  return samples;
}

// src/lib/route-score.ts
var TANK_LITERS = 50;
var DETOUR_SPEED_KMH = 45;
var DETOUR_FIXED_MIN = 2;
var DETOUR_CONSUMPTION = 7;
var TIME_VALUE_EUR_H = 12;
function estimateDetour(corridorDistanceKm) {
  const detourKm = corridorDistanceKm * 2;
  const detourMin = detourKm / DETOUR_SPEED_KMH * 60 + DETOUR_FIXED_MIN;
  return { detourKm, detourMin };
}
function detourScore(price, referencePrice, detour) {
  if (price === null || referencePrice === null) return Number.NEGATIVE_INFINITY;
  const savings = (referencePrice - price) * TANK_LITERS;
  const fuelCost = detour.detourKm * DETOUR_CONSUMPTION / 100 * price;
  const timeCost = detour.detourMin / 60 * TIME_VALUE_EUR_H;
  return savings - fuelCost - timeCost;
}
function medianPrice(prices) {
  const values = prices.filter((p) => p !== null).sort((a, b) => a - b);
  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
}

// src/lib/routing.ts
var RoutingError = class extends Error {
  kind;
  constructor(kind, message) {
    super(message);
    this.kind = kind;
    this.name = "RoutingError";
  }
};
var TIMEOUT_MS = 8e3;
async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "Tankstellen-Finder" }
    });
    if (!res.ok) {
      throw new RoutingError("upstream", `Routing-Dienst antwortete mit ${res.status}.`);
    }
    return await res.json();
  } catch (error) {
    if (error instanceof RoutingError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new RoutingError("timeout", "Die Routenberechnung hat zu lange gedauert.");
    }
    throw new RoutingError("network", "Der Routing-Dienst ist nicht erreichbar.");
  } finally {
    clearTimeout(timer);
  }
}
var osrmProvider = {
  name: "osrm",
  async route(origin, destination) {
    const base = process.env["OSRM_BASE_URL"] ?? "https://router.project-osrm.org";
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `${base}/route/v1/driving/${coords}?overview=simplified&geometries=geojson&alternatives=false&steps=false`;
    let json;
    try {
      json = await fetchJson(url);
    } catch (error) {
      if (error instanceof RoutingError && error.kind === "no-route") throw error;
      json = await fetchJson(url);
    }
    const payload = json;
    const route = payload.routes?.[0];
    if (payload.code !== "Ok" || !route?.geometry?.coordinates?.length) {
      throw new RoutingError("no-route", "Zwischen Start und Ziel wurde keine Route gefunden.");
    }
    return {
      polyline: route.geometry.coordinates.map(([lng2, lat2]) => ({ lat: lat2, lng: lng2 })),
      distanceKm: (route.distance ?? 0) / 1e3,
      durationMin: (route.duration ?? 0) / 60
    };
  }
};
function routingProvider() {
  return osrmProvider;
}

// src/lib/route.server.ts
var cache2 = /* @__PURE__ */ new Map();
function readCache2(key) {
  const hit = cache2.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache2.delete(key);
    return null;
  }
  return hit.value;
}
function writeCache2(key, value, ttlMs) {
  if (cache2.size > 100) cache2.clear();
  cache2.set(key, { value, expires: Date.now() + ttlMs });
}
var round = (value) => value.toFixed(4);
async function planRouteServer(origin, destination) {
  const key = `route:${round(origin.lat)},${round(origin.lng)}->${round(destination.lat)},${round(destination.lng)}`;
  const cached = readCache2(key);
  if (cached) return cached;
  const route = await routingProvider().route(origin, destination);
  const value = {
    polyline: route.polyline,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin
  };
  writeCache2(key, value, 60 * 60 * 1e3);
  return value;
}
var MAX_PROBES = 12;
async function collectRouteStations(route, corridorKm, fuel4) {
  const { fetchStations: fetchStations2 } = await Promise.resolve().then(() => (init_tankerkoenig_server(), tankerkoenig_server_exports));
  const searchRadius = Math.min(25, Math.max(corridorKm + 4, 5));
  let stepKm = searchRadius * 1.4;
  let probes = samplePolyline(route.polyline, stepKm);
  if (probes.length > MAX_PROBES) {
    stepKm = Math.max(stepKm, route.distanceKm / MAX_PROBES);
    probes = samplePolyline(route.polyline, stepKm).slice(0, MAX_PROBES);
  }
  const unique = /* @__PURE__ */ new Map();
  const results = await Promise.allSettled(
    probes.map((point) => fetchStations2({ lat: point.lat, lng: point.lng, radius: searchRadius }))
  );
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const station of result.value) {
      if (!unique.has(station.id)) unique.set(station.id, station);
    }
  }
  if (unique.size === 0 && results.every((r) => r.status === "rejected")) {
    const first = results[0];
    if (first && first.status === "rejected") throw first.reason;
  }
  const inCorridor = [];
  for (const station of unique.values()) {
    const { km } = distanceToPolylineKm({ lat: station.lat, lng: station.lng }, route.polyline);
    if (km <= corridorKm) inCorridor.push({ station, corridorKm: km });
  }
  const reference = medianPrice(inCorridor.map((e) => e.station.prices[fuel4]));
  return inCorridor.map(({ station, corridorKm: distance }) => {
    const detour = estimateDetour(distance);
    return {
      // `dist` bezeichnet in der Trajet-Ansicht den Abstand zur Route.
      station: { ...station, dist: distance },
      corridorKm: distance,
      detourKm: detour.detourKm,
      detourMin: detour.detourMin,
      score: detourScore(station.prices[fuel4], reference, detour)
    };
  });
}

// src/lib/nominatim.server.ts
var cache3 = /* @__PURE__ */ new Map();
async function searchPlaces(query) {
  const key = query.toLowerCase().trim();
  const hit = cache3.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&countrycodes=de&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Tankstellen-Finder",
      Accept: "application/json"
    }
  });
  if (!res.ok) return [];
  const json = await res.json();
  const value = json.map((item) => ({
    label: item.display_name.split(",").slice(0, 3).join(",").trim(),
    lat: Number(item.lat),
    lng: Number(item.lon)
  }));
  if (cache3.size > 200) cache3.clear();
  cache3.set(key, { value, expires: Date.now() + 24 * 60 * 60 * 1e3 });
  return value;
}

// src/lib/trend.ts
var MIN_DISTINCT_DAYS = 4;
var MIN_SAMPLES = 20;
var round3 = (v) => Math.round(v * 1e3) / 1e3;
var berlin = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit"
});
function berlinParts(ms) {
  const parts = berlin.formatToParts(new Date(ms));
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "0";
  const hour = Number(get("hour")) % 24;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour };
}
function percentileOf(values, value) {
  if (values.length === 0) return 50;
  const below = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  return (below + equal / 2) / values.length * 100;
}
function classify(percentile) {
  if (percentile < 25) return "low";
  if (percentile > 75) return "high";
  return "mid";
}
function hourlyPattern(points) {
  const buckets = /* @__PURE__ */ new Map();
  for (const p of points) {
    const { hour } = berlinParts(p.t);
    const b = buckets.get(hour) ?? { sum: 0, n: 0 };
    b.sum += p.price;
    b.n += 1;
    buckets.set(hour, b);
  }
  return [...buckets.entries()].map(([hour, b]) => ({ hour, avg: round3(b.sum / b.n), samples: b.n })).sort((a, b) => a.hour - b.hour);
}
function extremes(hourly) {
  const solid = hourly.filter((h) => h.samples >= 2);
  if (solid.length < 4) return { trough: null, peak: null };
  let trough = solid[0];
  let peak = solid[0];
  for (const h of solid) {
    if (h.avg < trough.avg) trough = h;
    if (h.avg > peak.avg) peak = h;
  }
  return { trough, peak };
}
var hoursUntil = (from, to) => (to - from + 24) % 24;
function computeTrend({
  fuel: fuel4,
  days,
  points,
  current,
  now = Date.now()
}) {
  const prices = points.map((p) => p.price);
  const distinctDays = new Set(points.map((p) => berlinParts(p.t).day)).size;
  const confident = distinctDays >= MIN_DISTINCT_DAYS && points.length >= MIN_SAMPLES;
  const base = {
    fuel: fuel4,
    days,
    samples: points.length,
    distinctDays,
    confident,
    current,
    min: prices.length ? round3(Math.min(...prices)) : null,
    max: prices.length ? round3(Math.max(...prices)) : null,
    avg: prices.length ? round3(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    percentile: null,
    classification: null,
    hourly: hourlyPattern(points),
    troughHour: null,
    peakHour: null,
    recommendation: null
  };
  if (current !== null && prices.length >= 5) {
    const percentile = Math.round(percentileOf(prices, current));
    base.percentile = percentile;
    base.classification = classify(percentile);
  }
  const { trough, peak } = extremes(base.hourly);
  base.troughHour = trough?.hour ?? null;
  base.peakHour = peak?.hour ?? null;
  if (!confident || !trough || !peak) return base;
  const nowHour = berlinParts(now).hour;
  const untilTrough = hoursUntil(nowHour, trough.hour);
  const spread = peak.avg - trough.avg;
  if (spread < 0.02) return base;
  if (untilTrough <= 1 || untilTrough >= 23) {
    base.recommendation = {
      kind: "good-now",
      hour: trough.hour,
      text: "Guter Zeitpunkt \u2013 du bist im \xFCblichen Tagestief."
    };
  } else if (untilTrough <= 6) {
    base.recommendation = {
      kind: "wait",
      hour: trough.hour,
      text: `Der Preis f\xE4llt \xFCblicherweise gegen ${trough.hour} Uhr \u2013 wenn m\xF6glich warten.`
    };
  }
  return base;
}

// src/lib/community.ts
var WINDOW_HOURS = 48;
var HALF_LIFE_HOURS = 12;
var MIN_WEIGHT = 2;
var SCORE_THRESHOLD = 0.34;
var CONFIRM_RADIUS_M = 500;
function freshnessWeight(createdAt, now = Date.now()) {
  const ageHours = (now - createdAt) / 36e5;
  if (ageHours < 0) return 1;
  if (ageHours > WINDOW_HOURS) return 0;
  return 0.5 ** (ageHours / HALF_LIFE_HOURS);
}
function sumWeights(items, now) {
  return items.reduce((sum, item) => sum + freshnessWeight(item.createdAt, now), 0);
}
function classifyCommunity(confirmations, reports, now = Date.now()) {
  const c = sumWeights(confirmations, now);
  const r = sumWeights(reports, now);
  const total = c + r;
  if (total < MIN_WEIGHT) return "neutral";
  const score = (c - r) / total;
  if (score >= SCORE_THRESHOLD) return "confirmed";
  if (score <= -SCORE_THRESHOLD) return "disputed";
  return "neutral";
}
function buildStatus(stationId2, fuelType, confirmations, reports, now = Date.now()) {
  const inWindow = (a) => freshnessWeight(a.createdAt, now) > 0;
  const c = confirmations.filter(inWindow);
  const r = reports.filter(inWindow);
  const last = [...c, ...r].reduce((max, a) => Math.max(max, a.createdAt), 0);
  return {
    stationId: stationId2,
    fuelType,
    status: classifyCommunity(c, r, now),
    confirmationsCount: c.length,
    reportsCount: r.length,
    lastActivityAt: last > 0 ? new Date(last).toISOString() : null
  };
}
function distanceMeters(a, b) {
  const R = 63710088e-1;
  const toRad2 = (deg) => deg * Math.PI / 180;
  const dLat = toRad2(b.lat - a.lat);
  const dLng = toRad2(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad2(a.lat)) * Math.cos(toRad2(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function isNearStation(user, station) {
  return distanceMeters(user, station) <= CONFIRM_RADIUS_M;
}
function coarsen(value) {
  return Math.round(value * 1e3) / 1e3;
}
var BLOCKED = [
  "arschloch",
  "fotze",
  "wichser",
  "hurensohn",
  "nazi",
  "fuck",
  "bitch",
  "connard",
  "salope"
];
function containsBlockedWords(text) {
  const normalized = text.toLowerCase();
  return BLOCKED.some((word) => normalized.includes(word));
}
var RATE_LIMITS = {
  /** Gleiche Station + Sorte: 1 Aktion pro Stunde und Typ. */
  perStationFuelHours: 1,
  /** Gesamtbudget pro Beitragender:r und Tag. */
  perDay: 10
};

// src/lib/community.server.ts
async function admin2() {
  const { supabaseAdmin: supabaseAdmin2 } = await Promise.resolve().then(() => (init_client_server(), client_server_exports));
  return supabaseAdmin2;
}
var HOUR = 36e5;
async function stationCoords(stationId2) {
  const db = await admin2();
  const { data, error } = await db.from("stations").select("lat, lng").eq("id", stationId2).maybeSingle();
  if (error || !data) return null;
  return { lat: data.lat, lng: data.lng };
}
async function overDailyLimit(contributorId2, max) {
  const db = await admin2();
  const since = new Date(Date.now() - 24 * HOUR).toISOString();
  const [reports, confirmations] = await Promise.all([
    db.from("price_reports").select("id", { count: "exact", head: true }).eq("contributor_id", contributorId2).gte("created_at", since),
    db.from("price_confirmations").select("id", { count: "exact", head: true }).eq("contributor_id", contributorId2).gte("created_at", since)
  ]);
  return (reports.count ?? 0) + (confirmations.count ?? 0) >= max;
}
async function actedRecently(table, contributorId2, stationId2, fuelType, hours) {
  const db = await admin2();
  const since = new Date(Date.now() - hours * HOUR).toISOString();
  const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq("contributor_id", contributorId2).eq("station_id", stationId2).eq("fuel_type", fuelType).gte("created_at", since);
  return (count ?? 0) > 0;
}
async function insertReport(row) {
  const db = await admin2();
  const { error } = await db.from("price_reports").insert(row);
  if (error) throw new Error(error.message);
}
async function insertConfirmation(row) {
  const db = await admin2();
  const { error } = await db.from("price_confirmations").insert(row);
  if (error) throw new Error(error.message);
}
async function readActivity(stationIds, fuelType) {
  const confirmations = /* @__PURE__ */ new Map();
  const reports = /* @__PURE__ */ new Map();
  if (stationIds.length === 0) return { confirmations, reports };
  const db = await admin2();
  const since = new Date(Date.now() - WINDOW_HOURS * HOUR).toISOString();
  const ids = stationIds.slice(0, 60);
  const [conf, rep] = await Promise.all([
    db.from("price_confirmations").select("station_id, created_at").in("station_id", ids).eq("fuel_type", fuelType).gte("created_at", since).limit(5e3),
    db.from("price_reports").select("station_id, created_at").in("station_id", ids).eq("fuel_type", fuelType).gte("created_at", since).limit(5e3)
  ]);
  for (const row of conf.data ?? []) {
    const list = confirmations.get(row.station_id) ?? [];
    list.push({ createdAt: new Date(row.created_at).getTime() });
    confirmations.set(row.station_id, list);
  }
  for (const row of rep.data ?? []) {
    const list = reports.get(row.station_id) ?? [];
    list.push({ createdAt: new Date(row.created_at).getTime() });
    reports.set(row.station_id, list);
  }
  return { confirmations, reports };
}

// src/lib/clerk.server.ts
import { verifyToken } from "@clerk/backend";
async function clerkUserIdFromToken(token) {
  const secretKey = process.env["CLERK_SECRET_KEY"];
  if (!token || !secretKey) return null;
  try {
    const claims = await verifyToken(token, { secretKey });
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

// src/lib/account.server.ts
async function admin3() {
  const { supabaseAdmin: supabaseAdmin2 } = await Promise.resolve().then(() => (init_client_server(), client_server_exports));
  return supabaseAdmin2;
}
async function upsertProfile(clerkUserId, username, avatarUrl) {
  const db = await admin3();
  await db.from("profiles").upsert(
    {
      clerk_user_id: clerkUserId,
      username,
      avatar_url: avatarUrl,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "clerk_user_id" }
  );
}
async function listFavorites(clerkUserId) {
  const db = await admin3();
  const { data } = await db.from("user_favorites").select("station").eq("clerk_user_id", clerkUserId).order("created_at", { ascending: false });
  return (data ?? []).map((row) => row.station);
}
async function addFavorite(clerkUserId, station) {
  const db = await admin3();
  await db.from("user_favorites").upsert(
    {
      clerk_user_id: clerkUserId,
      station_id: station.id,
      station
    },
    { onConflict: "clerk_user_id,station_id" }
  );
}
async function removeFavorite(clerkUserId, stationId2) {
  const db = await admin3();
  await db.from("user_favorites").delete().eq("clerk_user_id", clerkUserId).eq("station_id", stationId2);
}
async function listTrips(clerkUserId) {
  const db = await admin3();
  const { data } = await db.from("user_trips").select("trip").eq("clerk_user_id", clerkUserId).order("created_at", { ascending: false });
  return (data ?? []).map((row) => row.trip);
}
async function addTrip(clerkUserId, trip) {
  const db = await admin3();
  await db.from("user_trips").upsert(
    {
      clerk_user_id: clerkUserId,
      name: trip.name,
      trip
    },
    { onConflict: "clerk_user_id,name" }
  );
}
async function removeTrip(clerkUserId, tripId) {
  const db = await admin3();
  const { data } = await db.from("user_trips").select("id, trip").eq("clerk_user_id", clerkUserId);
  const match = (data ?? []).find(
    (row) => row.trip?.id === tripId
  );
  if (!match) return;
  await db.from("user_trips").delete().eq("id", match.id);
}
async function listAlerts(clerkUserId) {
  const db = await admin3();
  const { data } = await db.from("price_alerts").select("id, station_id, station_name, fuel_type, threshold, active").eq("clerk_user_id", clerkUserId).order("created_at", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    fuelType: row.fuel_type,
    threshold: Number(row.threshold),
    active: row.active,
    currentPrice: null
  }));
}
async function upsertAlert(clerkUserId, input) {
  const db = await admin3();
  await db.from("price_alerts").upsert(
    {
      clerk_user_id: clerkUserId,
      station_id: input.stationId,
      station_name: input.stationName,
      fuel_type: input.fuelType,
      threshold: input.threshold,
      active: true
    },
    { onConflict: "clerk_user_id,station_id,fuel_type" }
  );
}
async function setAlertActive(clerkUserId, id, active) {
  const db = await admin3();
  await db.from("price_alerts").update({ active }).eq("clerk_user_id", clerkUserId).eq("id", id);
}
async function deleteAlert(clerkUserId, id) {
  const db = await admin3();
  await db.from("price_alerts").delete().eq("clerk_user_id", clerkUserId).eq("id", id);
}
async function latestPrices(stationIds) {
  if (stationIds.length === 0) return {};
  const db = await admin3();
  const { data } = await db.from("price_history").select("station_id, fuel_type, price, recorded_at").in("station_id", stationIds).order("recorded_at", { ascending: false }).limit(500);
  const out = {};
  for (const row of data ?? []) {
    const entry = out[row.station_id] ??= {};
    if (entry[row.fuel_type] === void 0) entry[row.fuel_type] = Number(row.price);
  }
  return out;
}

// server.ts
var app = express();
var PORT = 3e3;
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req._body = true;
  }
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use((req, _res, next) => {
  if (process.env["VERCEL"] && req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  next();
});
async function getAuthUserId(req) {
  const token = req.headers["x-clerk-token"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return clerkUserIdFromToken(token);
}
app.post("/api/stations/list", async (req, res) => {
  try {
    const data = listInputSchema.parse(req.body);
    const stations = await fetchStations(data);
    if (stations.length > 0) {
      upsertSeenStations(stations).catch(
        (err) => console.warn("[DB] Enregistrement d'historique ignor\xE9 :", err?.message || err)
      );
    }
    res.json({ ok: true, stations, fetchedAt: Date.now() });
  } catch (error) {
    const err = error;
    if (err?.name === "TankerkoenigError" || err?.kind) {
      res.json({
        ok: false,
        error: { kind: err.kind ?? "upstream", message: err.message ?? "Fehler" }
      });
      return;
    }
    console.error("[listStations] Erreur :", error);
    res.json({
      ok: false,
      error: { kind: "upstream", message: "Donn\xE9es temporairement indisponibles." }
    });
  }
});
app.post("/api/stations/refresh", async (req, res) => {
  try {
    const data = pricesInputSchema.parse(req.body);
    const updates = await fetchPrices(data.ids);
    res.json({ ok: true, updates, fetchedAt: Date.now() });
  } catch (error) {
    const err = error;
    if (err?.name === "TankerkoenigError" || err?.kind) {
      res.json({
        ok: false,
        error: { kind: err.kind ?? "upstream", message: err.message ?? "Fehler" }
      });
      return;
    }
    console.error("[refreshPrices] Erreur :", error);
    res.json({
      ok: false,
      error: { kind: "upstream", message: "Impossible de mettre \xE0 jour les prix." }
    });
  }
});
app.post("/api/stations/geocode", async (req, res) => {
  try {
    const data = geocodeInputSchema.parse(req.body);
    const hit = await geocode(data.query);
    if (!hit) {
      res.json({
        ok: false,
        error: { kind: "upstream", message: "Kein Ort mit diesem Namen gefunden." }
      });
      return;
    }
    res.json({ ok: true, ...hit });
  } catch (error) {
    const err = error;
    if (err?.name === "TankerkoenigError" || err?.kind) {
      res.json({
        ok: false,
        error: { kind: err.kind ?? "upstream", message: err.message ?? "Fehler" }
      });
      return;
    }
    console.error("[geocodePlace] Erreur :", error);
    res.json({ ok: false, error: { kind: "upstream", message: "Ortssuche fehlgeschlagen." } });
  }
});
app.post("/api/routes/plan", async (req, res) => {
  try {
    const data = planRouteInputSchema.parse(req.body);
    const route = await planRouteServer(data.origin, data.destination);
    res.json({ ok: true, route });
  } catch (error) {
    console.error("[planRoute] Erreur :", error);
    res.json({
      ok: false,
      error: { kind: "upstream", message: "Route konnte nicht berechnet werden." }
    });
  }
});
app.post("/api/routes/stations", async (req, res) => {
  try {
    const data = routeStationsInputSchema.parse(req.body);
    const route = await planRouteServer(data.origin, data.destination);
    const stations = await collectRouteStations(route, data.corridorKm, data.fuelType);
    upsertSeenStations(stations.map((entry) => entry.station)).catch(
      (err) => console.warn("[route] upsertSeenStations \xFCbersprungen:", err?.message || err)
    );
    res.json({ ok: true, route, stations, fetchedAt: Date.now() });
  } catch (error) {
    console.error("[routeStations] Erreur :", error);
    res.json({
      ok: false,
      error: {
        kind: "upstream",
        message: "Stationen entlang der Route konnten nicht geladen werden."
      }
    });
  }
});
app.post("/api/routes/suggest", async (req, res) => {
  try {
    const data = suggestInputSchema.parse(req.body);
    const suggestions = await searchPlaces(data.query);
    res.json(suggestions);
  } catch (error) {
    console.error("[suggestPlaces] Erreur :", error);
    res.json([]);
  }
});
app.post("/api/trends/history", async (req, res) => {
  try {
    const data = historyInputSchema.parse(req.body);
    const points = await readHistory(data.stationId, data.fuelType, data.days);
    const avg = points.length > 0 ? Math.round(points.reduce((sum, p) => sum + p.price, 0) / points.length * 1e3) / 1e3 : null;
    res.json({ points, avg, days: data.days });
  } catch (error) {
    console.error("[trends/history] Erreur :", error);
    res.json({ points: [], avg: null, days: req.body?.days ?? 7 });
  }
});
app.post("/api/trends/trend", async (req, res) => {
  try {
    const data = trendInputSchema.parse(req.body);
    const points = await readHistory(data.stationId, data.fuelType, data.days);
    const trend = computeTrend({
      fuel: data.fuelType,
      days: data.days,
      points,
      current: data.current ?? null
    });
    res.json(trend);
  } catch (error) {
    console.error("[trends/trend] Erreur :", error);
    res.status(500).json({ error: "Fehler beim Berechnen des Trends" });
  }
});
app.post("/api/trends/summaries", async (req, res) => {
  try {
    const data = summariesInputSchema.parse(req.body);
    const ids = data.stations.map((s) => s.id);
    const history = await readHistoryBulk(ids, data.fuelType, 7);
    const summaries = data.stations.map((station) => {
      const trend = computeTrend({
        fuel: data.fuelType,
        days: 7,
        points: history.get(station.id) ?? [],
        current: station.current ?? null
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
        avg: trend.avg
      };
    });
    res.json(summaries);
  } catch (error) {
    console.error("[trends/summaries] Erreur :", error);
    res.json([]);
  }
});
app.post("/api/community/report", async (req, res) => {
  try {
    const data = reportInputSchema.parse(req.body);
    const comment = data.comment?.trim() ?? "";
    if (comment && containsBlockedWords(comment)) {
      res.json({ ok: false, reason: "invalid_input" });
      return;
    }
    if (await overDailyLimit(data.contributorId, RATE_LIMITS.perDay)) {
      res.json({ ok: false, reason: "rate_limited" });
      return;
    }
    if (await actedRecently(
      "price_reports",
      data.contributorId,
      data.stationId,
      data.fuelType,
      RATE_LIMITS.perStationFuelHours
    )) {
      res.json({ ok: false, reason: "rate_limited" });
      return;
    }
    await insertReport({
      station_id: data.stationId,
      fuel_type: data.fuelType,
      contributor_id: data.contributorId,
      reported_price: data.reportedPrice ?? null,
      comment: comment ? comment.slice(0, 200) : null,
      user_lat: typeof data.lat === "number" ? coarsen(data.lat) : null,
      user_lng: typeof data.lng === "number" ? coarsen(data.lng) : null
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("[community/report] Erreur :", error);
    res.json({ ok: false, reason: "unknown" });
  }
});
app.post("/api/community/confirm", async (req, res) => {
  try {
    const data = confirmInputSchema.parse(req.body);
    const coords = await stationCoords(data.stationId);
    if (!coords) {
      res.json({ ok: false, reason: "invalid_input" });
      return;
    }
    if (!isNearStation({ lat: data.lat, lng: data.lng }, coords)) {
      res.json({ ok: false, reason: "too_far" });
      return;
    }
    if (await overDailyLimit(data.contributorId, RATE_LIMITS.perDay)) {
      res.json({ ok: false, reason: "rate_limited" });
      return;
    }
    if (await actedRecently(
      "price_confirmations",
      data.contributorId,
      data.stationId,
      data.fuelType,
      RATE_LIMITS.perStationFuelHours
    )) {
      res.json({ ok: false, reason: "rate_limited" });
      return;
    }
    await insertConfirmation({
      station_id: data.stationId,
      fuel_type: data.fuelType,
      contributor_id: data.contributorId,
      user_lat: coarsen(data.lat),
      user_lng: coarsen(data.lng)
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("[community/confirm] Erreur :", error);
    res.json({ ok: false, reason: "unknown" });
  }
});
app.post("/api/community/status", async (req, res) => {
  try {
    const data = statusInputSchema.parse(req.body);
    const activity = await readActivity([data.stationId], data.fuelType);
    const status = buildStatus(
      data.stationId,
      data.fuelType,
      activity.confirmations.get(data.stationId) ?? [],
      activity.reports.get(data.stationId) ?? []
    );
    res.json(status);
  } catch (error) {
    console.error("[community/status] Erreur :", error);
    res.status(500).json({ error: "Fehler beim Laden des Status" });
  }
});
app.post("/api/community/statuses", async (req, res) => {
  try {
    const data = statusesInputSchema.parse(req.body);
    const activity = await readActivity(data.stationIds, data.fuelType);
    const statuses = data.stationIds.map(
      (id) => buildStatus(
        id,
        data.fuelType,
        activity.confirmations.get(id) ?? [],
        activity.reports.get(id) ?? []
      )
    );
    res.json(statuses);
  } catch (error) {
    console.error("[community/statuses] Erreur :", error);
    res.json([]);
  }
});
app.get("/api/account/clerk-key", (_req, res) => {
  const publishableKey = process.env["CLERK_PUBLISHABLE_KEY"] || process.env["VITE_CLERK_PUBLISHABLE_KEY"] || null;
  res.json({ publishableKey });
});
app.get("/api/account", async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [favorites, trips, alerts] = await Promise.all([
      listFavorites(userId),
      listTrips(userId),
      listAlerts(userId)
    ]);
    const prices = await latestPrices([...new Set(alerts.map((a) => a.stationId))]);
    res.json({
      favorites,
      trips,
      alerts: alerts.map((a) => ({
        ...a,
        currentPrice: prices[a.stationId]?.[a.fuelType] ?? null
      }))
    });
  } catch (error) {
    console.error("[account/get] Erreur :", error);
    res.status(500).json({ error: "Konto-Daten konnten nicht geladen werden" });
  }
});
app.post("/api/account/sync", async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = syncSchema.parse(req.body);
    await upsertProfile(userId, data.username ?? null, data.avatarUrl ?? null);
    for (const station of data.favorites) {
      await addFavorite(userId, station);
    }
    for (const trip of data.trips) {
      await addTrip(userId, trip);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/sync] Erreur :", error);
    res.status(500).json({ error: "Synchronisation fehlgeschlagen" });
  }
});
app.post("/api/account/favorite", async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = setFavoriteSchema.parse(req.body);
    if (data.favorite) {
      await addFavorite(userId, data.station);
    } else {
      await removeFavorite(userId, data.station.id);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/favorite] Erreur :", error);
    res.status(500).json({ error: "Favorit konnte nicht aktualisiert werden" });
  }
});
app.post("/api/account/save-trip", async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = saveTripSchema.parse(req.body);
    await addTrip(userId, data.trip);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/save-trip] Erreur :", error);
    res.status(500).json({ error: "Trajet konnte nicht gespeichert werden" });
  }
});
app.post("/api/account/delete-trip", async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = idSchema.parse(req.body);
    await removeTrip(userId, data.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/delete-trip] Erreur :", error);
    res.status(500).json({ error: "Trajet konnte nicht gel\xF6scht werden" });
  }
});
app.post("/api/account/save-alert", async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = upsertAlertSchema.parse(req.body);
    await upsertAlert(userId, data);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/save-alert] Erreur :", error);
    res.status(500).json({ error: "Preisalarm konnte nicht gespeichert werden" });
  }
});
app.post("/api/account/toggle-alert", async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = toggleAlertSchema.parse(req.body);
    await setAlertActive(userId, data.id, data.active);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/toggle-alert] Erreur :", error);
    res.status(500).json({ error: "Preisalarm konnte nicht umgeschaltet werden" });
  }
});
app.post("/api/account/remove-alert", async (req, res) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = idSchema.parse(req.body);
    await deleteAlert(userId, data.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("[account/remove-alert] Erreur :", error);
    res.status(500).json({ error: "Preisalarm konnte nicht gel\xF6scht werden" });
  }
});
var runPriceCollection = async () => {
  const BATCH_SIZE = 100;
  const MAX_BATCHES = 10;
  const lease = await acquireLease();
  if (!lease.acquired) {
    return { ok: true, skipped: "locked" };
  }
  const paused = lease.state?.status === "paused";
  const maxBatches = paused ? 1 : MAX_BATCHES;
  let cursor = lease.state?.cursor ?? null;
  let inserted = 0;
  let checked = 0;
  try {
    for (let batch = 0; batch < maxBatches; batch++) {
      let ids = await collectablePool(BATCH_SIZE, cursor);
      if (ids.length === 0 && cursor) {
        cursor = null;
        ids = await collectablePool(BATCH_SIZE, null);
      }
      if (ids.length === 0) break;
      const updates = await fetchPrices(ids);
      const snapshots = Object.entries(updates).map(([stationId2, entry]) => ({
        stationId: stationId2,
        prices: entry.prices
      }));
      const known = await lastKnownPrices(ids);
      inserted += await insertHistoryRows(diffRows(snapshots, known));
      checked += ids.length;
      cursor = ids[ids.length - 1] ?? cursor;
      if (ids.length < BATCH_SIZE) {
        cursor = null;
        break;
      }
    }
    await releaseLease({ status: "idle", cursor });
    return { ok: true, checked, inserted, resumed: paused };
  } catch (error) {
    const quota = error instanceof TankerkoenigError && (error.kind === "quota" || error.kind === "missing-key");
    const message = error instanceof Error ? error.message : String(error);
    await releaseLease({
      status: quota ? "paused" : "idle",
      cursor,
      lastError: message
    });
    return { ok: false, paused: quota, error: message };
  }
};
app.all("/api/public/cron/collect-prices", async (_req, res) => {
  try {
    const result = await runPriceCollection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err);
  if (!res.headersSent) {
    res.status(500).json({
      ok: false,
      error: {
        kind: "internal",
        message: err instanceof Error ? err.message : "Erreur interne du serveur."
      }
    });
  }
});
async function startServer() {
  if (process.env["NODE_ENV"] !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}
var isDirectExecution = process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.cjs") || process.argv[1].endsWith("server.js"));
if (!process.env["VERCEL"] && isDirectExecution) {
  startServer();
}
var server_default = app;
export {
  app,
  server_default as default
};
