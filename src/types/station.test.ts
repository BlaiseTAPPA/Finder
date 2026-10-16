import { describe, expect, it } from "vitest";
import { formatShortAddress, type Station } from "./station";

const station = (name: string, brand: string, place = "Ludwigshafen"): Station => ({
  id: "x",
  name,
  brand,
  street: "Hauptstr.",
  houseNumber: "257",
  postCode: "67065",
  place,
  lat: 0,
  lng: 0,
  dist: 1,
  isOpen: true,
  prices: { e5: null, e10: null, diesel: null },
});

describe("formatShortAddress", () => {
  it("lässt Marke und Ort weg, wenn der Name sie enthält", () => {
    expect(formatShortAddress(station("TotalEnergies Ludwigshafen", "TotalEnergies"))).toBe(
      "Hauptstr. 257",
    );
  });

  it("ergänzt Marke und Ort, die im Namen fehlen; nie die Postleitzahl", () => {
    expect(formatShortAddress(station("Autohof Süd", "JET", "Mannheim"))).toBe(
      "JET · Hauptstr. 257, Mannheim",
    );
  });

  it("vergleicht ohne Groß-/Kleinschreibung", () => {
    expect(formatShortAddress(station("JET LUDWIGSHAFEN HAUPTSTR.", "Jet", "LUDWIGSHAFEN"))).toBe(
      "Hauptstr. 257",
    );
  });

  it("ohne Marke nur Straße und Ort", () => {
    expect(formatShortAddress(station("Freie Tankstelle", "", "Speyer"))).toBe(
      "Hauptstr. 257, Speyer",
    );
  });
});
