import { describe, expect, it } from "vitest";
import {
  CONFIRM_RADIUS_M,
  buildStatus,
  classifyCommunity,
  coarsen,
  containsBlockedWords,
  distanceMeters,
  freshnessWeight,
  isNearStation,
} from "./community";

const NOW = Date.UTC(2026, 0, 10, 12, 0, 0);
const hoursAgo = (h: number) => ({ createdAt: NOW - h * 3_600_000 });

describe("freshnessWeight", () => {
  it("halbiert sich nach 12 Stunden", () => {
    expect(freshnessWeight(NOW, NOW)).toBeCloseTo(1);
    expect(freshnessWeight(NOW - 12 * 3_600_000, NOW)).toBeCloseTo(0.5);
    expect(freshnessWeight(NOW - 24 * 3_600_000, NOW)).toBeCloseTo(0.25);
  });

  it("ignoriert Ereignisse außerhalb des 48-Stunden-Fensters", () => {
    expect(freshnessWeight(NOW - 49 * 3_600_000, NOW)).toBe(0);
  });
});

describe("classifyCommunity", () => {
  it("bleibt neutral ohne ausreichendes Gewicht", () => {
    expect(classifyCommunity([hoursAgo(1)], [], NOW)).toBe("neutral");
  });

  it("erkennt frische Bestätigungen", () => {
    expect(classifyCommunity([hoursAgo(0), hoursAgo(1), hoursAgo(2)], [], NOW)).toBe("confirmed");
  });

  it("erkennt bestrittene Preise", () => {
    expect(classifyCommunity([], [hoursAgo(0), hoursAgo(1), hoursAgo(2)], NOW)).toBe("disputed");
  });

  it("bleibt neutral bei ausgeglichener Lage", () => {
    expect(classifyCommunity([hoursAgo(1), hoursAgo(2)], [hoursAgo(1), hoursAgo(2)], NOW)).toBe(
      "neutral",
    );
  });

  it("gewichtet alte Bestätigungen schwächer als frische Meldungen", () => {
    expect(
      classifyCommunity(
        [hoursAgo(40), hoursAgo(44), hoursAgo(46)],
        [hoursAgo(0), hoursAgo(1)],
        NOW,
      ),
    ).toBe("disputed");
  });
});

describe("buildStatus", () => {
  it("zählt nur Ereignisse im Fenster und meldet die letzte Aktivität", () => {
    const status = buildStatus("st-1", "e5", [hoursAgo(1), hoursAgo(80)], [hoursAgo(3)], NOW);
    expect(status.confirmationsCount).toBe(1);
    expect(status.reportsCount).toBe(1);
    expect(status.lastActivityAt).toBe(new Date(NOW - 3_600_000).toISOString());
  });
});

describe("Nähe-Prüfung", () => {
  const station = { lat: 52.52, lng: 13.405 };

  it("akzeptiert Positionen innerhalb von 500 m", () => {
    expect(isNearStation({ lat: 52.5215, lng: 13.405 }, station)).toBe(true);
  });

  it("lehnt weiter entfernte Positionen ab", () => {
    const far = { lat: 52.53, lng: 13.405 };
    expect(distanceMeters(far, station)).toBeGreaterThan(CONFIRM_RADIUS_M);
    expect(isNearStation(far, station)).toBe(false);
  });
});

describe("Hilfsfunktionen", () => {
  it("rundet Koordinaten auf ~100 m", () => {
    expect(coarsen(52.520008)).toBe(52.52);
  });

  it("blockt unangemessene Kommentare", () => {
    expect(containsBlockedWords("Preis war FUCK falsch")).toBe(true);
    expect(containsBlockedWords("Preis war 5 Cent höher")).toBe(false);
  });
});
