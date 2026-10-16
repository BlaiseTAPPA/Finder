import { describe, expect, it } from "vitest";
import { adviseStations, bestChoice, budgetRange, planFill } from "./budget-advice";
import { detourScore, estimateDetour } from "./route-score";
import type { Station } from "@/types/station";

const vehicle = { tankCapacity: 50, consumption: 7 };

const station = (id: string, price: number | null, dist: number, isOpen = true): Station => ({
  id,
  name: `Station ${id}`,
  brand: "Test",
  street: "",
  houseNumber: "",
  postCode: "",
  place: "",
  lat: 0,
  lng: 0,
  dist,
  isOpen,
  prices: { e5: null, e10: price, diesel: null },
});

const roundTrip = (s: Station) => estimateDetour(s.dist).detourKm;

describe("planFill", () => {
  it("Volltanken ohne Anfahrt", () => {
    const plan = planFill(1.749, vehicle, null);
    expect(plan.fillCost).toBe(87.45);
    expect(plan.accessCost).toBe(0);
    expect(plan.effectiveCost).toBe(87.45);
  });

  it("Anfahrt 3 km = 6 km hin und zurück bei 7 l/100 km", () => {
    const plan = planFill(1.749, vehicle, estimateDetour(3).detourKm);
    // 6 km × 7 / 100 = 0,42 l × 1,749 € = 0,73 €
    expect(plan.accessCost).toBe(0.73);
    expect(plan.effectiveCost).toBe(88.18);
  });
});

describe("adviseStations", () => {
  it("Restbudget ohne Anfahrt: 40 € bei 1,749 € = 22,8 l", () => {
    const advice = adviseStations({
      stations: [station("a", 1.749, 3)],
      fuel: "e10",
      vehicle,
      remaining: 40,
      detourKmOf: () => null,
    }).get("a")!;
    expect(advice.affordable).toBe(22.8);
    expect(advice.shortfall).toBe(true);
    expect(advice.exhausted).toBe(false);
  });

  it("die Anfahrt geht vom Restbudget ab", () => {
    const advice = adviseStations({
      stations: [station("a", 2, 5)],
      fuel: "e10",
      vehicle,
      remaining: 20,
      detourKmOf: roundTrip,
    }).get("a")!;
    // 10 km × 7 / 100 × 2 € = 1,40 € Anfahrt → 18,60 € / 2 € = 9,3 l
    expect(advice.plan.accessCost).toBe(1.4);
    expect(advice.affordable).toBe(9.3);
  });

  it("aufgebrauchtes oder überzogenes Budget", () => {
    const advice = adviseStations({
      stations: [station("a", 1.749, 1)],
      fuel: "e10",
      vehicle,
      remaining: -12,
      detourKmOf: () => null,
    }).get("a")!;
    expect(advice.exhausted).toBe(true);
    expect(advice.affordable).toBe(0);
  });

  it("ohne Budget keine Liter-Aussage, ausreichendes Budget ohne Fehlbetrag", () => {
    const stations = [station("a", 1.749, 1)];
    const none = adviseStations({
      stations,
      fuel: "e10",
      vehicle,
      remaining: null,
      detourKmOf: () => null,
    }).get("a")!;
    expect(none.affordable).toBeNull();
    expect(none.shortfall).toBe(false);
    const plenty = adviseStations({
      stations,
      fuel: "e10",
      vehicle,
      remaining: 150,
      detourKmOf: () => null,
    }).get("a")!;
    expect(plenty.shortfall).toBe(false);
  });

  it("Stationen ohne Preis für die Sorte bekommen keine Empfehlung", () => {
    const advice = adviseStations({
      stations: [station("a", null, 1)],
      fuel: "e10",
      vehicle,
      remaining: 50,
      detourKmOf: () => null,
    });
    expect(advice.size).toBe(0);
  });
});

describe("bestChoice", () => {
  const advise = (stations: Station[]) =>
    adviseStations({ stations, fuel: "e10", vehicle, remaining: null, detourKmOf: roundTrip });

  it("eine nahe, etwas teurere Station kann die beste Wahl sein", () => {
    // fern: 1,739 € bei 15 km → 30 km Anfahrt = 2,10 l ≈ 3,65 € → 90,60 €
    // nah:  1,749 € bei 1 km → 2 km = 0,14 l ≈ 0,24 € → 87,69 €
    const stations = [station("far", 1.739, 15), station("near", 1.749, 1)];
    const best = bestChoice(stations, advise(stations))!;
    expect(best.station.id).toBe("near");
  });

  it("ohne Anfahrt gewinnt die günstigere", () => {
    const stations = [station("far", 1.739, 15), station("near", 1.749, 1)];
    const advice = adviseStations({
      stations,
      fuel: "e10",
      vehicle,
      remaining: null,
      detourKmOf: () => null,
    });
    expect(bestChoice(stations, advice)!.station.id).toBe("far");
  });

  it("geschlossene Stationen und fehlende Preise zählen nicht", () => {
    const stations = [
      station("closed", 1.5, 1, false),
      station("noprice", null, 1),
      station("a", 1.8, 2),
      station("b", 1.75, 2),
    ];
    const best = bestChoice(stations, advise(stations))!;
    expect(best.station.id).toBe("b");
    expect(best.candidates).toBe(2);
  });

  it("weniger als zwei Kandidaten: keine Empfehlung", () => {
    const stations = [station("a", 1.7, 1), station("closed", 1.6, 1, false)];
    expect(bestChoice(stations, advise(stations))).toBeNull();
  });

  it("Ersparnis gegenüber dem Median der effektiven Kosten", () => {
    const stations = [station("a", 1.7, 0), station("b", 1.8, 0), station("c", 1.9, 0)];
    const best = bestChoice(stations, advise(stations))!;
    expect(best.station.id).toBe("a");
    // Median 90,00 € − 85,00 €
    expect(best.savingVsMedian).toBe(5);
  });

  it("Gleichstand: die nähere Station", () => {
    const stations = [station("far", 1.7, 0.4), station("near", 1.7, 0.1)];
    const advice = adviseStations({
      stations,
      fuel: "e10",
      vehicle,
      remaining: null,
      detourKmOf: () => null,
    });
    expect(bestChoice(stations, advice)!.station.id).toBe("near");
  });
});

describe("budgetRange", () => {
  it("Liter und Kilometer des Restbudgets", () => {
    // 73,50 € / 1,75 € = 42,0 l → 42 / 7 × 100 = 600 km
    expect(budgetRange(73.5, 1.75, 7)).toEqual({ liters: 42, km: 600, price: 1.75 });
  });

  it("ohne Restbudget keine Reichweite", () => {
    expect(budgetRange(0, 1.75, 7)).toBeNull();
    expect(budgetRange(-5, 1.75, 7)).toBeNull();
  });
});

describe("detourScore mit Fahrzeugwerten", () => {
  const detour = estimateDetour(2); // 4 km, ~7,3 Min.

  it("ohne Fahrzeug gelten die bisherigen Annahmen (50 l, 7 l/100 km)", () => {
    expect(detourScore(1.7, 1.8, detour)).toBeCloseTo(
      detourScore(1.7, 1.8, detour, { liters: 50, consumption: 7 }),
      10,
    );
  });

  it("größerer Tank: mehr Ersparnis, höherer Verbrauch: teurerer Umweg", () => {
    const base = detourScore(1.7, 1.8, detour);
    expect(detourScore(1.7, 1.8, detour, { liters: 70, consumption: 7 })).toBeCloseTo(
      base + 0.1 * 20,
      10,
    );
    expect(detourScore(1.7, 1.8, detour, { liters: 50, consumption: 12 })).toBeCloseTo(
      base - ((4 * 5) / 100) * 1.7,
      10,
    );
  });
});
