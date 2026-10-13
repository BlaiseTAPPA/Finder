/**
 * Clerk-Darstellung auf den Design-Tokens aus styles.css.
 * clerk-js (v5) leitet Farbabstufungen per color-mix() ab, daher funktionieren
 * var(--…)-Werte direkt und folgen automatisch dem Hell-/Dunkelmodus.
 */
import type { ComponentProps } from "react";
import type { ClerkProvider, SignIn } from "@clerk/clerk-react";

const TOUCH = "@media (pointer: coarse)";

/** Global am ClerkProvider: Anmeldeseiten, Benutzermenü, Profil-Dialog. */
export const clerkAppearance: ComponentProps<typeof ClerkProvider>["appearance"] = {
  variables: {
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--primary-foreground)",
    colorDanger: "var(--destructive)",
    colorSuccess: "var(--success)",
    colorWarning: "var(--price-mid)",
    colorNeutral: "var(--foreground)",
    colorForeground: "var(--foreground)",
    colorMutedForeground: "var(--ink-2)",
    colorMuted: "var(--surface-sunken)",
    colorBackground: "var(--surface)",
    colorInput: "var(--surface)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorRing: "var(--ring)",
    colorModalBackdrop: "var(--scrim)",
    fontFamily: "inherit",
    fontFamilyButtons: "inherit",
    borderRadius: "0.5rem",
  },
  elements: {
    cardBox: { boxShadow: "var(--shadow-float)", border: "1px solid var(--border)" },
    userButtonPopoverCard: { boxShadow: "var(--shadow-float)" },
  },
};

/**
 * Clerk-Formulare auf Touch-Geräten: 16px-Eingaben (verhindert iOS-Auto-Zoom)
 * und 44px-Tippflächen. Mit Maus bleibt das Clerk-Standardlayout unverändert.
 */
export const touchFriendlyAppearance: ComponentProps<typeof SignIn>["appearance"] = {
  elements: {
    formFieldInput: { [TOUCH]: { fontSize: "16px", minHeight: "44px" } },
    formButtonPrimary: { [TOUCH]: { minHeight: "44px" } },
    socialButtonsBlockButton: { [TOUCH]: { minHeight: "44px" } },
    formFieldInputShowPasswordButton: { [TOUCH]: { minHeight: "44px", minWidth: "44px" } },
  },
};
