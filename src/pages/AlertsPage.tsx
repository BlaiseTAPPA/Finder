import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link
        to="/"
        className="text-fine inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Preisalarme</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Wir markieren einen Alarm, sobald der zuletzt erfasste Preis unter deiner Schwelle liegt.
      </p>

      <section className="mt-6 rounded-2xl border p-4">
        <h2 className="text-sm font-semibold">Neuer Alarm</h2>
        {favorites.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Speichere zuerst eine Station als Favorit.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label className="text-fine">Station</Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger className="mt-1">
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
              <Label className="text-fine">Kraftstoff</Label>
              <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
                <SelectTrigger className="mt-1">
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
              <Label className="text-fine" htmlFor="threshold">
                Schwelle (€)
              </Label>
              <Input
                id="threshold"
                inputMode="decimal"
                className="mt-1"
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
          <p className="text-sm text-muted-foreground">Wird geladen …</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Alarme.</p>
        ) : (
          alerts.map((alert) => {
            const hit = alert.currentPrice !== null && alert.currentPrice <= alert.threshold;
            return (
              <div key={alert.id} className="flex items-center gap-3 rounded-2xl border p-4">
                <BellRing
                  className={
                    hit && alert.active ? "size-5 text-primary" : "size-5 text-muted-foreground"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{alert.stationName}</p>
                  <p className="text-fine text-muted-foreground">
                    {FUEL_LABELS[alert.fuelType]} unter{" "}
                    {alert.threshold.toFixed(3).replace(".", ",")} €
                    {alert.currentPrice !== null
                      ? ` · aktuell ${alert.currentPrice.toFixed(3).replace(".", ",")} €`
                      : " · noch kein Preis erfasst"}
                    {hit && alert.active ? " · erreicht!" : ""}
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
