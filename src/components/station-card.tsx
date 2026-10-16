/** Karte einer einzelnen Tankstelle mit Preisen, Status und Aktionen. */
import { Flag, Fuel, LineChart, MoreHorizontal, Navigation, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PriceFigure } from "@/components/price-figure";
import { directionsUrl, formatDistance } from "@/lib/format";
import { TrendHint } from "@/components/trend-badge";
import { DetourBadge } from "@/components/detour-badge";
import { CommunityTrustBadge } from "@/components/community-trust-badge";
import { ConfirmPriceButton } from "@/components/confirm-price-button";
import type { TrendSummary } from "@/lib/trend.functions";
import type { CommunityStatus } from "@/lib/community";
import {
  FUEL_LABELS,
  FUEL_TYPES,
  formatAddress,
  formatShortAddress,
  type Coords,
  type FuelType,
  type Station,
} from "@/types/station";

/** Umweg-Information der Trajet-Ansicht (in der Umkreissuche nicht gesetzt). */
export interface CardDetour {
  detourKm: number;
  detourMin: number;
  score: number;
}

/** Community-Ebene: rein ergänzend zum offiziellen Tankerkönig-Preis. */
export interface CardCommunity {
  status: CommunityStatus | undefined;
  contributorId: string | null;
  userCoords: Coords | null;
  onReport: (station: Station) => void;
  onChanged?: (() => void) | undefined;
}

interface Props {
  station: Station;
  fuel: FuelType;
  cheapest?: boolean;
  active?: boolean;
  isFavorite: boolean;
  onToggleFavorite: (station: Station) => void;
  onHover?: ((id: string | null) => void) | undefined;
  onSelect?: ((id: string) => void) | undefined;
  onShowRoute?: ((station: Station) => void) | undefined;
  trend?: TrendSummary | undefined;
  onOpenTrend?: ((station: Station) => void) | undefined;
  detour?: CardDetour | undefined;
  community?: CardCommunity | undefined;
  /** Beschriftung der Entfernung ("Entfernung" bzw. "Abstand zur Route"). */
  distanceLabel?: string | undefined;
  /** "Getankt" erfassen (Tankbudget); nur für angemeldete Nutzer gesetzt. */
  onFillUp?: ((station: Station) => void) | undefined;
  /** Beste Wahl für das Budget (Feature 0003); Details stehen in der Karte über der Liste. */
  best?: boolean | undefined;
}

export function StationCard({
  station,
  fuel,
  cheapest = false,
  active = false,
  isFavorite,
  onToggleFavorite,
  onHover,
  onSelect,
  onShowRoute,
  trend,
  onOpenTrend,
  detour,
  community,
  distanceLabel,
  onFillUp,
  best = false,
}: Props) {
  const price = station.prices[fuel];
  const others = FUEL_TYPES.filter((type) => type !== fuel);
  const ghostAction = "min-w-11 px-3 text-ink-2";

  return (
    <Card
      id={`station-${station.id}`}
      onMouseEnter={() => onHover?.(station.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onSelect?.(station.id)}
      className={cn(
        "cursor-pointer scroll-mt-24 gap-0 bg-surface p-4 transition-colors sm:p-5",
        "hover:border-border-strong",
        active && "border-border-strong bg-surface-sunken/60",
      )}
    >
      {/* Preis zuerst: ausgewählte Sorte groß, Entfernung rechts daneben */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-3">
        <div className="min-w-0">
          <p className="text-fine font-medium text-ink-2">
            {cheapest ? <span className="font-semibold text-price-low">Günstigster · </span> : null}
            {best ? <span className="font-semibold text-price-low">Beste Wahl · </span> : null}
            {FUEL_LABELS[fuel]}
          </p>
          <p
            className={cn("text-price-xl mt-1", price === null ? "text-ink-3" : "text-foreground")}
          >
            <PriceFigure value={price} />
          </p>
        </div>

        <div className="pt-0.5 text-right">
          <p className="num text-body font-semibold text-foreground">
            {formatDistance(station.dist)}
          </p>
          {distanceLabel && <p className="text-fine text-ink-3">{distanceLabel}</p>}
        </div>

        <button
          type="button"
          aria-label={isFavorite ? "Favorit entfernen" : "Als Favorit merken"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(station);
          }}
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-sunken hover:text-favorite"
        >
          <Star className={cn("size-5", isFavorite && "fill-favorite text-favorite")} />
        </button>
      </div>

      {/* Station */}
      <h3 title={station.name} className="text-body mt-3 truncate font-semibold text-foreground">
        {station.name}
      </h3>
      <p
        title={`${station.brand} · ${formatAddress(station)}`}
        className="text-caption truncate text-ink-2"
      >
        {formatShortAddress(station)}
      </p>

      {/* Übrige Sorten, kompakt in einer Zeile */}
      <dl className="text-caption mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {others.map((type) => (
          <div key={type} className="flex items-baseline gap-1.5">
            <dt className="text-ink-3">{FUEL_LABELS[type]}</dt>
            <dd
              className={cn(
                "text-price-sm",
                station.prices[type] === null ? "text-ink-3" : "text-ink-2",
              )}
            >
              <PriceFigure value={station.prices[type]} />
            </dd>
          </div>
        ))}
      </dl>

      {/* Signale: nur Ausnahmen und Kontext */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 empty:hidden">
        {!station.isOpen && <Badge variant="negative">Geschlossen</Badge>}
        <CommunityTrustBadge status={community?.status} />
      </div>

      {detour && (
        <DetourBadge
          detourKm={detour.detourKm}
          detourMin={detour.detourMin}
          savings={Number.isFinite(detour.score) ? detour.score : undefined}
        />
      )}

      <TrendHint trend={trend} />

      {/* Aktionen: Route ist die Hauptaktion, der Rest kompakt */}
      <div className="@container mt-3 border-t border-border pt-3">
        <div className="flex items-center gap-1">
          <Button
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
              window.open(directionsUrl(station), "_blank", "noopener,noreferrer");
            }}
          >
            <Navigation className="size-4" />
            Route
          </Button>
          {onFillUp && (
            <Button
              variant="ghost"
              className={ghostAction}
              onClick={(event) => {
                event.stopPropagation();
                onFillUp(station);
              }}
            >
              <Fuel className="size-4" />
              <span className="@max-lg:sr-only">Getankt</span>
            </Button>
          )}
          {onOpenTrend && (
            <Button
              variant="ghost"
              className={ghostAction}
              onClick={(event) => {
                event.stopPropagation();
                onOpenTrend(station);
              }}
            >
              <LineChart className="size-4" />
              <span className="@max-lg:sr-only">Verlauf</span>
            </Button>
          )}
          {community && (
            <>
              <ConfirmPriceButton
                station={station}
                fuel={fuel}
                contributorId={community.contributorId}
                userCoords={community.userCoords}
                onDone={community.onChanged}
              />
              {/* Seltene Aktionen hinter "…"; Klicks im Portal nicht zur Karte durchreichen. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Weitere Aktionen"
                    className="shrink-0 rounded-md text-ink-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                  <DropdownMenuItem onSelect={() => community.onReport(station)}>
                    <Flag />
                    Preis melden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
