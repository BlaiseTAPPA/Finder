import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/*
 * Sonner injiziert eigenes CSS ohne Layer, Tailwind-Klassen verlieren dagegen.
 * Gestylt wird daher über Sonners CSS-Variablen, gespeist aus den Design-Tokens —
 * so folgen Toasts auch dem Dunkelmodus.
 */
const tint = (color: string, amount: number) =>
  `color-mix(in oklch, ${color} ${amount}%, var(--surface))`;

const tokens = {
  "--normal-bg": "var(--surface)",
  "--normal-bg-hover": "var(--surface-sunken)",
  "--normal-border": "var(--border)",
  "--normal-border-hover": "var(--border-strong)",
  "--normal-text": "var(--foreground)",
  "--success-bg": tint("var(--price-low)", 10),
  "--success-border": tint("var(--price-low)", 35),
  "--success-text": "var(--price-low)",
  "--error-bg": tint("var(--destructive)", 10),
  "--error-border": tint("var(--destructive)", 35),
  "--error-text": "var(--destructive)",
  "--warning-bg": tint("var(--price-mid)", 14),
  "--warning-border": tint("var(--price-mid)", 40),
  "--warning-text": "var(--foreground)",
  "--info-bg": "var(--surface)",
  "--info-border": "var(--border)",
  "--info-text": "var(--foreground)",
  "--border-radius": "var(--radius-md)",
  fontFamily: "inherit",
} as CSSProperties;

/* Unterhalb der klebenden Kopfleiste (h-14) inkl. Notch-Abstand */
const belowHeader = "calc(4rem + env(safe-area-inset-top))";

const Toaster = ({ style, ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      // Dunkelmodus folgt dem System (wie styles.css); sonst bleiben Sonners Hell-Farben aktiv.
      theme="system"
      offset={{ top: belowHeader }}
      mobileOffset={{ top: belowHeader }}
      style={{ ...tokens, ...style }}
      toastOptions={{ style: { boxShadow: "var(--shadow-float)" } }}
      {...props}
    />
  );
};

export { Toaster };
