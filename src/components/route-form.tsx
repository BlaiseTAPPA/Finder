/** Eingabe eines Trajets: Start, Ziel, Korridorbreite. */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@/lib/server-fn-client";
import { ArrowRight, Crosshair, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { suggestPlaces, type PlaceSuggestion } from "@/lib/route.functions";
import type { Coords } from "@/types/station";

export interface TripPoint extends Coords {
  label: string;
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onPick: (point: TripPoint) => void;
  trailing?: React.ReactNode;
}

function PlaceField({ id, label, value, placeholder, onChange, onPick, trailing }: FieldProps) {
  const call = useServerFn(suggestPlaces);
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const dirty = useRef(false);

  // Vorschläge mit 300 ms Debounce laden.
  useEffect(() => {
    if (!dirty.current || value.trim().length < 3) {
      setItems([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await call({ data: { query: value.trim() } });
        setItems(result);
        setOpen(result.length > 0);
      } catch {
        setItems([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, call]);

  return (
    <div className="relative">
      <Label htmlFor={id} className="text-caption text-muted-foreground">
        {label}
      </Label>
      <div className="mt-2 flex gap-2">
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 rounded-full bg-background"
          onChange={(event) => {
            dirty.current = true;
            onChange(event.target.value);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => setOpen(items.length > 0)}
        />
        {trailing}
      </div>

      {open && items.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto overscroll-contain rounded-lg border border-hairline bg-background shadow-tile">
          {items.map((item) => (
            <li key={`${item.lat},${item.lng},${item.label}`}>
              <button
                type="button"
                className="text-caption min-h-11 w-full px-4 py-2.5 text-left text-ink hover:bg-parchment"
                onMouseDown={(event) => {
                  event.preventDefault();
                  dirty.current = false;
                  onPick({ lat: item.lat, lng: item.lng, label: item.label });
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Props {
  origin: TripPoint | null;
  destination: TripPoint | null;
  originText: string;
  destinationText: string;
  corridorKm: number;
  searching: boolean;
  locating: boolean;
  onOriginText: (value: string) => void;
  onDestinationText: (value: string) => void;
  onOriginPick: (point: TripPoint) => void;
  onDestinationPick: (point: TripPoint) => void;
  onCorridor: (value: number) => void;
  onLocate: () => void;
  onSubmit: () => void;
}

export function RouteForm({
  origin,
  destination,
  originText,
  destinationText,
  corridorKm,
  searching,
  locating,
  onOriginText,
  onDestinationText,
  onOriginPick,
  onDestinationPick,
  onCorridor,
  onLocate,
  onSubmit,
}: Props) {
  return (
    <form
      className="grid gap-5 rounded-lg border border-hairline bg-pearl p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PlaceField
          id="trip-origin"
          label="Start"
          value={originText}
          placeholder="Adresse, Ort oder PLZ"
          onChange={onOriginText}
          onPick={onOriginPick}
          trailing={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Aktuellen Standort als Start verwenden"
              className="size-11 shrink-0 rounded-full"
              onClick={onLocate}
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Crosshair className="size-4" />
              )}
            </Button>
          }
        />
        <PlaceField
          id="trip-destination"
          label="Ziel"
          value={destinationText}
          placeholder="Adresse, Ort oder PLZ"
          onChange={onDestinationText}
          onPick={onDestinationPick}
        />
      </div>

      <div className="grid items-end gap-5 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="corridor" className="text-caption text-muted-foreground">
              Korridorbreite
            </Label>
            <span className="num text-caption font-semibold text-ink">
              ± {corridorKm.toFixed(1).replace(".", ",")} km
            </span>
          </div>
          <Slider
            id="corridor"
            min={0.5}
            max={10}
            step={0.5}
            value={[corridorKm]}
            onValueChange={(v) => onCorridor(v[0] ?? corridorKm)}
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-full px-6 sm:h-11 sm:w-auto"
          disabled={searching || !origin || !destination}
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Trajet suchen
        </Button>
      </div>

      {origin && destination && (
        <p className="text-fine flex items-center gap-2 text-muted-foreground">
          <span className="truncate">{origin.label}</span>
          <ArrowRight className="size-3 shrink-0" />
          <span className="truncate">{destination.label}</span>
        </p>
      )}
    </form>
  );
}
