/**
 * Budgetstand der laufenden Periode (Feature 0002).
 * "compact" = Karte auf der Startseite (verlinkt /budget), "full" = Kopf der Budgetseite.
 */
import { ChevronRight, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatEuro, formatLiters } from "@/lib/format";
import { periodLabel, type BudgetSummary } from "@/lib/budget";
import type { BudgetPeriod } from "@/lib/account-input";

const STATUS_TEXT = {
  ok: null,
  "at-risk": "Bei diesem Tempo wird das Budget voraussichtlich überschritten.",
  over: "Budget überschritten.",
} as const;

function daysText(days: number): string {
  return days === 1 ? "noch 1 Tag" : `noch ${days} Tage`;
}

function Meter({ summary }: { summary: BudgetSummary }) {
  const ratio = summary.budget > 0 ? Math.min(summary.spent / summary.budget, 1) : 0;
  return (
    <div
      role="meter"
      aria-label="Verbrauchtes Budget"
      aria-valuemin={0}
      aria-valuemax={summary.budget}
      aria-valuenow={summary.spent}
      aria-valuetext={`${formatEuro(summary.spent)} von ${formatEuro(summary.budget)}`}
      className="h-2 overflow-hidden rounded-full bg-surface-sunken"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          summary.status === "over"
            ? "bg-destructive"
            : summary.status === "at-risk"
              ? "bg-price-mid"
              : "bg-price-low",
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

interface Props {
  summary: BudgetSummary;
  period: BudgetPeriod;
  variant: "compact" | "full";
}

export function BudgetStatus({ summary, period, variant }: Props) {
  const warning = STATUS_TEXT[summary.status];
  const remainingText =
    summary.remaining >= 0
      ? `noch ${formatEuro(summary.remaining)}`
      : `${formatEuro(-summary.remaining)} darüber`;

  if (variant === "compact") {
    return (
      <Link
        to="/budget"
        className={cn(
          "block rounded-md border bg-surface p-4 transition-colors hover:bg-surface-sunken",
          summary.status !== "ok" && "border-price-mid",
          summary.status === "over" && "border-destructive",
        )}
      >
        <div className="flex items-center gap-3">
          <Wallet aria-hidden className="size-5 shrink-0 text-ink-3" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-foreground">
              <span className="num">
                {formatEuro(summary.spent)} / {formatEuro(summary.budget)}
              </span>
            </p>
            <p className="text-caption num text-ink-2">
              {remainingText} · {daysText(summary.daysLeft)}
            </p>
          </div>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />
        </div>
        <div className="mt-3">
          <Meter summary={summary} />
        </div>
        {warning && (
          <p
            className={cn(
              "text-fine mt-2 font-medium",
              summary.status === "over" ? "text-destructive" : "text-foreground",
            )}
          >
            {warning}
          </p>
        )}
      </Link>
    );
  }

  return (
    <section
      aria-labelledby="budget-status-title"
      className="rounded-md border bg-surface p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="budget-status-title" className="text-body font-semibold text-foreground">
          {periodLabel(period, summary.bounds)}
        </h2>
        <span className="text-caption num text-ink-2">{daysText(summary.daysLeft)}</span>
      </div>

      <p className="price-display num mt-3 text-3xl leading-none text-foreground">
        {formatEuro(summary.spent)}
        <span className="text-body ml-2 font-normal text-ink-2">
          von {formatEuro(summary.budget)}
        </span>
      </p>
      <div className="mt-3">
        <Meter summary={summary} />
      </div>

      <dl className="text-caption mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <div>
          <dt className="text-ink-3">Rest</dt>
          <dd
            className={cn(
              "num font-semibold",
              summary.remaining < 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {formatEuro(summary.remaining)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">Getankt</dt>
          <dd className="num font-semibold text-foreground">{formatLiters(summary.liters)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Hochrechnung</dt>
          <dd className="num font-semibold text-foreground">
            {summary.projected !== null
              ? `≈ ${formatEuro(summary.projected)}`
              : "noch zu wenig Daten"}
          </dd>
        </div>
      </dl>

      {warning && (
        <p
          className={cn(
            "text-caption mt-3 rounded-md px-3 py-2 font-medium",
            summary.status === "over"
              ? "bg-destructive/10 text-destructive"
              : "bg-price-mid/14 text-foreground",
          )}
        >
          {warning}
        </p>
      )}
      <p className="text-fine mt-3 text-ink-3">
        Die Hochrechnung ist eine Schätzung auf Basis deiner bisherigen Tankvorgänge.
      </p>
    </section>
  );
}
