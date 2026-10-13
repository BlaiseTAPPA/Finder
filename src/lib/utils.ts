import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Die eigenen Typo-Utilities (styles.css) als Schriftgrößen registrieren —
 * sonst hält tailwind-merge sie für Textfarben und verwirft z. B. "text-primary".
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["fine", "caption", "body", "title", "price-xl", "price-sm"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
