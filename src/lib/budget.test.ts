import { describe, expect, it } from "vitest";
import {
  affordableLiters,
  amountFromLiters,
  litersFromAmount,
  periodBounds,
  periodLabel,
  periodTotals,
  summarizeBudget,
} from "./budget";
import type { FuelLog } from "./account-input";

const at = (iso: string) => Date.parse(iso);
const iso = (ms: number) => new Date(ms).toISOString();

let nextId = 0;
const log = (filledAt: string, liters: number, pricePerLiter: number): FuelLog => ({
  id: `log-${nextId++}`,
  filledAt,
  station: null,
  fuelType: "e10",
  liters,
  pricePerLiter,
});

describe("periodBounds – Woche (Montag bis Sonntag, Berliner Zeit)", () => {
  it("Sonntag 23:30 gehört noch zur laufenden Woche", () => {
    // So 11.10.2026 23:30 MESZ = 21:30 UTC
    const b = periodBounds("weekly", at("2026-10-11T21:30:00Z"));
    expect(iso(b.start)).toBe("2026-10-04T22:00:00.000Z"); // Mo 05.10. 00:00 MESZ
    expect(iso(b.end)).toBe("2026-10-11T22:00:00.000Z"); // Mo 12.10. 00:00 MESZ
  });

  it("Montag 00:30 beginnt die neue Woche", () => {
    // Mo 12.10.2026 00:30 MESZ = So 22:30 UTC – in UTC noch Sonntag!
    const b = periodBounds("weekly", at("2026-10-11T22:30:00Z"));
    expect(iso(b.start)).toBe("2026-10-11T22:00:00.000Z");
    expect(b.totalDays).toBe(7);
  });

  it("Woche mit Ende der Sommerzeit (25.10.2026) endet um Mitternacht MEZ", () => {
    const b = periodBounds("weekly", at("2026-10-21T10:00:00Z"));
    expect(iso(b.start)).toBe("2026-10-18T22:00:00.000Z"); // Mo 19.10. 00:00 MESZ
    expect(iso(b.end)).toBe("2026-10-25T23:00:00.000Z"); // Mo 26.10. 00:00 MEZ
  });

  it("Woche über den Jahreswechsel", () => {
    const b = periodBounds("weekly", at("2027-01-01T12:00:00Z")); // Freitag
    expect(iso(b.start)).toBe("2026-12-27T23:00:00.000Z"); // Mo 28.12. 00:00 MEZ
    expect(iso(b.end)).toBe("2027-01-03T23:00:00.000Z");
  });
});

describe("periodBounds – Monat (Kalendermonat, Berliner Zeit)", () => {
  it("31.10. 23:30 gehört noch zum Oktober", () => {
    const b = periodBounds("monthly", at("2026-10-31T22:30:00Z")); // 23:30 MEZ
    expect(iso(b.start)).toBe("2026-09-30T22:00:00.000Z"); // 01.10. 00:00 MESZ
    expect(iso(b.end)).toBe("2026-10-31T23:00:00.000Z"); // 01.11. 00:00 MEZ
    expect(b.totalDays).toBe(31);
  });

  it("01.11. 00:30 ist schon November", () => {
    const b = periodBounds("monthly", at("2026-10-31T23:30:00Z"));
    expect(iso(b.start)).toBe("2026-10-31T23:00:00.000Z");
    expect(b.totalDays).toBe(30);
  });

  it("März mit Beginn der Sommerzeit", () => {
    const b = periodBounds("monthly", at("2026-03-15T12:00:00Z"));
    expect(iso(b.start)).toBe("2026-02-28T23:00:00.000Z"); // 01.03. 00:00 MEZ
    expect(iso(b.end)).toBe("2026-03-31T22:00:00.000Z"); // 01.04. 00:00 MESZ
  });

  it("Februar im Nicht-Schaltjahr hat 28 Tage", () => {
    expect(periodBounds("monthly", at("2027-02-10T12:00:00Z")).totalDays).toBe(28);
  });
});

describe("summarizeBudget", () => {
  const budget = { amount: 200, period: "monthly" as const };
  const now = at("2026-10-13T10:00:00Z"); // Tag 13 von 31

  it("rechnet Ausgaben, Rest und Hochrechnung der laufenden Periode", () => {
    const s = summarizeBudget(
      budget,
      [
        log("2026-10-02T07:00:00Z", 50, 1.8), // 90,00 €
        log("2026-10-10T16:00:00Z", 20, 1.75), // 35,00 €
        log("2026-09-28T07:00:00Z", 40, 1.7), // Vormonat, zählt nicht
      ],
      now,
    );
    expect(s.spent).toBe(125);
    expect(s.liters).toBe(70);
    expect(s.entries).toBe(2);
    expect(s.remaining).toBe(75);
    expect(s.daysLeft).toBe(19); // 13. bis 31., heute eingeschlossen
    expect(s.projected).toBe(298.08); // 125 / 13 × 31
    expect(s.status).toBe("at-risk");
  });

  it("zeigt keine Hochrechnung vor Tag 3", () => {
    const s = summarizeBudget(
      budget,
      [log("2026-10-01T07:00:00Z", 30, 1.8), log("2026-10-02T07:00:00Z", 30, 1.8)],
      at("2026-10-02T10:00:00Z"),
    );
    expect(s.projected).toBeNull();
    expect(s.status).toBe("ok");
  });

  it("zeigt keine Hochrechnung mit nur einem Tankvorgang", () => {
    const s = summarizeBudget(budget, [log("2026-10-02T07:00:00Z", 30, 1.8)], now);
    expect(s.projected).toBeNull();
  });

  it("meldet ein überschrittenes Budget", () => {
    const s = summarizeBudget(budget, [log("2026-10-05T07:00:00Z", 120, 1.8)], now); // 216 €
    expect(s.status).toBe("over");
    expect(s.remaining).toBe(-16);
  });

  it("Tankvorgang am Sonntag 23:30 zählt zur alten Woche, Montag 00:30 zur neuen", () => {
    const weekly = { amount: 60, period: "weekly" as const };
    const logs = [log("2026-10-11T21:30:00Z", 10, 1.8), log("2026-10-11T22:30:00Z", 20, 1.8)];
    expect(summarizeBudget(weekly, logs, at("2026-10-11T21:45:00Z")).spent).toBe(18);
    expect(summarizeBudget(weekly, logs, at("2026-10-12T08:00:00Z")).spent).toBe(36);
  });
});

describe("Liter und Beträge", () => {
  it("rechnet zwischen Litern und Betrag", () => {
    expect(litersFromAmount(50, 1.749)).toBe(28.59);
    expect(amountFromLiters(40, 1.749)).toBe(69.96);
  });

  it("rundet bezahlbare Liter ab und wird nie negativ", () => {
    expect(affordableLiters(84, 1.749)).toBe(48);
    expect(affordableLiters(10, 1.5)).toBe(6.6);
    expect(affordableLiters(-5, 1.7)).toBe(0);
  });
});

describe("periodTotals und periodLabel", () => {
  it("summiert die letzten Perioden, neueste zuerst", () => {
    const totals = periodTotals(
      "monthly",
      [log("2026-10-02T07:00:00Z", 10, 2), log("2026-09-15T07:00:00Z", 20, 2)],
      at("2026-10-13T10:00:00Z"),
      3,
    );
    expect(totals.map((t) => t.spent)).toEqual([20, 40, 0]);
    expect(periodLabel("monthly", totals[1]!.bounds)).toBe("September 2026");
  });

  it("beschriftet Wochen mit erstem und letztem Tag", () => {
    const b = periodBounds("weekly", at("2026-10-14T10:00:00Z"));
    expect(periodLabel("weekly", b)).toBe("12. Okt. – 18. Okt.");
  });
});
