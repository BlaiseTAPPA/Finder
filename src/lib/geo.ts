/**
 * Geometrie-Helfer für die Korridor-Suche entlang einer Route.
 * Rein funktional, ohne Abhängigkeiten – im Client und im Server nutzbar.
 */
import type { Coords } from "@/types/station";

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Großkreis-Entfernung in Kilometern. */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Lokale, äquirektanguläre Projektion in Kilometer.
 * Für Distanzen bis ~100 km völlig ausreichend und deutlich schneller
 * als eine exakte geodätische Projektion.
 */
function project(point: Coords, originLat: number): { x: number; y: number } {
  return {
    x: toRad(point.lng) * Math.cos(toRad(originLat)) * EARTH_RADIUS_KM,
    y: toRad(point.lat) * EARTH_RADIUS_KM,
  };
}

/** Kürzeste Entfernung Punkt -> Segment [a,b] in km. */
export function distancePointToSegmentKm(p: Coords, a: Coords, b: Coords): number {
  const originLat = (a.lat + b.lat) / 2;
  const pp = project(p, originLat);
  const pa = project(a, originLat);
  const pb = project(b, originLat);

  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const lengthSq = dx * dx + dy * dy;

  // Entartetes Segment (a == b): auf die Punktdistanz zurückfallen.
  if (lengthSq === 0) return haversineKm(p, a);

  let t = ((pp.x - pa.x) * dx + (pp.y - pa.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closest: Coords = {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
  return haversineKm(p, closest);
}

export interface PolylineDistance {
  /** Kürzeste Entfernung zur Polylinie in km. */
  km: number;
  /** Index des nächstgelegenen Segments (Startpunkt-Index). */
  segmentIndex: number;
}

/** Minimale Entfernung eines Punkts zu einer Polylinie. */
export function distanceToPolylineKm(point: Coords, polyline: Coords[]): PolylineDistance {
  if (polyline.length === 0) return { km: Number.POSITIVE_INFINITY, segmentIndex: -1 };
  if (polyline.length === 1) {
    return { km: haversineKm(point, polyline[0]!), segmentIndex: 0 };
  }

  let best = Number.POSITIVE_INFINITY;
  let bestIndex = 0;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const d = distancePointToSegmentKm(point, polyline[i]!, polyline[i + 1]!);
    if (d < best) {
      best = d;
      bestIndex = i;
    }
  }
  return { km: best, segmentIndex: bestIndex };
}

/** Gesamtlänge einer Polylinie in km. */
export function polylineLengthKm(polyline: Coords[]): number {
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    total += haversineKm(polyline[i]!, polyline[i + 1]!);
  }
  return total;
}

/**
 * Punkte im Abstand von `stepKm` entlang der Polylinie.
 * Start- und Endpunkt sind immer enthalten.
 */
export function samplePolyline(polyline: Coords[], stepKm: number): Coords[] {
  if (polyline.length === 0) return [];
  if (polyline.length === 1 || stepKm <= 0) return [polyline[0]!];

  const samples: Coords[] = [polyline[0]!];
  let carried = 0;

  for (let i = 0; i < polyline.length - 1; i += 1) {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    const segment = haversineKm(a, b);
    if (segment === 0) continue;

    let position = stepKm - carried;
    while (position <= segment) {
      const t = position / segment;
      samples.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      });
      position += stepKm;
    }
    carried = (carried + segment) % stepKm;
  }

  const last = polyline[polyline.length - 1]!;
  const tail = samples[samples.length - 1]!;
  if (haversineKm(tail, last) > stepKm / 4) samples.push(last);
  return samples;
}

/** Umschließendes Rechteck einer Polylinie. */
export function boundsOf(polyline: Coords[]): {
  south: number;
  west: number;
  north: number;
  east: number;
} | null {
  if (polyline.length === 0) return null;
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  for (const p of polyline) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return { south, west, north, east };
}
