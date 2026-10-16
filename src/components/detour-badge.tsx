/** Geschätzter Umweg gegenüber der direkten Fahrt – schlichte Textzeile auf der Karte. */
import { CornerUpRight } from "lucide-react";
import { formatDistance, formatEuro } from "@/lib/format";

interface Props {
  detourKm: number;
  detourMin: number;
  savings?: number | undefined;
}

export function DetourBadge({ detourKm, detourMin, savings }: Props) {
  const positive = typeof savings === "number" && savings > 0.2;
  return (
    <p className="text-fine num mt-2 flex items-center gap-1.5 text-ink-2">
      <CornerUpRight aria-hidden className="size-3.5 shrink-0" />
      <span>
        Umweg +{Math.round(detourMin)} Min · +{formatDistance(detourKm)}
        {positive && (
          <span className="font-medium text-price-low"> · spart ca. {formatEuro(savings!)}</span>
        )}
      </span>
    </p>
  );
}
