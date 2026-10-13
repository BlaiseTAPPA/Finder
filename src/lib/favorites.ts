/**
 * Favoriten: lokal in localStorage, bei angemeldetem Konto zusätzlich in der Datenbank.
 * Bei jeder Anmeldung werden Gast-Favoriten und -Trajets mit dem Konto vereinigt (Union),
 * danach wird der Kontostand geladen. Beim Abmelden wird die lokale Kopie geleert.
 */
import { useCallback, useEffect, useState } from "react";
import type { Station } from "@/types/station";
import { getAccount, setFavorite, syncLocalData } from "./account.functions";
import { readLocalTrips, replaceLocalTrips, setTripsAccount } from "./route-favorites";

const KEY = "tankstellen:favorites";
/** Konto, dessen Daten lokal gespiegelt sind; fehlt es, sind die lokalen Daten Gast-Daten. */
const OWNER_KEY = "tankstellen:owner";

/** Gespeicherte Station (Snapshot, damit Favoriten ohne neue Umkreissuche sichtbar sind). */
export type FavoriteStation = Station;

/** Speicher-Cache, damit Favoriten auch bei blockiertem localStorage für die Sitzung bleiben. */
let cache: FavoriteStation[] | null = null;
const listeners = new Set<() => void>();
/** Konto, mit dem Änderungen synchronisiert werden. */
let accountId: string | null = null;

function read(): FavoriteStation[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cache = Array.isArray(parsed) ? (parsed as FavoriteStation[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: FavoriteStation[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Speicher voll oder blockiert – Favoriten bleiben nur für die Sitzung */
  }
  listeners.forEach((notify) => notify());
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string | null) {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* Speicher blockiert */
  }
}

function setAccount(userId: string | null) {
  accountId = userId;
  setTripsAccount(userId);
}

let syncingFor: string | null = null;

async function syncAccount(userId: string, profile: AccountProfile) {
  const owner = readOwner();
  if (owner && owner !== userId) {
    // Spiegel eines anderen Kontos (Abmeldung nicht beobachtet) – nicht übernehmen.
    write([]);
    replaceLocalTrips([]);
    writeOwner(null);
  } else if (!owner) {
    // Gast-Daten: ohne erfolgreichen Upload nicht durch den Kontostand ersetzen.
    await syncLocalData({
      data: {
        favorites: read(),
        trips: readLocalTrips(),
        username: profile.username,
        avatarUrl: profile.avatarUrl,
      },
    });
  }
  const account = await getAccount();
  if (accountId !== userId) return; // inzwischen abgemeldet
  write(account.favorites);
  replaceLocalTrips(account.trips);
  writeOwner(userId);
}

export interface AccountProfile {
  username: string | null;
  avatarUrl: string | null;
}

/**
 * Konto-Lebenszyklus: bei Anmeldung Gast-Daten hochladen und Kontostand laden,
 * bei Abmeldung die lokale Kopie des Kontos entfernen. Einmal in der App einbinden.
 */
export function useAccountSync(state: {
  isLoaded: boolean;
  userId: string | null;
  profile: AccountProfile;
}) {
  const { isLoaded, userId } = state;
  const { username, avatarUrl } = state.profile;

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setAccount(null);
      syncingFor = null;
      if (readOwner()) {
        write([]);
        replaceLocalTrips([]);
        writeOwner(null);
      }
      return;
    }
    setAccount(userId);
    if (syncingFor === userId) return;
    syncingFor = userId;
    void syncAccount(userId, { username, avatarUrl })
      .catch(() => {
        /* offline oder Token abgelaufen – lokale Daten bleiben nutzbar */
      })
      .finally(() => {
        if (syncingFor === userId) syncingFor = null;
      });
  }, [isLoaded, userId, username, avatarUrl]);
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Erst nach der Hydratation lesen -> kein Server/Client-Mismatch.
  useEffect(() => {
    const sync = () => setFavorites(read());
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

  const toggle = useCallback((station: Station) => {
    const current = read();
    const exists = current.some((f) => f.id === station.id);
    write(exists ? current.filter((f) => f.id !== station.id) : [...current, station]);
    if (accountId) {
      void setFavorite({ data: { station, favorite: !exists } }).catch(() => {
        /* offline – beim nächsten Anmelden erneut abgeglichen */
      });
    }
  }, []);

  /** Preise der Favoriten mit frischen Daten überschreiben. */
  const syncPrices = useCallback((updates: Record<string, Pick<Station, "isOpen" | "prices">>) => {
    write(read().map((fav) => (updates[fav.id] ? { ...fav, ...updates[fav.id] } : fav)));
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  return { favorites, hydrated, toggle, isFavorite, syncPrices };
}
