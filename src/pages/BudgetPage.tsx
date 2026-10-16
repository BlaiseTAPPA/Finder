/** Tankbudget (Feature 0002): Stand, Einstellungen, Tankbuch, Vorperioden und Fahrzeug. */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Car, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetStatus } from "@/components/budget-status";
import { FillUpDialog } from "@/components/fill-up-dialog";
import { PriceFigure } from "@/components/price-figure";
import { Notice } from "@/components/states";
import { VehicleForm } from "@/components/vehicle-form";
import { deleteFuelLog, saveBudget } from "@/lib/account.functions";
import type { BudgetPeriod, FuelBudget, FuelLog } from "@/lib/account-input";
import {
  logTotal,
  logsInPeriod,
  periodBounds,
  periodLabel,
  periodTotals,
  summarizeBudget,
} from "@/lib/budget";
import { formatDecimal, formatEuro, formatLiters, parseDecimal } from "@/lib/format";
import { useFuelBudget, useRefreshFuelBudget } from "@/lib/fuel-budget";
import { FUEL_LABELS } from "@/types/station";

const PERIOD_LABELS: Record<BudgetPeriod, string> = { weekly: "Pro Woche", monthly: "Pro Monat" };
/** Vorperioden in der Übersicht (zusätzlich zur laufenden). */
const PREVIOUS_PERIODS: Record<BudgetPeriod, number> = { weekly: 7, monthly: 5 };

const entryDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function Section({
  id,
  title,
  children,
  action,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="text-body font-semibold text-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BudgetForm({ budget, onSaved }: { budget: FuelBudget | null; onSaved: () => void }) {
  const [amount, setAmount] = useState(budget ? formatDecimal(budget.amount) : "");
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? "monthly");
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState(false);
  const value = parseDecimal(amount);
  const error =
    value === null || value < 1 || value > 10000
      ? "Bitte einen Betrag von 1 bis 10.000 € eingeben."
      : null;

  async function submit() {
    setTouched(true);
    if (error) return;
    setPending(true);
    try {
      await saveBudget({ data: { amount: value!, period } });
      toast.success("Budget gespeichert");
      onSaved();
    } catch {
      toast.error("Budget konnte nicht gespeichert werden. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      className="grid gap-4 rounded-md border bg-surface p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="budget-amount" className="text-caption text-ink-2">
          Budget (€)
        </Label>
        <Input
          id="budget-amount"
          inputMode="decimal"
          value={amount}
          placeholder="z. B. 200"
          aria-invalid={touched && error !== null}
          aria-describedby={touched && error ? "budget-amount-error" : undefined}
          onChange={(event) => setAmount(event.target.value)}
        />
        {touched && error && (
          <p id="budget-amount-error" className="text-fine text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="grid gap-1.5">
        <span id="budget-period-label" className="text-caption text-ink-2">
          Zeitraum
        </span>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
          <TabsList aria-labelledby="budget-period-label" className="w-full sm:w-auto">
            {(["weekly", "monthly"] as const).map((p) => (
              <TabsTrigger key={p} value={p} className="flex-1 sm:flex-none sm:px-4">
                {PERIOD_LABELS[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {budget ? "Budget ändern" : "Budget festlegen"}
      </Button>
    </form>
  );
}

function LogRow({
  log,
  onEdit,
  onDeleted,
}: {
  log: FuelLog;
  onEdit: (log: FuelLog) => void;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const title = log.station?.name ?? "Ohne Station";

  async function remove() {
    setPending(true);
    try {
      await deleteFuelLog({ data: { id: log.id } });
      toast.success("Tankvorgang gelöscht");
      onDeleted();
    } catch {
      toast.error("Tankvorgang konnte nicht gelöscht werden.");
      setPending(false);
    }
  }

  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-body truncate font-semibold text-foreground">{title}</p>
        <p className="text-caption num truncate text-ink-2">
          {entryDate.format(new Date(log.filledAt))} · {FUEL_LABELS[log.fuelType]} ·{" "}
          {formatLiters(log.liters)} × <PriceFigure value={log.pricePerLiter} hideCurrency />
        </p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Abbrechen
          </Button>
          <Button variant="destructive" size="sm" disabled={pending} onClick={() => void remove()}>
            {pending && <Loader2 className="animate-spin" />}
            Löschen
          </Button>
        </div>
      ) : (
        <>
          <span className="num text-body shrink-0 font-semibold text-foreground">
            {formatEuro(logTotal(log))}
          </span>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${title} bearbeiten`}
              className="rounded-full text-ink-3"
              onClick={() => onEdit(log)}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${title} löschen`}
              className="rounded-full text-ink-3 hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              <Trash2 />
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

export function BudgetPage() {
  const { data, isPending, isError, refetch } = useFuelBudget();
  const refresh = useRefreshFuelBudget();
  const [dialog, setDialog] = useState<{ open: boolean; entry: FuelLog | null }>({
    open: false,
    entry: null,
  });
  const now = Date.now();

  const period: BudgetPeriod = data?.budget?.period ?? "monthly";
  const summary = useMemo(
    () => (data?.budget ? summarizeBudget(data.budget, data.logs, now) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );
  const currentLogs = useMemo(
    () => (data ? logsInPeriod(data.logs, periodBounds(period, now)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, period],
  );
  const previous = useMemo(
    () => (data ? periodTotals(period, data.logs, now, PREVIOUS_PERIODS[period] + 1).slice(1) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, period],
  );

  return (
    <main className="mx-auto max-w-2xl px-safe pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Link
        to="/"
        className="text-caption -ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-ink-2 hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück
      </Link>
      <h1 className="text-title mt-1 text-foreground">Budget</h1>
      <p className="text-caption mt-1 text-ink-2">
        Behalte deine Tankausgaben im Blick. Das Budget hilft dir beim Planen – einhalten musst du
        es selbst.
      </p>

      {isPending && (
        <div className="mt-6 grid gap-3">
          <Skeleton className="h-40 rounded-md" />
          <Skeleton className="h-24 rounded-md" />
        </div>
      )}

      {isError && (
        <div className="mt-6">
          <Notice
            title="Budgetdaten nicht verfügbar"
            description="Die Daten konnten nicht geladen werden. Prüfe deine Verbindung."
          >
            <Button variant="outline" onClick={() => void refetch()}>
              Erneut versuchen
            </Button>
          </Notice>
        </div>
      )}

      {data && !data.vehicle && (
        <Section id="budget-vehicle-first" title="Zuerst dein Fahrzeug">
          <div className="rounded-md border bg-surface p-4 sm:p-5">
            <p className="text-caption mb-4 text-ink-2">
              Für das Budget brauchen wir Kraftstoff, Verbrauch und Tankgröße deines Fahrzeugs.
            </p>
            <VehicleForm
              initial={null}
              submitLabel="Fahrzeug speichern"
              onSaved={() => void refresh()}
            />
          </div>
        </Section>
      )}

      {data?.vehicle && (
        <>
          {summary && data.budget ? (
            <div className="mt-6">
              <BudgetStatus summary={summary} period={data.budget.period} variant="full" />
            </div>
          ) : null}

          <Section id="budget-settings" title={data.budget ? "Budget" : "Budget festlegen"}>
            <BudgetForm budget={data.budget} onSaved={() => void refresh()} />
          </Section>

          <Section
            id="budget-log"
            title={`Tankbuch · ${periodLabel(period, periodBounds(period, now))}`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog({ open: true, entry: null })}
              >
                <Plus />
                Eintrag
              </Button>
            }
          >
            {currentLogs.length === 0 ? (
              <Notice
                title="Noch keine Tankvorgänge"
                description="Tippe nach dem Tanken auf „Getankt“ an der Tankstelle oder füge hier einen Eintrag hinzu."
              />
            ) : (
              <ul className="divide-y overflow-hidden rounded-md border bg-surface">
                {currentLogs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    onEdit={(entry) => setDialog({ open: true, entry })}
                    onDeleted={() => void refresh()}
                  />
                ))}
              </ul>
            )}
          </Section>

          {previous.some((p) => p.entries > 0) && (
            <Section id="budget-history" title="Frühere Zeiträume">
              <ul className="divide-y overflow-hidden rounded-md border bg-surface">
                {previous.map((p) => (
                  <li key={p.bounds.start} className="flex min-h-12 items-center gap-3 px-4 py-2">
                    <span className="text-body min-w-0 flex-1 truncate text-foreground">
                      {periodLabel(period, p.bounds)}
                    </span>
                    <span className="text-caption num text-ink-2">{formatLiters(p.liters)}</span>
                    <span className="num text-body w-24 text-right font-semibold text-foreground">
                      {formatEuro(p.spent)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section id="budget-vehicle" title="Fahrzeug">
            <div className="rounded-md border bg-surface p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-ink-2">
                <Car aria-hidden className="size-4" />
                <span className="text-caption">
                  {data.vehicle.name ? `${data.vehicle.name} · ` : ""}
                  {FUEL_LABELS[data.vehicle.fuelType]} · {formatDecimal(data.vehicle.consumption)}{" "}
                  L/100 km
                </span>
              </div>
              <VehicleForm
                initial={data.vehicle}
                submitLabel="Fahrzeug speichern"
                onSaved={() => void refresh()}
              />
            </div>
          </Section>

          <FillUpDialog
            open={dialog.open}
            onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
            station={null}
            entry={dialog.entry}
            defaultFuel={data.vehicle.fuelType}
            onSaved={() => void refresh()}
          />
        </>
      )}
    </main>
  );
}
