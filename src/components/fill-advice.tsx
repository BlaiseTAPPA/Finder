/**
 * Budgetbewusste Hinweise (Feature 0003): die "Beste Wahl" über den Ergebnissen und die
 * Reichweite des Restbudgets auf /budget.
 * Alles Schätzungen – die Texte sagen das.
 */
import { CircleCheck, Fuel, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceFigure } from "@/components/price-figure";
import { cn } from "@/lib/utils";
import { formatDistance, formatEuro, formatLiters, formatPrice } from "@/lib/format";
import { MIN_ACCESS_COST, MIN_BEST_SAVING } from "@/lib/budget-advice";
import type { BestChoice, BudgetRange, FillPlan, StationAdvice } from "@/lib/budget-advice";
import type { TrendSummary } from "@/lib/trend.functions";
import type { Station } from "@/types/station";

/** "Anfahrt" in der Umkreissuche, "Umweg" auf der Strecke. */
export type AccessLabel = "Anfahrt" | "Umweg";

function planText(plan: FillPlan, accessLabel: AccessLabel): string {
  const base = `Volltanken (${formatLiters(plan.liters)}) ≈ ${formatEuro(plan.fillCost)}`;
  return plan.accessCost >= MIN_ACCESS_COST
    ? `${base} + ${formatEuro(plan.accessCost)} ${accessLabel}`
    : base;
}

/** Budgetzeile, nur wenn das Restbudget die volle Füllung nicht deckt. */
function BudgetLine({ advice }: { advice: StationAdvice }) {
  if (advice.exhausted) {
    return <span className="font-medium text-destructive">Budget aufgebraucht</span>;
  }
  if (advice.shortfall && advice.affordable !== null) {
    return (
      <span className="font-medium text-foreground">
        Restbudget reicht für {formatLiters(advice.affordable)}
      </span>
    );
  }
  return null;
}

/** Zeitpunkt-Hinweis aus dem 7-Tage-Trend der Station, falls belastbar. */
function TimingHint({ trend }: { trend: TrendSummary | undefined }) {
  if (trend?.confident && trend.recommendation) {
    const good = trend.recommendation.kind === "good-now";
    const Icon = good ? CircleCheck : TrendingDown;
    return (
      <p className={cn("flex items-start gap-2", good ? "text-price-low" : "text-ink-2")}>
        <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>{trend.recommendation.text}</span>
      </p>
    );
  }
  if (trend?.classification === "high") {
    return (
      <p className="flex items-start gap-2 text-ink-2">
        <TrendingUp aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>Gerade teurer als meist in den letzten 7 Tagen.</span>
      </p>
    );
  }
  return null;
}

interface BestChoiceProps {
  best: BestChoice;
  accessLabel: AccessLabel;
  trend: TrendSummary | undefined;
  onShow: (station: Station) => void;
  onFillUp?: ((station: Station) => void) | undefined;
}

export function BestChoiceCard({ best, accessLabel, trend, onShow, onFillUp }: BestChoiceProps) {
  const { station, advice, savingVsMedian } = best;
  const trip = accessLabel === "Umweg";

  return (
    <section
      aria-labelledby="best-choice-title"
      className="mb-4 rounded-md border bg-surface p-4 sm:p-5"
    >
      <p
        id="best-choice-title"
        className="text-fine flex items-center gap-1.5 font-medium text-ink-2"
      >
        <Wallet aria-hidden className="size-3.5" />
        Beste Wahl für dein Budget
      </p>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
        <div className="min-w-0">
          <h3 title={station.name} className="text-body truncate font-semibold text-foreground">
            {station.name}
          </h3>
          <p className="text-caption num truncate text-ink-2">
            {station.brand} · {formatDistance(station.dist)}
            {trip ? " zur Route" : " entfernt"}
          </p>
        </div>
        <p className="text-price-sm text-foreground">
          <PriceFigure value={advice.plan.price} />
        </p>
      </div>

      <div className="text-caption num mt-3 grid gap-1">
        <p className="text-foreground">
          {planText(advice.plan, accessLabel)}
          {advice.plan.accessCost >= MIN_ACCESS_COST && (
            <span className="text-ink-2"> = {formatEuro(advice.plan.effectiveCost)}</span>
          )}
        </p>
        {savingVsMedian >= MIN_BEST_SAVING && (
          <p className="font-medium text-price-low">
            ca. {formatEuro(savingVsMedian)} günstiger als der Mittelwert{" "}
            {trip ? "der Strecke" : "hier"}
          </p>
        )}
        {(advice.exhausted || advice.shortfall) && (
          <p>
            <BudgetLine advice={advice} />
          </p>
        )}
        <TimingHint trend={trend} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => onShow(station)}>
          Anzeigen
        </Button>
        {onFillUp && (
          <Button variant="ghost" className="text-ink-2" onClick={() => onFillUp(station)}>
            <Fuel className="size-4" />
            Getankt
          </Button>
        )}
      </div>

      <p className="text-fine mt-3 text-ink-3">
        Schätzung für einen vollen Tank. {accessLabel} als Luftlinie
        {trip ? " zur Route und zurück" : " hin und zurück"}, mit deinem Verbrauch; ohne
        Zeitaufwand.
      </p>
    </section>
  );
}

/** Reichweite des Restbudgets auf /budget. */
export function BudgetRangeNote({ range }: { range: BudgetRange }) {
  return (
    <p className="text-caption num mt-3 text-ink-2">
      Reicht noch für ca. {formatLiters(range.liters)} ≈{" "}
      {new Intl.NumberFormat("de-DE").format(range.km)} km – beim Preis deiner letzten Tankfüllung (
      {formatPrice(range.price)}/L).
    </p>
  );
}
