import { describe, expect, it } from "vitest";
import { missingLegalFields, type LegalOperator } from "./legal";

const complete: LegalOperator = {
  name: "Max Mustermann",
  street: "Musterstr. 1",
  postCode: "10115",
  city: "Berlin",
  country: "Deutschland",
  email: "kontakt@example.de",
  phone: null,
};

describe("missingLegalFields", () => {
  it("vollständige Angaben: nichts fehlt (Telefon ist optional)", () => {
    expect(missingLegalFields(complete)).toEqual([]);
  });

  it("nennt die fehlenden Variablen", () => {
    expect(missingLegalFields({ ...complete, street: null, email: null })).toEqual([
      "VITE_LEGAL_STREET",
      "VITE_LEGAL_EMAIL",
    ]);
  });
});
