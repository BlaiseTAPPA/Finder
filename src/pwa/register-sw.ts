/**
 * Registriert den Service Worker (nur Production) und zeigt bei einer neuen Version
 * einen Hinweis-Toast. Aktualisiert wird erst nach Klick auf „Neu laden“ – kein erzwungenes skipWaiting.
 */
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

function register() {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast("Neue Version verfügbar", {
        id: "pwa-update",
        duration: Infinity,
        action: { label: "Neu laden", onClick: () => void updateSW(true) },
      });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Lange offene Tabs regelmäßig auf neue Versionen prüfen.
      setInterval(() => {
        if (navigator.onLine) void registration.update();
      }, UPDATE_CHECK_INTERVAL);
    },
  });
}

// Erst nach dem Laden und im Leerlauf registrieren, damit der erste Render nicht verzögert wird.
function registerWhenIdle() {
  if ("requestIdleCallback" in window) window.requestIdleCallback(register, { timeout: 5000 });
  else setTimeout(register, 1000);
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  if (document.readyState === "complete") registerWhenIdle();
  else window.addEventListener("load", registerWhenIdle, { once: true });
}
