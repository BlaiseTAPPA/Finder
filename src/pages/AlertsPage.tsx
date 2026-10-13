import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccount, removeAlert, saveAlert, toggleAlert } from "@/lib/account.functions";
import { Notice } from "@/components/states";
import { cn } from "@/lib/utils";
import { FUEL_LABELS, FUEL_TYPES, type FuelType } from "@/types/station";

export function AlertsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: () => getAccount(),
  });
  const [stationId, setStationId] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("e10");
  const [threshold, setThreshold] = useState("1.70");

  const favorites = data?.favorites ?? [];
  const alerts = data?.alerts ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["account"] });

  async function onCreate() {
    const station = favorites.find((f) => f.id === stationId);
    const value = Number(threshold.replace(",", "."));
    if (!station || !Number.isFinite(value)) {
      toast.error("Bitte Station und Schwelle wählen.");
      return;
    }
    await saveAlert({
      data: {
        stationId: station.id,
        stationName: `${station.brand || station.name} · ${station.place}`,
        fuelType,
        threshold: value,
      },
    });
    toast.success("Alarm gespeichert.");
    void refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-safe pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <Link
        to="/"
        className="text-caption -ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-ink-2 hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück
      </Link>
      <h1 className="text-title mt-1 text-foreground">Preisalarme</h1>
      <p className="text-caption mt-1 text-ink-2">
        Wir markieren einen Alarm, sobald der zuletzt erfasste Preis unter deiner Schwelle liegt.
      </p>

      <section className="mt-6 rounded-md border bg-surface p-4 sm:p-5">
        <h2 className="text-body font-semibold text-foreground">Neuer Alarm</h2>
        {favorites.length === 0 ? (
          <p className="text-caption mt-2 text-ink-2">Speichere zuerst eine Station als Favorit.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label className="text-caption text-ink-2">Station</Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Favorit wählen" />
                </SelectTrigger>
                <SelectContent>
                  {favorites.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.brand || f.name} · {f.place}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-caption text-ink-2">Kraftstoff</Label>
              <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FUEL_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-caption text-ink-2" htmlFor="threshold">
                Schwelle (€)
              </Label>
              <Input
                id="threshold"
                inputMode="decimal"
                className="mt-1.5"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => void onCreate()}>
                Speichern
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-caption text-ink-2">Wird geladen …</p>
        ) : alerts.length === 0 ? (
          <Notice
            icon={<BellRing />}
            title="Noch keine Alarme"
            description="Lege oben einen Alarm für eine deiner Favoriten-Stationen an."
          />
        ) : (
          alerts.map((alert) => {
            const hit = alert.currentPrice !== null && alert.currentPrice <= alert.threshold;
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border bg-surface p-4",
                  !alert.active && "bg-surface-sunken",
                )}
              >
                <BellRing
                  className={cn(
                    "size-5 shrink-0",
                    hit && alert.active ? "text-price-low" : "text-ink-3",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="text-body truncate font-semibold text-foreground">
                      {alert.stationName}
                    </p>
                    {hit && alert.active && <Badge variant="positive">Erreicht</Badge>}
                  </div>
                  <p className="num text-caption text-ink-2">
                    {FUEL_LABELS[alert.fuelType]} unter{" "}
                    {alert.threshold.toFixed(3).replace(".", ",")} €
                    {alert.currentPrice !== null
                      ? ` · aktuell ${alert.currentPrice.toFixed(3).replace(".", ",")} €`
                      : " · noch kein Preis erfasst"}
                  </p>
                </div>
                <Switch
                  checked={alert.active}
                  onCheckedChange={(active) => {
                    void toggleAlert({ data: { id: alert.id, active } }).then(refresh);
                  }}
                  aria-label="Alarm aktivieren"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Alarm löschen"
                  className="shrink-0 rounded-full text-ink-3 hover:text-destructive"
                  onClick={() => {
                    void removeAlert({ data: { id: alert.id } }).then(refresh);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
