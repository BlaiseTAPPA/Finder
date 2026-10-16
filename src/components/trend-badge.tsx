/** Preisniveau der letzten 7 Tage (Verlauf-Dialog) + Empfehlungshinweis (Stationskarte). */
import { CircleCheck, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { TrendSummary } from "@/lib/trend.functions";

const LABELS = {
  low: "Preis niedrig",
  mid: "Im Mittel",
  high: "Preis hoch",
} as const;

const VARIANTS = {
  low: "positive",
  mid: "caution",
  high: "negative",
} as const;

/** Preisniveau der letzten 7 Tage mit sichtbarer Erklärung (im Verlauf-Dialog). */
export function TrendDetails({ trend }: { trend: TrendSummary | undefined }) {
  if (!trend?.classification || trend.percentile === null) return null;
  const kind = trend.classification;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md bg-surface-sunken px-3 py-2.5">
      <Badge variant={VARIANTS[kind]}>{LABELS[kind]}</Badge>
      <p className="text-fine min-w-0 flex-1 text-ink-2">
        Der aktuelle Preis liegt über {trend.percentile}% aller Messwerte der letzten 7 Tage (Spanne{" "}
        {formatPrice(trend.min)} – {formatPrice(trend.max)}, Ø {formatPrice(trend.avg)},{" "}
        {trend.samples} Messungen).
      </p>
    </div>
  );
}

/** Kontexthinweis zum üblichen Tagesverlauf – nur bei belastbarer Datenlage. */
export function TrendHint({ trend }: { trend: TrendSummary | undefined }) {
  if (!trend?.confident || !trend.recommendation) return null;
  const good = trend.recommendation.kind === "good-now";
  const Icon = good ? CircleCheck : TrendingDown;
  return (
    <p
      className={cn(
        "text-fine mt-3 flex items-start gap-2 rounded-md px-3 py-2",
        good ? "bg-price-low/10 text-price-low" : "bg-surface-sunken text-ink-2",
      )}
    >
      <Icon aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{trend.recommendation.text}</span>
    </p>
  );
}
