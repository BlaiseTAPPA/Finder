/**
 * Anonyme, dauerhafte Beitragenden-ID (localStorage).
 * Bewusst neutral gehalten: später kann hier eine Konto-ID stehen,
 * ohne Datenmodell oder Server-Funktionen zu ändern.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

const KEY = "tankstellen:contributor";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (sehr alte Browser)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Gibt die ID erst nach der Hydratation zurück (kein SSR-Mismatch). */
export function useContributorId(): string | null {
  const [id, setId] = useState<string | null>(null);
  const { isSignedIn, userId } = useAuth();

  useEffect(() => {
    try {
      let value = localStorage.getItem(KEY);
      if (!value || !/^[0-9a-f-]{36}$/i.test(value)) {
        value = uuid();
        localStorage.setItem(KEY, value);
      }
      setId(value);
    } catch {
      setId(uuid());
    }
  }, []);

  // Angemeldete Beiträge werden dem Konto zugeordnet.
  if (isSignedIn && userId) return `clerk:${userId}`;
  return id;
}
