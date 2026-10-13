/**
 * Preisanzeige wie an der Zapfsäule: dritte Nachkommastelle hochgestellt (1,74⁹ €).
 * Rein darstellend – der Wert kommt unverändert aus formatPrice().
 * Screenreader lesen den vollständigen Preis, die Ziffernoptik ist aria-hidden.
 */
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  value: number | null;
  className?: string | undefined;
  /** Euro-Zeichen weglassen (z. B. in dichten Tabellen). */
  hideCurrency?: boolean;
}

export function PriceFigure({ value, className, hideCurrency = false }: Props) {
  const full = formatPrice(value);
  const match = /^(\d+,\d{2})(\d) €$/.exec(full);

  if (!match) {
    return <span className={cn("price-display", className)}>{full}</span>;
  }

  return (
    <span className={cn("price-display whitespace-nowrap", className)}>
      <span className="sr-only">{full}</span>
      <span aria-hidden>
        {match[1]}
        <span className="relative -top-[0.55em] ml-px text-[0.6em] leading-none">{match[2]}</span>
        {!hideCurrency && <span className="ml-1 text-[0.6em] font-medium">€</span>}
      </span>
    </span>
  );
}
