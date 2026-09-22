/** Preisverlauf einer Station als Liniendiagramm (7/14/30 Tage) im Dialog. */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const dayFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function PriceTrendChart({ station, fuel, onOpenChange }: Props) {
  const [days, setDays] = useState<HistoryRange>(7);
  const fetchHistory = useServerFn(getPriceHistory);

  const query = useQuery({
    queryKey: ["price-history", station?.id, fuel, days],
    enabled: station !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchHistory({ data: { stationId: station!.id, fuelType: fuel, days } }),
  });

  const points = query.data?.points ?? [];
  const avg = query.data?.avg ?? null;

  return (
    <Dialog open={station !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl overflow-hidden sm:w-full">
        <DialogHeader>
          <DialogTitle>{station?.name ?? "Preisverlauf"}</DialogTitle>
          <DialogDescription>
            Preisverlauf für {FUEL_LABELS[fuel]} · Datenerhebung alle 20 Minuten
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={String(days)}
          onValueChange={(value) => setDays(Number(value) as HistoryRange)}
        >
          <TabsList className="h-11 w-full rounded-full bg-parchment p-1 sm:w-auto">
            {HISTORY_RANGES.map((range) => (
              <TabsTrigger
                key={range}
                value={String(range)}
                className="text-caption flex-1 rounded-full px-3 sm:flex-none sm:px-4"
              >
                {range} Tage
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="h-56 w-full sm:h-72">
          {query.isLoading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : points.length < 2 ? (
            <div className="text-caption flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-parchment px-6 text-center text-muted-foreground">
              <span>Noch nicht genug Daten für diese Station.</span>
              <span className="text-fine">
                Der Verlauf entsteht laufend – schau in ein paar Tagen wieder vorbei.
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border"
                />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value: number) => dayFormat.format(new Date(value))}
                  tick={{ fontSize: 11 }}
                  minTickGap={40}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={["dataMin - 0.02", "dataMax + 0.02"]}
                  tickFormatter={(value: number) => value.toFixed(2)}
                  tick={{ fontSize: 11 }}
                  width={48}
                />
                <ChartTooltip
                  labelFormatter={(value) => timeFormat.format(new Date(Number(value)))}
                  formatter={(value) => [formatPrice(Number(value)), FUEL_LABELS[fuel]]}
                />
                {avg !== null && (
                  <ReferenceLine
                    y={avg}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-muted-foreground"
                    label={{
                      value: `Ø ${avg.toFixed(3)}`,
                      fontSize: 11,
                      position: "insideTopRight",
                    }}
                  />
                )}
                <Line
                  type="stepAfter"
                  dataKey="price"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <p className="text-fine text-muted-foreground">
          Quelle: Tankerkönig (CC BY 4.0) · eigene Messreihe, Angaben ohne Gewähr.
        </p>
      </DialogContent>
    </Dialog>
  );
}
