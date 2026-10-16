/**
 * Tankvorgang erfassen oder bearbeiten (Feature 0002).
 * Liter und Betrag sind gekoppelt: das zuletzt bearbeitete Feld bestimmt das andere.
 * Der vorgeschlagene Preis stammt von Tankerkönig; gespeichert wird, was bezahlt wurde.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addFuelLog, updateFuelLog } from "@/lib/account.functions";
import type { FuelLog } from "@/lib/account-input";
import { amountFromLiters, litersFromAmount } from "@/lib/budget";
import { formatDecimal, formatEuro, parseDecimal } from "@/lib/format";
import { FUEL_LABELS, FUEL_TYPES, type FuelType, type Station } from "@/types/station";

/** "2026-10-16T14:05" in lokaler Zeit des Geräts (Format von <input type="datetime-local">). */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function priceText(value: number | null | undefined): string {
  return typeof value === "number" ? value.toFixed(3).replace(".", ",") : "";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Station für einen neuen Eintrag; null = manuell. */
  station: Station | null;
  /** Bestehender Eintrag zum Bearbeiten. */
  entry: FuelLog | null;
  defaultFuel: FuelType;
  onSaved: () => void;
}

export function FillUpDialog({ open, onOpenChange, station, entry, defaultFuel, onSaved }: Props) {
  const [fuelType, setFuelType] = useState<FuelType>(defaultFuel);
  const [when, setWhen] = useState("");
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  /** Welches Feld der Nutzer zuletzt bearbeitet hat; das andere wird berechnet. */
  const [driver, setDriver] = useState<"liters" | "amount">("liters");
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState(false);

  // Beim Öffnen vorbelegen: bestehender Eintrag oder Station + aktueller Preis.
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setDriver("liters");
    if (entry) {
      setFuelType(entry.fuelType);
      setWhen(toLocalInput(Date.parse(entry.filledAt)));
      setLiters(formatDecimal(entry.liters));
      setPrice(priceText(entry.pricePerLiter));
      setAmount(formatDecimal(amountFromLiters(entry.liters, entry.pricePerLiter)));
      return;
    }
    setFuelType(defaultFuel);
    setWhen(toLocalInput(Date.now()));
    setLiters("");
    setAmount("");
    setPrice(priceText(station?.prices[defaultFuel]));
  }, [open, entry, station, defaultFuel]);

  const priceValue = parseDecimal(price);
  const litersValue = parseDecimal(liters);
  const amountValue = parseDecimal(amount);

  /** Abhängiges Feld nachziehen, wenn sich Preis oder führendes Feld ändern. */
  function recompute(next: {
    liters?: string;
    amount?: string;
    price?: string;
    driver?: "liters" | "amount";
  }) {
    const d = next.driver ?? driver;
    const p = parseDecimal(next.price ?? price);
    if (p === null || p <= 0) return;
    if (d === "liters") {
      const l = parseDecimal(next.liters ?? liters);
      setAmount(l === null ? "" : formatDecimal(amountFromLiters(l, p)));
    } else {
      const a = parseDecimal(next.amount ?? amount);
      setLiters(a === null ? "" : formatDecimal(litersFromAmount(a, p)));
    }
  }

  const filledAtMs = when ? new Date(when).getTime() : NaN;
  const errors = {
    when:
      Number.isNaN(filledAtMs) || filledAtMs > Date.now() + 5 * 60_000
        ? "Bitte ein Datum eingeben, das nicht in der Zukunft liegt."
        : null,
    price:
      priceValue === null || priceValue < 0.5 || priceValue > 5
        ? "Preis zwischen 0,50 und 5,00 €/L eingeben."
        : null,
    liters:
      litersValue === null || litersValue < 0.5 || litersValue > 150
        ? "Liter oder Betrag eingeben (0,5 bis 150 L)."
        : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function submit() {
    setTouched(true);
    if (hasErrors) return;
    const data = {
      filledAt: new Date(filledAtMs).toISOString(),
      station: entry
        ? entry.station
        : station
          ? { id: station.id, name: station.name, brand: station.brand, place: station.place }
          : null,
      fuelType,
      liters: litersValue!,
      pricePerLiter: priceValue!,
    };
    setPending(true);
    try {
      if (entry) {
        const result = await updateFuelLog({ data: { id: entry.id, ...data } });
        if (!result.ok) throw new Error("not found");
        toast.success("Tankvorgang geändert");
      } else {
        await addFuelLog({ data });
        toast.success(`Getankt: ${formatEuro(amountFromLiters(data.liters, data.pricePerLiter))}`);
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Tankvorgang konnte nicht gespeichert werden. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  const stationLine = entry
    ? (entry.station?.name ?? "Ohne Station (manuell)")
    : (station?.name ?? "Ohne Station (manuell)");
  const showError = (key: keyof typeof errors) => touched && errors[key] !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Tankvorgang bearbeiten" : "Getankt"}</DialogTitle>
          <DialogDescription className="text-caption text-ink-2">{stationLine}</DialogDescription>
        </DialogHeader>

        <form
          id="fill-up-form"
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fill-fuel" className="text-caption text-ink-2">
                Kraftstoff
              </Label>
              <Select
                value={fuelType}
                onValueChange={(value) => {
                  const next = value as FuelType;
                  setFuelType(next);
                  // Neuer Eintrag an einer Station: Preis der gewählten Sorte vorschlagen.
                  if (!entry && station) {
                    const suggested = priceText(station.prices[next]);
                    setPrice(suggested);
                    recompute({ price: suggested });
                  }
                }}
              >
                <SelectTrigger id="fill-fuel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {FUEL_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fill-when" className="text-caption text-ink-2">
                Datum und Uhrzeit
              </Label>
              <Input
                id="fill-when"
                type="datetime-local"
                value={when}
                max={toLocalInput(Date.now())}
                aria-invalid={showError("when")}
                aria-describedby={showError("when") ? "fill-when-error" : undefined}
                onChange={(event) => setWhen(event.target.value)}
              />
              {showError("when") && (
                <p id="fill-when-error" className="text-fine text-destructive">
                  {errors.when}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fill-price" className="text-caption text-ink-2">
              Preis pro Liter (€)
            </Label>
            <Input
              id="fill-price"
              inputMode="decimal"
              value={price}
              placeholder="z. B. 1,749"
              aria-invalid={showError("price")}
              aria-describedby={showError("price") ? "fill-price-error" : "fill-price-hint"}
              onChange={(event) => {
                setPrice(event.target.value);
                recompute({ price: event.target.value });
              }}
            />
            {showError("price") ? (
              <p id="fill-price-error" className="text-fine text-destructive">
                {errors.price}
              </p>
            ) : (
              !entry &&
              station && (
                <p id="fill-price-hint" className="text-fine text-ink-3">
                  Vorschlag von Tankerkönig – trage ein, was du tatsächlich bezahlt hast.
                </p>
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fill-liters" className="text-caption text-ink-2">
                Liter
              </Label>
              <Input
                id="fill-liters"
                inputMode="decimal"
                value={liters}
                placeholder="z. B. 42,5"
                aria-invalid={showError("liters")}
                aria-describedby={showError("liters") ? "fill-amount-error" : undefined}
                onChange={(event) => {
                  setLiters(event.target.value);
                  setDriver("liters");
                  recompute({ liters: event.target.value, driver: "liters" });
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fill-amount" className="text-caption text-ink-2">
                Betrag (€)
              </Label>
              <Input
                id="fill-amount"
                inputMode="decimal"
                value={amount}
                placeholder="z. B. 74,30"
                onChange={(event) => {
                  setAmount(event.target.value);
                  setDriver("amount");
                  recompute({ amount: event.target.value, driver: "amount" });
                }}
              />
            </div>
            {showError("liters") && (
              <p id="fill-amount-error" className="text-fine col-span-2 -mt-2 text-destructive">
                {errors.liters}
              </p>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button type="submit" form="fill-up-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
