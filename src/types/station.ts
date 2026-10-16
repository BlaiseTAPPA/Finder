/** Geteilte Typen für Tankstellen und Kraftstoffpreise. */

/** Von Tankerkönig unterstützte Kraftstoffsorten. */
export type FuelType = "e5" | "e10" | "diesel";

export const FUEL_TYPES: FuelType[] = ["e5", "e10", "diesel"];

export const FUEL_LABELS: Record<FuelType, string> = {
  e5: "Super E5",
  e10: "Super E10",
  diesel: "Diesel",
};

/** Preise je Sorte; `null` = für diese Station nicht gemeldet. */
export type FuelPrices = Record<FuelType, number | null>;

/** Normalisierte Tankstelle, wie sie in der UI verwendet wird. */
export interface Station {
  id: string;
  name: string;
  brand: string;
  street: string;
  houseNumber: string;
  postCode: string;
  place: string;
  lat: number;
  lng: number;
  /** Entfernung in km (von Tankerkönig berechnet). */
  dist: number;
  isOpen: boolean;
  prices: FuelPrices;
}

/** Sortiermodi der Ergebnisliste. */
export type SortMode = "price" | "distance";

/** Suchmittelpunkt. */
export interface Coords {
  lat: number;
  lng: number;
}

/** Fehlerarten, die die UI unterschiedlich darstellt. */
export type ApiErrorKind = "quota" | "missing-key" | "upstream" | "network";

export interface ApiErrorShape {
  kind: ApiErrorKind;
  message: string;
}

/** Berechnete Route zwischen zwei Punkten. */
export interface RouteInfo {
  polyline: Coords[];
  distanceKm: number;
  durationMin: number;
}

/** Station im Korridor einer Route, inklusive geschätztem Umweg. */
export interface RouteStation {
  station: Station;
  /** Abstand zur Route (Luftlinie, km). */
  corridorKm: number;
  /** Zusätzliche Strecke gegenüber der direkten Fahrt (km). */
  detourKm: number;
  /** Zusätzliche Fahrzeit (Minuten). */
  detourMin: number;
  /** Netto-Ersparnis in Euro (Preisvorteil minus Umwegkosten). */
  score: number;
}

/** Sortiermodi der Streckenansicht. */
export type RouteSortMode = "best" | "price" | "detour";

/**
 * Eine gespeicherte Strecke (localStorage).
 * Bewusst ein type-Alias statt interface: nur so ist er dem .passthrough()-Schema
 * (Index-Signatur) zuweisbar, das Strecken an den Server schickt.
 */
export type SavedTrip = {
  id: string;
  name: string;
  originLabel: string;
  destinationLabel: string;
  origin: Coords;
  destination: Coords;
  corridorKm: number;
  createdAt: number;
};

/** Vollständige Adresse als eine Zeile. */
export function formatAddress(station: Station): string {
  const line1 = [station.street, station.houseNumber].filter(Boolean).join(" ");
  const line2 = [station.postCode, station.place].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ");
}

/**
 * Kurzform für die Karte: Straße und Hausnummer, dazu Marke und Ort nur, wenn der
 * Stationsname sie nicht schon enthält ("TotalEnergies Ludwigshafen" → "Hauptstr. 257").
 */
export function formatShortAddress(station: Station): string {
  const name = station.name.toLocaleLowerCase("de-DE");
  const missing = (value: string) =>
    value.trim() !== "" && !name.includes(value.trim().toLocaleLowerCase("de-DE"));
  const street = [station.street, station.houseNumber].filter(Boolean).join(" ");
  const brand = missing(station.brand) ? station.brand : "";
  const place = missing(station.place) ? station.place : "";
  const location = [street, place].filter(Boolean).join(", ");
  return [brand, location].filter(Boolean).join(" · ");
}
