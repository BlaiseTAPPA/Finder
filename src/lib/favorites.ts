/**
 * Favoriten: lokal in localStorage, bei angemeldetem Konto zusätzlich in der Datenbank.
 * Nach der Anmeldung werden lokale Favoriten einmalig übernommen (Migration).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSafeAuth, useSafeUser } from "./auth";
import type { Station } from "@/types/station";
import { getAccount, setFavorite, syncLocalData } from "./account.functions";
import { readLocalTrips } from "./route-favorites";

const KEY = "tankstellen:favorites";
const MIGRATED_KEY = "tankstellen:migrated";

/** Gespeicherte Station (Snapshot, damit Favoriten ohne neue Umkreissuche sichtbar sind). */
export type FavoriteStation = Station;

function read(): FavoriteStation[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FavoriteStation[]) : [];
  } catch {
    return [];
  }
}

function write(next: FavoriteStation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Speicher voll oder blockiert – Favoriten bleiben nur für die Sitzung */
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { isSignedIn, isLoaded } = useSafeAuth();
  const { user } = useSafeUser();
  const syncing = useRef(false);

  // Erst nach der Hydratation lesen -> kein Server/Client-Mismatch.
  useEffect(() => {
    setFavorites(read());
    setHydrated(true);
  }, []);

  // Nach der Anmeldung: lokale Daten einmalig übernehmen, danach Kontostand laden.
  useEffect(() => {
    if (!hydrated || !isLoaded || !isSignedIn || !user || syncing.current) return;
    syncing.current = true;
    void (async () => {
      try {
        const flag = `${MIGRATED_KEY}:${user.id}`;
        if (localStorage.getItem(flag) !== "1") {
          await syncLocalData({
            data: {
              favorites: read(),
              trips: readLocalTrips(),
              username: user.username ?? user.fullName ?? null,
              avatarUrl: user.imageUrl ?? null,
            },
          });
          localStorage.setItem(flag, "1");
        }
        const account = await getAccount();
        setFavorites(account.favorites);
        write(account.favorites);
      } catch {
        /* offline oder Token abgelaufen – lokale Favoriten bleiben nutzbar */
      } finally {
        syncing.current = false;
      }
    })();
  }, [hydrated, isLoaded, isSignedIn, user]);

  const persist = useCallback((next: FavoriteStation[]) => {
    setFavorites(next);
    write(next);
  }, []);

  const toggle = useCallback(
    (station: Station) => {
      const exists = favorites.some((f) => f.id === station.id);
      persist(exists ? favorites.filter((f) => f.id !== station.id) : [...favorites, station]);
      if (isSignedIn) {
        void setFavorite({ data: { station, favorite: !exists } }).catch(() => {
          /* Konto-Sync später erneut */
        });
      }
    },
    [favorites, persist, isSignedIn],
  );

  /** Preise der Favoriten mit frischen Daten überschreiben. */
  const syncPrices = useCallback((updates: Record<string, Pick<Station, "isOpen" | "prices">>) => {
    setFavorites((current) => {
      const next = current.map((fav) => (updates[fav.id] ? { ...fav, ...updates[fav.id] } : fav));
      write(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  return { favorites, hydrated, toggle, isFavorite, syncPrices };
}
