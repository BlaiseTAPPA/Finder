/**
 * Installationshinweis (Feature 0006): wann er erscheint, und das Browser-Ereignis
 * `beforeinstallprompt`, das früh abgefangen werden muss (es feuert kurz nach dem Laden).
 */
import { useEffect, useState } from "react";

const DAY_MS = 86_400_000;
/** Ab dem wievielten Nutzungstag der Hinweis erscheint. */
export const MIN_DAYS_OF_USE = 2;
/** Nach "Später" so lange nicht mehr zeigen. */
export const SNOOZE_MS = 30 * DAY_MS;

export type InstallMethod = "prompt" | "ios" | null;

export interface InstallState {
  /** Unterschiedliche Kalendertage mit Nutzung. */
  daysOfUse: number;
  dismissedAt: number | null;
  installed: boolean;
}

/** Ob der Hinweis jetzt erscheinen darf. */
export function shouldOfferInstall(
  state: InstallState,
  method: InstallMethod,
  standalone: boolean,
  now: number,
): boolean {
  if (method === null || standalone || state.installed) return false;
  if (state.daysOfUse < MIN_DAYS_OF_USE) return false;
  return state.dismissedAt === null || now - state.dismissedAt >= SNOOZE_MS;
}

/** iPhone/iPad in Safari (dort gibt es kein beforeinstallprompt, nur "Zum Home-Bildschirm"). */
export function isIosSafari(userAgent: string, maxTouchPoints: number): boolean {
  const ios =
    /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  // Andere Browser auf iOS (Chrome, Firefox, Edge) kennzeichnen sich mit eigenem Kürzel.
  return ios && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
}

// ----- Speicher (localStorage) -----

const KEY = "tankstellen:install";

interface Stored {
  days: string[];
  dismissedAt: number | null;
  installed: boolean;
}

function readStored(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Stored> | null;
    return {
      days: Array.isArray(raw?.days) ? raw.days.filter((d) => typeof d === "string") : [],
      dismissedAt: typeof raw?.dismissedAt === "number" ? raw.dismissedAt : null,
      installed: raw?.installed === true,
    };
  } catch {
    return { days: [], dismissedAt: null, installed: false };
  }
}

function writeStored(value: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Speicher blockiert – dann erscheint der Hinweis nicht dauerhaft gesteuert */
  }
}

/** Heutigen Tag als Nutzungstag vermerken (höchstens die letzten Tage behalten). */
export function recordDayOfUse(now: number): InstallState {
  const stored = readStored();
  const today = new Date(now).toISOString().slice(0, 10);
  if (!stored.days.includes(today)) stored.days = [...stored.days, today].slice(-MIN_DAYS_OF_USE);
  writeStored(stored);
  return {
    daysOfUse: stored.days.length,
    dismissedAt: stored.dismissedAt,
    installed: stored.installed,
  };
}

export function dismissInstall(now: number) {
  writeStored({ ...readStored(), dismissedAt: now });
}

export function markInstalled() {
  writeStored({ ...readStored(), installed: true });
}

// ----- beforeinstallprompt (Chromium) -----

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Eigenen Hinweis zeigen statt der Browser-Leiste.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    markInstalled();
    notify();
  });
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Installationsweg dieses Browsers; aktualisiert sich, sobald das Ereignis eintrifft. */
export function useInstallMethod(): InstallMethod {
  const [method, setMethod] = useState<InstallMethod>(null);
  useEffect(() => {
    const update = () =>
      setMethod(
        deferred
          ? "prompt"
          : isIosSafari(navigator.userAgent, navigator.maxTouchPoints ?? 0)
            ? "ios"
            : null,
      );
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return method;
}

/** Öffnet den Installationsdialog des Browsers; true, wenn installiert wurde. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") markInstalled();
  notify();
  return outcome === "accepted";
}
