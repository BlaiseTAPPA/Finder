/**
 * Anbieterangaben für Impressum und Datenschutzerklärung (Feature 0005).
 * Kommen aus VITE_LEGAL_*-Variablen, damit Name und Anschrift nicht im Repository stehen.
 * Sie sind ohnehin öffentlich: das Impressum zeigt sie an.
 */
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

const read = (key: string) => env[key]?.trim() || null;

export interface LegalOperator {
  name: string | null;
  street: string | null;
  postCode: string | null;
  city: string | null;
  country: string;
  email: string | null;
  phone: string | null;
}

export const LEGAL_OPERATOR: LegalOperator = {
  name: read("VITE_LEGAL_NAME"),
  street: read("VITE_LEGAL_STREET"),
  postCode: read("VITE_LEGAL_POSTCODE"),
  city: read("VITE_LEGAL_CITY"),
  country: read("VITE_LEGAL_COUNTRY") ?? "Deutschland",
  email: read("VITE_LEGAL_EMAIL"),
  phone: read("VITE_LEGAL_PHONE"),
};

/** Pflichtangaben nach § 5 DDG: Name, ladungsfähige Anschrift, E-Mail. */
export function missingLegalFields(operator: LegalOperator = LEGAL_OPERATOR): string[] {
  const required: [keyof LegalOperator, string][] = [
    ["name", "VITE_LEGAL_NAME"],
    ["street", "VITE_LEGAL_STREET"],
    ["postCode", "VITE_LEGAL_POSTCODE"],
    ["city", "VITE_LEGAL_CITY"],
    ["email", "VITE_LEGAL_EMAIL"],
  ];
  return required.filter(([field]) => !operator[field]).map(([, key]) => key);
}

/** Host eines optionalen dunklen Kartenstils (Datenschutzerklärung nennt den Anbieter). */
export function darkTilesHost(): string | null {
  const url = read("VITE_MAP_DARK_TILES_URL");
  if (!url) return null;
  try {
    return new URL(url.replace(/\{[a-z]\}/g, "0")).host;
  } catch {
    return null;
  }
}

/** Stand der Rechtstexte; bei inhaltlichen Änderungen anpassen. */
export const LEGAL_UPDATED = "16. Oktober 2026";
