/** Preisverlauf einer Station als Tagesreihe (7/15/30 Tage) im Dialog. */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PriceFigure } from "@/components/price-figure";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPriceHistory } from "@/lib/trend.functions";
import { HISTORY_RANGES, type HistoryRange } from "@/lib/trend-input";
import { formatPrice } from "@/lib/format";
import { FUEL_LABELS, type FuelType, type Station } from "@/types/station";

interface Props {
  station: Station | null;
  fuel: FuelType;
  onOpenChange: (open: boolean) => void;
}

/** Mindestens zwei Tage, damit eine Linie entsteht. */
const MIN_POINTS = 2;

// Tageswerte sind Kalendertage (YYYY-MM-DD) – in UTC parsen und formatieren,
// damit die lokale Zeitzone das Datum nicht verschiebt.
const parseDay = (date: string) => new Date(`${date}T12:00:00Z`);
const axisDay = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const tooltipDay = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const axisPrice = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PriceTrendChart({ station, fuel, onOpenChange }: Props) {
  const [rangeDays, setRangeDays] = useState<HistoryRange>(7);

  const query = useQuery({
    queryKey: ["price-history", station?.id, fuel, rangeDays],
    enabled: station !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getPriceHistory({ data: { stationId: station!.id, fuelType: fuel, rangeDays } }),
  });

  const points = query.data?.points ?? [];
  const avg = query.data?.avg ?? null;
  const chartConfig = {
    price: { label: FUEL_LABELS[fuel], color: "var(--color-primary)" },
  } satisfies ChartConfig;

  return (
    <Dialog open={station !== null} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-x-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{station?.name ?? "Preisverlauf"}</DialogTitle>
          <DialogDescription>
            Tagesdurchschnitt für {FUEL_LABELS[fuel]} · Datenerhebung alle 20 Minuten
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={String(rangeDays)}
          onValueChange={(value) => setRangeDays(Number(value) as HistoryRange)}
        >
          <TabsList className="w-full sm:w-auto">
            {HISTORY_RANGES.map((range) => (
              <TabsTrigger
                key={range}
                value={String(range)}
                className="flex-1 sm:flex-none sm:px-4"
              >
                {range} Tage
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="h-56 w-full sm:h-72" aria-busy={query.isFetching}>
          {query.isPending && station !== null ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : query.isError ? (
            <div className="text-caption flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-surface-sunken px-6 text-center text-muted-foreground">
              <span>Der Preisverlauf konnte nicht geladen werden.</span>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="text-fine min-h-11 px-3 font-medium text-primary hover:underline"
              >
                Erneut versuchen
              </button>
            </div>
          ) : points.length < MIN_POINTS ? (
            <div className="text-caption flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-surface-sunken px-6 text-center text-muted-foreground">
              <span>Nicht genügend Daten für diesen Zeitraum.</span>
              <span className="text-fine">
                Der Verlauf entsteht laufend – schau in ein paar Tagen wieder vorbei.
              </span>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => axisDay.format(parseDay(value))}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={["dataMin - 0.02", "dataMax + 0.02"]}
                  tickFormatter={(value: number) => axisPrice.format(value)}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => tooltipDay.format(parseDay(String(value)))}
                      formatter={(value) => (
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="text-muted-foreground">Ø {FUEL_LABELS[fuel]}</span>
                          <PriceFigure value={Number(value)} className="text-foreground" />
                        </div>
                      )}
                    />
                  }
                />
                {avg !== null && (
                  <ReferenceLine
                    y={avg}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-muted-foreground"
                    label={{
                      value: `Ø ${formatPrice(avg)}`,
                      fontSize: 11,
                      position: "insideTopRight",
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-price)"
                  strokeWidth={2}
                  dot={points.length <= 15}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>

        <p className="text-fine text-muted-foreground">
          Quelle: Tankerkönig (CC BY 4.0) · eigene Messreihe, Angaben ohne Gewähr.
        </p>
      </DialogContent>
    </Dialog>
  );
}
