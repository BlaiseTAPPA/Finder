/**
 * Clerk-Formulare auf Touch-Geräten: 16px-Eingaben (verhindert iOS-Auto-Zoom)
 * und 44px-Tippflächen. Mit Maus bleibt das Clerk-Standardlayout unverändert.
 */
import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/clerk-react";

const TOUCH = "@media (pointer: coarse)";

export const touchFriendlyAppearance: ComponentProps<typeof SignIn>["appearance"] = {
  elements: {
    formFieldInput: { [TOUCH]: { fontSize: "16px", minHeight: "44px" } },
    formButtonPrimary: { [TOUCH]: { minHeight: "44px" } },
    socialButtonsBlockButton: { [TOUCH]: { minHeight: "44px" } },
    formFieldInputShowPasswordButton: { [TOUCH]: { minHeight: "44px", minWidth: "44px" } },
  },
};
