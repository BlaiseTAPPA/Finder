/** Trend-Badge (Preisniveau der letzten 7 Tage) + Empfehlungshinweis. */
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { TrendSummary } from "@/lib/trend.functions";

const LABELS = {
  low: "Preis niedrig",
  mid: "Im Mittel",
  high: "Preis hoch",
} as const;

const STYLES = {
  low: "bg-success/12 text-success",
  mid: "bg-parchment text-ink-muted",
  high: "bg-destructive/10 text-destructive",
} as const;

export function TrendBadge({ trend }: { trend: TrendSummary | undefined }) {
  if (!trend?.classification || trend.percentile === null) return null;
  const kind = trend.classification;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-fine cursor-help rounded-full border-0 px-2.5 py-1 font-medium",
              STYLES[kind],
            )}
          >
            {LABELS[kind]}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px]">
          <p className="text-fine">
            Der aktuelle Preis liegt über {trend.percentile}% aller Messwerte der letzten 7 Tage
            (Spanne {formatPrice(trend.min)} – {formatPrice(trend.max)}, Ø {formatPrice(trend.avg)},{" "}
            {trend.samples} Messungen).
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Kontexthinweis zum üblichen Tagesverlauf – nur bei belastbarer Datenlage. */
export function TrendHint({ trend }: { trend: TrendSummary | undefined }) {
  if (!trend?.confident || !trend.recommendation) return null;
  const good = trend.recommendation.kind === "good-now";
  return (
    <p
      className={cn(
        "text-fine mt-3 rounded-md px-3 py-2",
        good ? "bg-success/10 text-success" : "bg-parchment text-ink-muted",
      )}
    >
      {good ? "✅ " : "📉 "}
      {trend.recommendation.text}
    </p>
  );
}
