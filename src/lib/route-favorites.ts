/**
 * Gespeicherte Trajets: lokal in localStorage, bei angemeldetem Konto zusätzlich in der Datenbank.
 * Die UI wird sofort aktualisiert; der Konto-Sync läuft im Hintergrund.
 */
import { useCallback, useEffect, useState } from "react";
import type { SavedTrip } from "@/types/station";
import { deleteTripForUser, saveTripForUser } from "./account.functions";

const KEY = "tankstellen:trips";

/** Speicher-Cache, damit Trajets auch bei blockiertem localStorage für die Sitzung bleiben. */
let cache: SavedTrip[] | null = null;
const listeners = new Set<() => void>();
/** Konto, mit dem Änderungen synchronisiert werden (gesetzt vom Konto-Sync in favorites.ts). */
let accountId: string | null = null;

function read(): SavedTrip[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cache = Array.isArray(parsed) ? (parsed as SavedTrip[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: SavedTrip[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Speicher blockiert – Trajets bleiben nur für die Sitzung */
  }
  listeners.forEach((notify) => notify());
}

/** Lokal gespeicherte Trajets (für die Konto-Migration). */
export function readLocalTrips(): SavedTrip[] {
  return read();
}

/** Lokale Trajets ersetzen (Kontostand übernehmen bzw. beim Abmelden leeren). */
export function replaceLocalTrips(next: SavedTrip[]) {
  write(next);
}

export function setTripsAccount(userId: string | null) {
  accountId = userId;
}

export function useTripFavorites() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Erst nach der Hydratation lesen -> kein Server/Client-Mismatch.
  useEffect(() => {
    const sync = () => setTrips(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY && e.key !== null) return;
      cache = null;
      sync();
    };
    sync();
    setHydrated(true);
    listeners.add(sync);
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const save = useCallback((trip: Omit<SavedTrip, "id" | "createdAt">) => {
    const entry: SavedTrip = {
      ...trip,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      createdAt: Date.now(),
    };
    write([entry, ...read().filter((t) => t.name !== trip.name)]);
    if (accountId) {
      void saveTripForUser({ data: { trip: entry } }).catch(() => {
        /* offline – beim nächsten Anmelden erneut abgeglichen */
      });
    }
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((t) => t.id !== id));
    if (accountId) {
      void deleteTripForUser({ data: { id } }).catch(() => {
        /* offline – Eintrag bleibt im Konto, bis erneut gelöscht */
      });
    }
  }, []);

  return { trips, hydrated, save, remove };
}
