/** Gespeicherte Trajets: mit einem Klick erneut suchen. */
import { Route as RouteIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedTrip } from "@/types/station";

interface Props {
  trips: SavedTrip[];
  onSelect: (trip: SavedTrip) => void;
  onRemove: (id: string) => void;
}

export function RouteFavoritesBar({ trips, onSelect, onRemove }: Props) {
  if (trips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 overflow-x-auto">
      <span className="text-fine text-muted-foreground">Gespeicherte Trajets:</span>
      {trips.map((trip) => (
        <span
          key={trip.id}
          className="flex items-center rounded-full border border-hairline bg-background pr-1"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-caption min-h-11 rounded-full px-3 text-ink hover:bg-parchment"
            onClick={() => onSelect(trip)}
          >
            <RouteIcon className="size-3.5 text-primary" />
            {trip.name}
          </Button>
          <button
            type="button"
            aria-label={`${trip.name} entfernen`}
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(trip.id)}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
