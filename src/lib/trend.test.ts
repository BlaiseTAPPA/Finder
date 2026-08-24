import { describe, expect, it } from "vitest";
import {
  classify,
  computeTrend,
  hourlyPattern,
  percentileOf,
  type HistoryPoint,
} from "./trend";
import { diffRows } from "./price-history.server";

/** Baut synthetische Punkte: `days` Tage, ein Wert je Stunde. */
function synthetic(days: number, priceAt: (hour: number, day: number) => number) {
  const points: HistoryPoint[] = [];
  // Fester Startpunkt (Winterzeit, damit die Stunde stabil ist).
  const start = Date.UTC(2026, 0, 5, 0, 0, 0); // 01:00 Berlin
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      points.push({
        t: start + d * 86400000 + h * 3600000,
        price: priceAt((h + 1) % 24, d),
      });
    }
  }
  return points;
}

describe("percentileOf / classify", () => {
  it("berechnet die Position im Wertebereich", () => {
    const values = [1, 2, 3, 4];
    expect(percentileOf(values, 0.5)).toBe(0);
    expect(percentileOf(values, 5)).toBe(100);
    expect(percentileOf(values, 2)).toBe(37.5);
  });

  it("klassifiziert nach Quartilen", () => {
    expect(classify(10)).toBe("low");
    expect(classify(50)).toBe("mid");
    expect(classify(90)).toBe("high");
  });
});

describe("hourlyPattern", () => {
  it("mittelt je Tagesstunde in deutscher Ortszeit", () => {
    const points = synthetic(3, (hour) => (hour === 7 ? 1.6 : 1.8));
    const pattern = hourlyPattern(points);
    expect(pattern).toHaveLength(24);
    const seven = pattern.find((p) => p.hour === 7);
    expect(seven?.avg).toBe(1.6);
    expect(seven?.samples).toBe(3);
  });
});

describe("computeTrend", () => {
  const cheapAt7 = (hour: number) => (hour >= 6 && hour <= 8 ? 1.6 : 1.79);

  it("liefert keine Empfehlung bei zu wenig Historie", () => {
    const points = synthetic(2, cheapAt7);
    const result = computeTrend({
      fuel: "e5",
      days: 7,
      points,
      current: 1.7,
      now: Date.UTC(2026, 0, 7, 5, 0, 0),
    });
    expect(result.confident).toBe(false);
    expect(result.recommendation).toBeNull();
  });

  it("empfiehlt zu warten, wenn das Tagestief bevorsteht", () => {
    const points = synthetic(7, cheapAt7);
    const result = computeTrend({
      fuel: "e5",
      days: 7,
      points,
      current: 1.79,
      now: Date.UTC(2026, 0, 12, 3, 0, 0), // 04:00 Berlin
    });
    expect(result.confident).toBe(true);
    expect(result.troughHour).toBe(6);
    expect(result.recommendation?.kind).toBe("wait");
  });

  it("meldet einen guten Zeitpunkt im Tagestief", () => {
    const points = synthetic(7, cheapAt7);
    const result = computeTrend({
      fuel: "e5",
      days: 7,
      points,
      current: 1.6,
      now: Date.UTC(2026, 0, 12, 5, 0, 0), // 06:00 Berlin
    });
    expect(result.recommendation?.kind).toBe("good-now");
    expect(result.classification).toBe("low");
  });

  it("meldet Spanne und Mittelwert der Periode", () => {
    const points = synthetic(7, cheapAt7);
    const result = computeTrend({
      fuel: "diesel",
      days: 7,
      points,
      current: 1.79,
      now: Date.UTC(2026, 0, 12, 12, 0, 0),
    });
    expect(result.min).toBe(1.6);
    expect(result.max).toBe(1.79);
    // Der Höchstpreis dominiert die Verteilung, daher noch kein "hoch".
    expect(result.classification).toBe("mid");
  });

  it("klassifiziert einen Preis über dem 75. Perzentil als hoch", () => {
    // Preis steigt im Tagesverlauf gleichmäßig an.
    const points = synthetic(7, (hour) => 1.6 + hour * 0.01);
    const result = computeTrend({
      fuel: "diesel",
      days: 7,
      points,
      current: 1.82,
      now: Date.UTC(2026, 0, 12, 12, 0, 0),
    });
    expect(result.classification).toBe("high");
    expect(result.percentile).toBeGreaterThan(75);
  });

  it("schweigt bei flachem Muster", () => {
    const points = synthetic(7, () => 1.75);
    const result = computeTrend({
      fuel: "e10",
      days: 7,
      points,
      current: 1.75,
      now: Date.UTC(2026, 0, 12, 5, 0, 0),
    });
    expect(result.recommendation).toBeNull();
  });
});

describe("diffRows", () => {
  const now = new Date("2026-01-12T10:00:00Z");

  it("schreibt nur geänderte Preise", () => {
    const known = new Map([
      ["A:e5", 1.799],
      ["A:diesel", 1.699],
    ]);
    const rows = diffRows(
      [{ stationId: "A", prices: { e5: 1.799, e10: 1.749, diesel: 1.709 } }],
      known,
      now,
    );
    expect(rows.map((r) => r.fuel_type)).toEqual(["e10", "diesel"]);
  });

  it("ignoriert fehlende Preise", () => {
    const rows = diffRows(
      [{ stationId: "B", prices: { e5: null, e10: 0, diesel: 1.5 } }],
      new Map(),
      now,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.price).toBe(1.5);
  });
});
