/** Fahrzeugprofil (Feature 0002): Onboarding nach der Anmeldung und Bearbeitung auf /budget. */
import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FuelTypeFilter } from "@/components/fuel-type-filter";
import { saveVehicle } from "@/lib/account.functions";
import type { VehicleProfile } from "@/lib/account-input";
import type { FuelType } from "@/types/station";
import { formatDecimal, parseDecimal } from "@/lib/format";

/** Vorbelegung, damit das Speichern ein Tipp ist. */
const DEFAULT_VEHICLE: VehicleProfile = {
  name: null,
  fuelType: "e10",
  consumption: 7,
  tankCapacity: 50,
};

interface Props {
  initial: VehicleProfile | null;
  submitLabel: string;
  onSaved: (vehicle: VehicleProfile) => void;
  /** Zusätzliche Aktion neben dem Speichern, z. B. "Später". */
  secondary?: ReactNode;
}

export function VehicleForm({ initial, submitLabel, onSaved, secondary }: Props) {
  const start = initial ?? DEFAULT_VEHICLE;
  const [name, setName] = useState(start.name ?? "");
  const [fuelType, setFuelType] = useState<FuelType>(start.fuelType);
  const [consumption, setConsumption] = useState(formatDecimal(start.consumption));
  const [tank, setTank] = useState(formatDecimal(start.tankCapacity));
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState(false);

  const consumptionValue = parseDecimal(consumption);
  const tankValue = parseDecimal(tank);
  const consumptionError =
    consumptionValue === null || consumptionValue < 2 || consumptionValue > 30
      ? "Bitte einen Wert zwischen 2 und 30 L/100 km eingeben."
      : null;
  const tankError =
    tankValue === null || tankValue < 10 || tankValue > 150
      ? "Bitte einen Wert zwischen 10 und 150 L eingeben."
      : null;

  async function submit() {
    setTouched(true);
    if (consumptionError || tankError) return;
    setPending(true);
    try {
      const saved = await saveVehicle({
        data: {
          name: name.trim() || null,
          fuelType,
          consumption: consumptionValue!,
          tankCapacity: tankValue!,
        },
      });
      toast.success("Fahrzeug gespeichert");
      onSaved(saved);
    } catch {
      toast.error("Fahrzeug konnte nicht gespeichert werden. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="vehicle-name" className="text-caption text-ink-2">
          Name (optional)
        </Label>
        <Input
          id="vehicle-name"
          value={name}
          maxLength={40}
          placeholder="z. B. Golf"
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <span id="vehicle-fuel-label" className="text-caption text-ink-2">
          Kraftstoff
        </span>
        <div role="group" aria-labelledby="vehicle-fuel-label">
          <FuelTypeFilter value={fuelType} onChange={setFuelType} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="vehicle-consumption" className="text-caption text-ink-2">
            Verbrauch (L/100 km)
          </Label>
          <Input
            id="vehicle-consumption"
            inputMode="decimal"
            value={consumption}
            aria-invalid={touched && consumptionError !== null}
            aria-describedby={touched && consumptionError ? "vehicle-consumption-error" : undefined}
            onChange={(event) => setConsumption(event.target.value)}
          />
          {touched && consumptionError && (
            <p id="vehicle-consumption-error" className="text-fine text-destructive">
              {consumptionError}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="vehicle-tank" className="text-caption text-ink-2">
            Tankgröße (L)
          </Label>
          <Input
            id="vehicle-tank"
            inputMode="decimal"
            value={tank}
            aria-invalid={touched && tankError !== null}
            aria-describedby={touched && tankError ? "vehicle-tank-error" : undefined}
            onChange={(event) => setTank(event.target.value)}
          />
          {touched && tankError && (
            <p id="vehicle-tank-error" className="text-fine text-destructive">
              {tankError}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {secondary}
        <Button type="submit" disabled={pending} className="sm:min-w-40">
          {pending && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
