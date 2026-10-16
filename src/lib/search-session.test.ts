import { describe, expect, it } from "vitest";
import { parseSearchSession, serializeSearchSession, type SearchSession } from "./search-session";

const session: SearchSession = {
  center: { lat: 49.2231, lng: 8.3645 },
  placeLabel: "Germersheim",
  queryText: "Germersheim",
  radius: 10,
  fuel: "e10",
  sort: "distance",
  tab: "trip",
  trip: {
    origin: { lat: 49.2231, lng: 8.3645, label: "Germersheim" },
    destination: { lat: 49.0069, lng: 8.4037, label: "Karlsruhe" },
    originText: "Germersheim",
    destinationText: "Karlsruhe",
    corridorKm: 2.5,
    routeSort: "detour",
    query: {
      origin: { lat: 49.2231, lng: 8.3645 },
      destination: { lat: 49.0069, lng: 8.4037 },
      corridorKm: 2.5,
    },
  },
};

describe("search session", () => {
  it("übersteht Speichern und Laden unverändert", () => {
    expect(parseSearchSession(serializeSearchSession(session))).toEqual(session);
  });

  it("liest ältere Einträge ohne Text im Ortsfeld", () => {
    const { queryText: _text, ...older } = session;
    expect(parseSearchSession(serializeSearchSession(older))).toEqual(older);
  });

  it("akzeptiert den Ausgangszustand ohne Suche", () => {
    const empty: SearchSession = {
      center: null,
      placeLabel: null,
      radius: 5,
      fuel: "e5",
      sort: "price",
      tab: "search",
      trip: {
        origin: null,
        destination: null,
        originText: "",
        destinationText: "",
        corridorKm: 2,
        routeSort: "best",
        query: null,
      },
    };
    expect(parseSearchSession(serializeSearchSession(empty))).toEqual(empty);
  });

  it("ignoriert fehlende oder kaputte Einträge", () => {
    expect(parseSearchSession(null)).toBeNull();
    expect(parseSearchSession("")).toBeNull();
    expect(parseSearchSession("{not json")).toBeNull();
    expect(parseSearchSession("[]")).toBeNull();
  });

  it("verwirft unbekannte Versionen", () => {
    const raw = JSON.stringify({ ...JSON.parse(serializeSearchSession(session)), v: 2 });
    expect(parseSearchSession(raw)).toBeNull();
  });

  it("verwirft Werte außerhalb der erlaubten Bereiche", () => {
    const tamper = (patch: (s: Record<string, unknown>) => void) => {
      const data = JSON.parse(serializeSearchSession(session)) as Record<string, unknown>;
      patch(data);
      return parseSearchSession(JSON.stringify(data));
    };
    expect(tamper((s) => (s.radius = 99))).toBeNull();
    expect(tamper((s) => (s.fuel = "lpg"))).toBeNull();
    expect(tamper((s) => (s.center = { lat: 120, lng: 8 }))).toBeNull();
    expect(tamper((s) => ((s.trip as Record<string, unknown>).corridorKm = 0))).toBeNull();
  });
});
