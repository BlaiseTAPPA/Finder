/**
 * Startübersicht ohne aktive Suche: Favoriten mit aktuellen Preisen (günstigste zuerst)
 * und gespeicherte Strecken als Schnellzugriff. Rein darstellend – Daten kommen von HomePage.
 */
import { ChevronRight, Route as RouteIcon } from "lucide-react";
import { PriceFigure } from "@/components/price-figure";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FUEL_LABELS, type FuelType, type SavedTrip, type Station } from "@/types/station";

/** Höchstens so viele Favoriten direkt zeigen; der Rest liegt im Favoriten-Tab. */
const MAX_FAVORITES = 5;

/** Stand der Favoritenpreise: frisch geladen, wird geladen oder nur gespeichert. */
export type FavoritePriceState =
  { kind: "fresh"; fetchedAt: number } | { kind: "loading" } | { kind: "stale" };

interface Props {
  favorites: Station[];
  fuel: FuelType;
  priceState: FavoritePriceState;
  trips: SavedTrip[];
  onSelectFavorite: (station: Station) => void;
  onShowAllFavorites: () => void;
  onSelectTrip: (trip: SavedTrip) => void;
}

function byPrice(fuel: FuelType) {
  return (a: Station, b: Station) => {
    const pa = a.isOpen ? a.prices[fuel] : null;
    const pb = b.isOpen ? b.prices[fuel] : null;
    if (pa === null && pb === null) return a.name.localeCompare(b.name, "de");
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
  };
}

function priceNote(state: FavoritePriceState): string {
  if (state.kind === "fresh") return `Aktualisiert ${formatRelativeTime(state.fetchedAt)}`;
  if (state.kind === "loading") return "Preise werden aktualisiert …";
  return "Zuletzt gespeicherte Preise";
}

export function StartOverview({
  favorites,
  fuel,
  priceState,
  trips,
  onSelectFavorite,
  onShowAllFavorites,
  onSelectTrip,
}: Props) {
  if (favorites.length === 0 && trips.length === 0) return null;

  const sorted = [...favorites].sort(byPrice(fuel));
  const shown = sorted.slice(0, MAX_FAVORITES);
  const cheapestId = shown[0]?.isOpen && shown[0].prices[fuel] !== null ? shown[0].id : null;

  return (
    <div className="mt-6 space-y-6">
      {favorites.length > 0 && (
        <section aria-labelledby="start-favorites">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="start-favorites" className="text-body font-semibold text-foreground">
              Deine Favoriten
            </h2>
            <span className="text-fine text-ink-3">
              {FUEL_LABELS[fuel]} · {priceNote(priceState)}
            </span>
          </div>

          <ul className="divide-y overflow-hidden rounded-md border bg-surface">
            {shown.map((station) => {
              const price = station.isOpen ? station.prices[fuel] : null;
              return (
                <li key={station.id}>
                  <button
                    type="button"
                    onClick={() => onSelectFavorite(station)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunken"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-body block truncate font-semibold text-foreground">
                        {station.name}
                      </span>
                      <span className="text-caption block truncate text-ink-2">
                        {station.brand} · {station.place}
                      </span>
                    </span>
                    {station.isOpen ? (
                      <PriceFigure
                        value={price}
                        className={cn(
                          "text-lg",
                          station.id === cheapestId ? "text-price-low" : "text-foreground",
                          price === null && "text-ink-3",
                        )}
                      />
                    ) : (
                      <span className="text-caption text-ink-3">Geschlossen</span>
                    )}
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />
                  </button>
                </li>
              );
            })}
          </ul>

          {favorites.length > MAX_FAVORITES && (
            <button
              type="button"
              onClick={onShowAllFavorites}
              className="text-caption mt-1 inline-flex min-h-11 items-center font-medium text-primary"
            >
              Alle {favorites.length} Favoriten anzeigen
            </button>
          )}
        </section>
      )}

      {trips.length > 0 && (
        <section aria-labelledby="start-trips">
          <h2 id="start-trips" className="text-body mb-2 font-semibold text-foreground">
            Deine Strecken
          </h2>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {trips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                onClick={() => onSelectTrip(trip)}
                className="text-caption inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-surface px-4 font-medium text-foreground transition-colors hover:bg-surface-sunken"
              >
                <RouteIcon aria-hidden className="size-4 text-ink-3" />
                {trip.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
