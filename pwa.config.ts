/**
 * PWA-Konfiguration (vite-plugin-pwa / Workbox).
 * Der Service Worker wird nur im Production-Build erzeugt; im Dev-Modus ist er deaktiviert.
 *
 * Caching-Strategien:
 * - /api/*            → NetworkOnly (nie gecacht: Preise, Konto, Auth)
 * - Seiten (HTML)     → NetworkFirst, Fallback /offline.html
 * - /assets/* (Hash)  → CacheFirst
 * - Bilder (eigene)   → StaleWhileRevalidate
 * Nicht-GET-Anfragen und fremde Origins (Clerk, Supabase, OSM-Kacheln) werden nicht abgefangen.
 */
import type { VitePWAOptions } from "vite-plugin-pwa";

const DAY = 24 * 60 * 60;

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: "prompt",
  injectRegister: false,
  devOptions: { enabled: false },
  // Die Icons sind bereits über globPatterns im Precache.
  includeManifestIcons: false,
  manifest: {
    id: "/",
    name: "Tankstellen-Finder",
    short_name: "Tankfinder",
    description: "Tankstellen in der Nähe finden und Spritpreise in Echtzeit vergleichen.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a1c",
    categories: ["navigation", "travel", "utilities"],
    // Lange auf das App-Symbol drücken (Feature 0006); HomePage wertet die Parameter einmal aus.
    shortcuts: [
      {
        name: "In der Nähe",
        short_name: "In der Nähe",
        description: "Günstigste Tankstellen am aktuellen Standort",
        url: "/?standort=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Favoriten",
        short_name: "Favoriten",
        description: "Aktuelle Preise deiner Favoriten",
        url: "/?tab=favoriten",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
  workbox: {
    // index.html bewusst nicht precachen: Seiten laufen über NetworkFirst.
    globPatterns: ["**/*.{js,css}", "offline.html", "icons/*.{png,svg}"],
    globIgnores: ["server.cjs*"],
    navigateFallback: null,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin && request.mode === "navigate" && !url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 20, maxAgeSeconds: 7 * DAY },
          cacheableResponse: { statuses: [200] },
          precacheFallback: { fallbackURL: "/offline.html" },
        },
      },
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
        handler: "CacheFirst",
        options: {
          cacheName: "assets",
          expiration: { maxEntries: 60, maxAgeSeconds: 365 * DAY },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === "image",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 60, maxAgeSeconds: 30 * DAY },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
};
