/** Sortierte Ergebnisliste mit Hervorhebung der günstigsten Station. */
import { useMemo } from "react";
import { StationCard, type CardCommunity, type CardDetour } from "@/components/station-card";
import { cheapestStationId } from "@/lib/format";
import type { TrendSummary } from "@/lib/trend.functions";
import type { CommunityStatus } from "@/lib/community";
import type { FuelType, RouteSortMode, SortMode, Station } from "@/types/station";

interface Props {
  stations: Station[];
  fuel: FuelType;
  sort: SortMode | RouteSortMode;
  activeId: string | null;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (station: Station) => void;
  onHover?: ((id: string | null) => void) | undefined;
  onSelect?: ((id: string) => void) | undefined;
  onShowRoute?: ((station: Station) => void) | undefined;
  highlightCheapest?: boolean;
  trends?: Map<string, TrendSummary> | undefined;
  onOpenTrend?: ((station: Station) => void) | undefined;
  /** Umweg-Daten der Trajet-Ansicht (Station-ID -> Umweg). */
  detours?: Map<string, CardDetour> | undefined;
  /** Community-Ebene (Badge + Aktionen), ergänzt den Tankerkönig-Preis. */
  community?: Omit<CardCommunity, "status"> | undefined;
  communityStatuses?: Map<string, CommunityStatus> | undefined;
  distanceLabel?: string | undefined;
  /** "stack" = eine Spalte (Kartenkontext), "grid" = mehrspaltig ab md. */
  layout?: "stack" | "grid" | undefined;
}

export function StationList({
  stations,
  fuel,
  sort,
  activeId,
  isFavorite,
  onToggleFavorite,
  onHover,
  onSelect,
  onShowRoute,
  highlightCheapest = true,
  trends,
  onOpenTrend,
  detours,
  community,
  communityStatuses,
  distanceLabel,
  layout = "stack",
}: Props) {
  const sorted = useMemo(() => {
    const list = [...stations];
    const priceCompare = (a: Station, b: Station) => {
      const pa = a.prices[fuel];
      const pb = b.prices[fuel];
      if (pa === null && pb === null) return a.dist - b.dist;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pa - pb;
    };

    if (sort === "distance") {
      list.sort((a, b) => a.dist - b.dist);
    } else if (sort === "detour") {
      list.sort(
        (a, b) =>
          (detours?.get(a.id)?.detourMin ?? Number.POSITIVE_INFINITY) -
          (detours?.get(b.id)?.detourMin ?? Number.POSITIVE_INFINITY),
      );
    } else if (sort === "best") {
      // Bester Kompromiss: höchste Netto-Ersparnis zuerst.
      list.sort((a, b) => {
        const sa = detours?.get(a.id)?.score ?? Number.NEGATIVE_INFINITY;
        const sb = detours?.get(b.id)?.score ?? Number.NEGATIVE_INFINITY;
        if (sa === sb) return priceCompare(a, b);
        return sb - sa;
      });
    } else {
      // Preis aufsteigend; Stationen ohne Preis für diese Sorte ans Ende.
      list.sort(priceCompare);
    }
    return list;
  }, [stations, sort, fuel, detours]);

  const cheapest = useMemo(
    () => (highlightCheapest ? cheapestStationId(stations, fuel) : null),
    [stations, fuel, highlightCheapest],
  );

  return (
    <div
      className={
        layout === "grid" ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"
      }
    >
      {sorted.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          fuel={fuel}
          cheapest={station.id === cheapest}
          active={station.id === activeId}
          isFavorite={isFavorite(station.id)}
          onToggleFavorite={onToggleFavorite}
          onHover={onHover}
          onSelect={onSelect}
          onShowRoute={onShowRoute}
          trend={trends?.get(station.id)}
          onOpenTrend={onOpenTrend}
          detour={detours?.get(station.id)}
          community={
            community ? { ...community, status: communityStatuses?.get(station.id) } : undefined
          }
          distanceLabel={distanceLabel}
        />
      ))}
    </div>
  );
}
