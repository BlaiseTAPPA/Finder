/** Formatierungs-Helfer: Preise, Entfernungen, relative Zeit. */
import type { FuelType, Station } from "@/types/station";

const priceFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** 1.799 € – Tankerkönig liefert drei Nachkommastellen. */
export function formatPrice(value: number | null): string {
  if (value === null) return "–";
  return `${priceFormatter.format(value)} €`;
}

/** 2,4 km */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/** "vor 3 Min." */
export function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "–";
  const minutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes === 1) return "vor 1 Minute";
  if (minutes < 60) return `vor ${minutes} Minuten`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "vor 1 Stunde" : `vor ${hours} Stunden`;
}

/** Günstigste geöffnete Station für die gewählte Sorte. */
export function cheapestStationId(stations: Station[], fuel: FuelType): string | null {
  let best: Station | null = null;
  for (const station of stations) {
    const price = station.prices[fuel];
    if (price === null || !station.isOpen) continue;
    if (!best || price < (best.prices[fuel] as number)) best = station;
  }
  return best?.id ?? null;
}

/**
 * Navigations-Link. Apple Maps auf iOS/macOS, sonst Google Maps.
 * Der Link öffnet direkt in einer neuen Karte (keine eingebettete Vorschau),
 * um Blockierungen in Vorschauframes zu vermeiden.
 */
export function directionsUrl(station: Station): string {
  const isApple =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  const label = encodeURIComponent(station.name);
  return isApple
    ? `https://maps.apple.com/?daddr=${station.lat},${station.lng}&q=${label}`
    : `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
}
