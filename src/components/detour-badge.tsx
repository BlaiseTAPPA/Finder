/** Badge mit dem geschätzten Umweg gegenüber der direkten Fahrt. */
import { CornerUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/format";

interface Props {
  detourKm: number;
  detourMin: number;
  savings?: number | undefined;
}

export function DetourBadge({ detourKm, detourMin, savings }: Props) {
  const positive = typeof savings === "number" && savings > 0.2;
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant="neutral">
        <CornerUpRight aria-hidden />
        <span className="num">
          +{Math.round(detourMin)} Min · +{formatDistance(detourKm)}
        </span>
      </Badge>
      {positive && (
        <span className="num text-fine font-medium text-price-low">
          spart ca. {savings!.toFixed(2).replace(".", ",")} €
        </span>
      )}
    </span>
  );
}
