/** Karte einer einzelnen Tankstelle mit Preisen, Status und Aktionen. */
import { Flag, LineChart, Navigation, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { directionsUrl, formatDistance, formatPrice } from "@/lib/format";
import { TrendBadge, TrendHint } from "@/components/trend-badge";
import { DetourBadge } from "@/components/detour-badge";
import { CommunityTrustBadge } from "@/components/community-trust-badge";
import { ConfirmPriceButton } from "@/components/confirm-price-button";
import type { TrendSummary } from "@/lib/trend.functions";
import type { CommunityStatus } from "@/lib/community";
import {
  FUEL_LABELS,
  FUEL_TYPES,
  formatAddress,
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

}: Props) {
  return (
    <Card
      onMouseEnter={() => onHover?.(station.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onSelect?.(station.id)}
      className={cn(
        "cursor-pointer gap-0 rounded-lg border-hairline p-4 shadow-none transition-all sm:p-5",
        "hover:border-border hover:shadow-tile",
        active && "border-primary/50 shadow-tile",
        cheapest && "border-primary/60 bg-pearl",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          {cheapest && (
            <span className="text-fine mb-1 inline-block font-semibold tracking-wide text-primary uppercase">
              Günstigster Preis
            </span>
          )}
          <h3
            title={station.name}
            className="truncate text-[16px] leading-tight font-semibold text-ink sm:text-[17px]"
          >
            {station.name}
          </h3>
          <p
            title={`${station.brand} · ${formatAddress(station)}`}
            className="text-caption mt-0.5 truncate text-muted-foreground"
          >
            {station.brand} · {formatAddress(station)}
          </p>
        </div>

        <button
          type="button"
          aria-label={isFavorite ? "Favorit entfernen" : "Als Favorit merken"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(station);
          }}
          className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-parchment hover:text-primary"
        >
          <Star className={cn("size-4", isFavorite && "fill-primary text-primary")} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-fine rounded-full border-0 px-2.5 py-1 font-medium",
            station.isOpen
              ? "bg-success/12 text-success"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {station.isOpen ? "Geöffnet" : "Geschlossen"}
        </Badge>
        <TrendBadge trend={trend} />
        <CommunityTrustBadge status={community?.status} />

        {detour && (
          <DetourBadge
            detourKm={detour.detourKm}
            detourMin={detour.detourMin}
            savings={Number.isFinite(detour.score) ? detour.score : undefined}
          />
        )}
        <span className="num text-fine text-muted-foreground">
          {distanceLabel ? `${distanceLabel} ` : ""}
          {formatDistance(station.dist)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5 border-t border-hairline pt-4 sm:gap-2">
        {FUEL_TYPES.map((type) => {
          const selected = type === fuel;
          return (
            <div
              key={type}
              className={cn(
                "min-w-0 rounded-md px-1 py-2 text-center sm:px-2",
                selected ? "bg-parchment" : "",
              )}
            >
              <p className="text-fine text-muted-foreground">{FUEL_LABELS[type]}</p>
              <p
                className={cn(
                  "price-display mt-1 text-[17px] sm:text-[19px]",
                  selected ? "text-ink" : "text-ink-muted",
                  station.prices[type] === null && "text-muted-foreground",
                )}
              >
                {formatPrice(station.prices[type])}
              </p>
            </div>
          );
        })}
      </div>

      <TrendHint trend={trend} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {onOpenTrend && (
          <Button
            variant="ghost"
            className="min-h-11 flex-1 rounded-full text-primary hover:bg-parchment hover:text-primary"
            onClick={(event) => {
              event.stopPropagation();
              onOpenTrend(station);
            }}
          >
            <LineChart className="size-4" />
            Verlauf
          </Button>
        )}
        <Button
          variant="ghost"
          className="min-h-11 flex-1 rounded-full text-primary hover:bg-parchment hover:text-primary"
          onClick={(event) => {
            event.stopPropagation();
            window.open(directionsUrl(station), "_blank", "noopener,noreferrer");
          }}
        >
          <Navigation className="size-4" />
          Route
        </Button>
        {community && (
          <>
            <ConfirmPriceButton
              station={station}
              fuel={fuel}
              contributorId={community.contributorId}
              userCoords={community.userCoords}
              onDone={community.onChanged}
            />
            <Button
              variant="ghost"
              className="min-h-11 flex-1 rounded-full text-muted-foreground hover:bg-parchment hover:text-ink"
              onClick={(event) => {
                event.stopPropagation();
                community.onReport(station);
              }}
            >
              <Flag className="size-4" />
              Melden
            </Button>
          </>
        )}
      </div>

    </Card>
  );
}
