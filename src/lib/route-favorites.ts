/** Gespeicherte Trajets in localStorage, hydratationssicher. */
import { useCallback, useEffect, useState } from "react";
import type { SavedTrip } from "@/types/station";

const KEY = "tankstellen:trips";

function read(): SavedTrip[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedTrip[]) : [];
  } catch {
    return [];
  }
}

/** Lokal gespeicherte Trajets (für die Konto-Migration). */
export function readLocalTrips(): SavedTrip[] {
  return read();
}

export function useTripFavorites() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTrips(read());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: SavedTrip[]) => {
    setTrips(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* Speicher blockiert – Trajets bleiben nur für die Sitzung */
    }
  }, []);

  const save = useCallback(
    (trip: Omit<SavedTrip, "id" | "createdAt">) => {
      const entry: SavedTrip = {
        ...trip,
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : String(Date.now()),
        createdAt: Date.now(),
      };
      persist([entry, ...read().filter((t) => t.name !== trip.name)]);
      return entry;
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => persist(read().filter((t) => t.id !== id)),
    [persist],
  );

  return { trips, hydrated, save, remove };
}
