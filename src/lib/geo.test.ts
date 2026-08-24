import { describe, expect, it } from "vitest";
import {
  distancePointToSegmentKm,
  distanceToPolylineKm,
  haversineKm,
  polylineLengthKm,
  samplePolyline,
} from "./geo";

const A = { lat: 52.0, lng: 13.0 };
const B = { lat: 52.0, lng: 13.1 };

describe("haversineKm", () => {
  it("ist null für denselben Punkt", () => {
    expect(haversineKm(A, A)).toBeCloseTo(0, 6);
  });

  it("misst ~111 km pro Breitengrad", () => {
    expect(haversineKm({ lat: 52, lng: 13 }, { lat: 53, lng: 13 })).toBeCloseTo(111.2, 0);
  });
});

describe("distancePointToSegmentKm", () => {
  it("liefert 0 für einen Punkt auf dem Segment", () => {
    expect(distancePointToSegmentKm({ lat: 52.0, lng: 13.05 }, A, B)).toBeCloseTo(0, 3);
  });

  it("misst die Senkrechte für einen Punkt neben dem Segment", () => {
    const p = { lat: 52.01, lng: 13.05 };
    expect(distancePointToSegmentKm(p, A, B)).toBeCloseTo(1.112, 1);
  });

  it("klemmt auf den Endpunkt, wenn die Projektion außerhalb liegt", () => {
    const p = { lat: 52.0, lng: 13.2 };
    expect(distancePointToSegmentKm(p, A, B)).toBeCloseTo(haversineKm(p, B), 3);
  });

  it("behandelt ein entartetes Segment als Punkt", () => {
    const p = { lat: 52.01, lng: 13.0 };
    expect(distancePointToSegmentKm(p, A, A)).toBeCloseTo(haversineKm(p, A), 6);
  });
});

describe("distanceToPolylineKm", () => {
  const line = [A, B, { lat: 52.1, lng: 13.1 }];

  it("findet das nächstgelegene Segment", () => {
    const result = distanceToPolylineKm({ lat: 52.05, lng: 13.11 }, line);
    expect(result.segmentIndex).toBe(1);
    expect(result.km).toBeLessThan(1);
  });

  it("liefert 0 für einen Punkt auf der Linie", () => {
    expect(distanceToPolylineKm(B, line).km).toBeCloseTo(0, 3);
  });

  it("kommt mit einer Ein-Punkt-Linie zurecht", () => {
    const result = distanceToPolylineKm({ lat: 52.01, lng: 13.0 }, [A]);
    expect(result.km).toBeCloseTo(haversineKm({ lat: 52.01, lng: 13.0 }, A), 6);
  });

  it("liefert Infinity für eine leere Linie", () => {
    expect(distanceToPolylineKm(A, []).km).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("samplePolyline", () => {
  it("enthält Start und Ende", () => {
    const line = [A, { lat: 52.5, lng: 13.0 }];
    const samples = samplePolyline(line, 10);
    expect(samples[0]).toEqual(A);
    expect(samples[samples.length - 1]!.lat).toBeCloseTo(52.5, 3);
  });

  it("erzeugt Punkte im gewünschten Abstand", () => {
    const line = [A, { lat: 52.9, lng: 13.0 }]; // ~100 km
    const samples = samplePolyline(line, 20);
    expect(samples.length).toBeGreaterThanOrEqual(5);
    expect(haversineKm(samples[0]!, samples[1]!)).toBeCloseTo(20, 0);
  });

  it("misst die Gesamtlänge korrekt", () => {
    expect(polylineLengthKm([A, B])).toBeCloseTo(haversineKm(A, B), 6);
  });
});
