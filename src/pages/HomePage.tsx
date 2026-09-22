/**
 * Hauptseite: Suche, Ergebnisliste, Karte und Favoriten.
 * Alle Tankerkönig-Aufrufe laufen über Server-Funktionen (API-Schlüssel bleibt serverseitig).
 */
import { ClientOnly } from "@/components/ClientOnly";
import { useServerFn } from "@/lib/server-fn-client";
import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Route as RouteIcon, Save, SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FuelTypeFilter } from "@/components/fuel-type-filter";
import { RadiusSlider } from "@/components/radius-slider";
import { SearchForm } from "@/components/search-form";
import { StationList } from "@/components/station-list";
import { PriceTrendChart } from "@/components/price-trend-chart";
import { RouteForm, type TripPoint } from "@/components/route-form";
import { RouteFavoritesBar } from "@/components/route-favorites-bar";
import type { CardDetour } from "@/components/station-card";
import { ResultsLayout } from "@/components/results-layout";
import { SiteHeader, type MainTab } from "@/components/site-header";
import { cn } from "@/lib/utils";

import { EmptyState, ErrorState, StartState, StationSkeletons } from "@/components/states";
import { useFavorites } from "@/lib/favorites";
import { useTripFavorites } from "@/lib/route-favorites";
import { useGeolocation } from "@/lib/geolocation";
import { cheapestStationId, formatRelativeTime } from "@/lib/format";
import { geocodePlace, listStations, refreshPrices } from "@/lib/stations.functions";
import { routeStations } from "@/lib/route.functions";
import { getTrendSummaries, type TrendSummary } from "@/lib/trend.functions";
import { getCommunityStatuses } from "@/lib/community.functions";
import type { CommunityStatus } from "@/lib/community";
import { useContributorId } from "@/lib/contributor";
import { ReportPriceDialog } from "@/components/report-price-dialog";
import type {
  ApiErrorShape,
  Coords,
  FuelType,
  RouteSortMode,
  SavedTrip,
  SortMode,
  Station,
} from "@/types/station";

const StationMap = lazy(() => import("@/components/station-map"));

function MapSkeleton() {
  return <Skeleton className="h-full w-full rounded-lg" />;
}

export function HomePage() {
  const [center, setCenter] = useState<Coords | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [radius, setRadius] = useState(5);
  const [committedRadius, setCommittedRadius] = useState(5);
  const [fuel, setFuel] = useState<FuelType>("e5");
  const [sort, setSort] = useState<SortMode>("price");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<ApiErrorShape | null>(null);
  const [trendStation, setTrendStation] = useState<Station | null>(null);
  const [reportStation, setReportStation] = useState<Station | null>(null);

  // ----- reine UI-Zustände (Responsive) -----
  const [tab, setTab] = useState<MainTab>("search");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ----- Trajet-Ansicht -----
  const [origin, setOrigin] = useState<TripPoint | null>(null);
  const [destination, setDestination] = useState<TripPoint | null>(null);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [corridorKm, setCorridorKm] = useState(2);
  const [routeSort, setRouteSort] = useState<RouteSortMode>("best");
  const [tripName, setTripName] = useState("");
  const [routeQueryInput, setRouteQueryInput] = useState<{
    origin: Coords;
    destination: Coords;
    corridorKm: number;
  } | null>(null);
  const [locateTarget, setLocateTarget] = useState<"search" | "origin">("search");

  const geo = useGeolocation();
  const favorites = useFavorites();
  const trips = useTripFavorites();

  const callList = useServerFn(listStations);
  const callPrices = useServerFn(refreshPrices);
  const callGeocode = useServerFn(geocodePlace);
  const callTrends = useServerFn(getTrendSummaries);
  const callCommunity = useServerFn(getCommunityStatuses);
  const contributorId = useContributorId();
  const callRouteStations = useServerFn(routeStations);

  // Position aus dem Browser übernehmen.
  useEffect(() => {
    if (!geo.coords) return;
    if (locateTarget === "origin") {
      setOrigin({ ...geo.coords, label: "Aktueller Standort" });
      setOriginText("Aktueller Standort");
      return;
    }
    setCenter(geo.coords);
    setPlaceLabel("Aktueller Standort");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords]);

  // Umkreissuche (list.php) – serverseitig 5 Minuten gecacht.
  const listQuery = useQuery({
    queryKey: ["stations", center?.lat, center?.lng, committedRadius],
    enabled: center !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      callList({
        data: { lat: center!.lat, lng: center!.lng, radius: committedRadius },
      }),
  });

  const baseStations: Station[] = useMemo(
    () => (listQuery.data?.ok ? listQuery.data.stations : []),
    [listQuery.data],
  );
  const ids = useMemo(() => baseStations.slice(0, 100).map((s) => s.id), [baseStations]);

  // Polling der Preise alle 5 Minuten (prices.php, deutlich quota-schonender).
  const pricesQuery = useQuery({
    queryKey: ["prices", ids],
    enabled: ids.length > 0,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    queryFn: () => callPrices({ data: { ids } }),
  });

  // Frische Preise auf die geladenen Stationen anwenden.
  const stations: Station[] = useMemo(() => {
    const updates = pricesQuery.data?.ok ? pricesQuery.data.updates : null;
    if (!updates) return baseStations;
    return baseStations.map((station) => {
      const update = updates[station.id];
      return update ? { ...station, ...update } : station;
    });
  }, [baseStations, pricesQuery.data]);

  // Favoritenpreise mitziehen, damit der Favoriten-Tab aktuell bleibt.
  useEffect(() => {
    if (pricesQuery.data?.ok) favorites.syncPrices(pricesQuery.data.updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricesQuery.data]);

  const lastUpdate =
    (pricesQuery.data?.ok ? pricesQuery.data.fetchedAt : null) ??
    (listQuery.data?.ok ? listQuery.data.fetchedAt : null);

  const [, forceTick] = useState(0);
  // Relative Zeitangabe minütlich auffrischen.
  useEffect(() => {
    const timer = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const error: ApiErrorShape | null =
    geoError ??
    (listQuery.data && !listQuery.data.ok ? listQuery.data.error : null) ??
    (listQuery.isError
      ? {
          kind: "network",
          message:
            listQuery.error instanceof Error
              ? listQuery.error.message
              : "Verbindung fehlgeschlagen.",
        }
      : null);

  const [searching, setSearching] = useState(false);
  const handleSearch = useCallback(
    async (query: string) => {
      setSearching(true);
      setGeoError(null);
      try {
        const result = await callGeocode({ data: { query } });
        if (result.ok) {
          setCenter({ lat: result.lat, lng: result.lng });
          setPlaceLabel(result.label);
        } else {
          setGeoError(result.error);
        }
      } catch {
        setGeoError({ kind: "network", message: "Ortssuche fehlgeschlagen." });
      } finally {
        setSearching(false);
      }
    },
    [callGeocode],
  );

  // Trend-Badges für die sichtbaren Stationen (eine Abfrage, 30 Min. frisch).
  const trendKey = useMemo(
    () => stations.slice(0, 60).map((s) => `${s.id}:${s.prices[fuel] ?? 0}`),
    [stations, fuel],
  );
  const trendsQuery = useQuery({
    queryKey: ["trends", fuel, trendKey],
    enabled: stations.length > 0,
    staleTime: 15 * 60 * 1000,
    queryFn: () =>
      callTrends({
        data: {
          fuelType: fuel,
          stations: stations.slice(0, 60).map((s) => ({ id: s.id, current: s.prices[fuel] })),
        },
      }),
  });
  const trends = useMemo(() => {
    const map = new Map<string, TrendSummary>();
    for (const item of trendsQuery.data ?? []) map.set(item.stationId, item);
    return map;
  }, [trendsQuery.data]);

  // Community-Status der sichtbaren Stationen (ergänzt den Tankerkönig-Preis).
  const communityIds = useMemo(() => stations.slice(0, 60).map((s) => s.id), [stations]);
  const communityQuery = useQuery({
    queryKey: ["community", fuel, communityIds],
    enabled: communityIds.length > 0,
    staleTime: 2 * 60 * 1000,
    queryFn: () => callCommunity({ data: { fuelType: fuel, stationIds: communityIds } }),
  });
  const communityStatuses = useMemo(() => {
    const map = new Map<string, CommunityStatus>();
    for (const item of communityQuery.data ?? []) map.set(item.stationId, item);
    return map;
  }, [communityQuery.data]);

  const communityProps = useMemo(
    () => ({
      contributorId,
      userCoords: geo.coords,
      onReport: (station: Station) => setReportStation(station),
      onChanged: () => void communityQuery.refetch(),
    }),
    [contributorId, geo.coords, communityQuery],
  );

  const cheapestId = useMemo(() => cheapestStationId(stations, fuel), [stations, fuel]);

  const showSkeleton = listQuery.isLoading && center !== null;

  // ----- Trajet: Stationen im Korridor -----
  const routeQuery = useQuery({
    queryKey: [
      "route-stations",
      routeQueryInput?.origin.lat,
      routeQueryInput?.origin.lng,
      routeQueryInput?.destination.lat,
      routeQueryInput?.destination.lng,
      routeQueryInput?.corridorKm,
      fuel,
    ],
    enabled: routeQueryInput !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      callRouteStations({
        data: {
          origin: routeQueryInput!.origin,
          destination: routeQueryInput!.destination,
          corridorKm: routeQueryInput!.corridorKm,
          fuelType: fuel,
        },
      }),
  });

  const routeResult = routeQuery.data?.ok ? routeQuery.data : null;
  const routeError: ApiErrorShape | null =
    (routeQuery.data && !routeQuery.data.ok ? routeQuery.data.error : null) ??
    (routeQuery.isError
      ? { kind: "network", message: "Route konnte nicht geladen werden." }
      : null);

  const routeStationList = useMemo(
    () => (routeResult ? routeResult.stations.map((entry) => entry.station) : []),
    [routeResult],
  );

  const detours = useMemo(() => {
    const map = new Map<string, CardDetour>();
    for (const entry of routeResult?.stations ?? []) {
      map.set(entry.station.id, {
        detourKm: entry.detourKm,
        detourMin: entry.detourMin,
        score: entry.score,
      });
    }
    return map;
  }, [routeResult]);

  // Preisrang 0 (günstig) … 1 (teuer) für die Markerfarbe.
  const priceRank = useMemo(() => {
    const map = new Map<string, number>();
    const prices = routeStationList
      .map((s) => s.prices[fuel])
      .filter((p): p is number => typeof p === "number");
    if (prices.length === 0) return map;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    for (const station of routeStationList) {
      const price = station.prices[fuel];
      map.set(station.id, typeof price === "number" && max > min ? (price - min) / (max - min) : 0);
    }
    return map;
  }, [routeStationList, fuel]);

  const routeCheapestId = useMemo(
    () => cheapestStationId(routeStationList, fuel),
    [routeStationList, fuel],
  );

  const applyTrip = useCallback((trip: SavedTrip) => {
    setOrigin({ ...trip.origin, label: trip.originLabel });
    setDestination({ ...trip.destination, label: trip.destinationLabel });
    setOriginText(trip.originLabel);
    setDestinationText(trip.destinationLabel);
    setCorridorKm(trip.corridorKm);
    setRouteQueryInput({
      origin: trip.origin,
      destination: trip.destination,
      corridorKm: trip.corridorKm,
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader tab={tab} onTab={setTab} favoritesCount={favorites.favorites.length} />

      {/* Hero + Suche */}
      <section className="bg-parchment">
        <div className="mx-auto max-w-3xl px-4 py-8 text-center sm:py-12 lg:py-16">
          <h1 className="text-hero text-ink">Günstig tanken. Ganz in der Nähe.</h1>
          <p className="text-lead mx-auto mt-3 max-w-xl text-ink-muted sm:mt-4">
            Aktuelle Preise für Super E5, E10 und Diesel aus der Tankerkönig-Datenbank.
          </p>
          <div className="mt-6 text-left sm:mt-8">
            <SearchForm
              onSearch={handleSearch}
              onLocate={() => {
                setGeoError(null);
                setLocateTarget("search");
                geo.request();
              }}
              searching={searching}
              locating={geo.status === "loading"}
            />
            {geo.error && <p className="text-fine mt-2 text-muted-foreground">{geo.error}</p>}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)}>
          <TabsList className="mb-5 h-11 w-full rounded-full bg-parchment p-1 sm:mb-6 sm:w-auto">
            <TabsTrigger
              value="search"
              className="text-caption min-h-9 flex-1 rounded-full px-3 sm:flex-none sm:px-5"
            >
              Umkreis
            </TabsTrigger>
            <TabsTrigger
              value="trip"
              className="text-caption min-h-9 flex-1 rounded-full px-3 sm:flex-none sm:px-5"
            >
              <RouteIcon className="mr-1 size-3.5" />
              Trajet
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="text-caption min-h-9 flex-1 rounded-full px-3 sm:flex-none sm:px-5"
            >
              <Star className="mr-1 size-3.5" />
              Favoriten
              {favorites.favorites.length > 0 && ` (${favorites.favorites.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            {/* Steuerung: auf Mobile einklappbar, ab md dauerhaft sichtbar */}
            <Button
              type="button"
              variant="outline"
              className="mb-3 h-11 w-full justify-between rounded-full md:hidden"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                Filter
              </span>
              <span className="text-fine text-muted-foreground">
                {committedRadius} km · {fuel.toUpperCase()}
              </span>
            </Button>
            <div
              className={cn(
                "mb-6 grid gap-5 rounded-lg border border-hairline bg-pearl p-4 sm:p-5 md:grid-cols-3",
                !filtersOpen && "hidden md:grid",
              )}
            >
              <div>
                <RadiusSlider value={radius} onChange={setRadius} onCommit={setCommittedRadius} />
              </div>
              <div>
                <p className="text-caption mb-3 text-muted-foreground">Kraftstoff</p>
                <FuelTypeFilter value={fuel} onChange={setFuel} />
              </div>
              <div>
                <p className="text-caption mb-3 text-muted-foreground">Sortierung</p>
                <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                  <SelectTrigger className="h-11 w-full rounded-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Günstigster Preis</SelectItem>
                    <SelectItem value="distance">Kürzeste Entfernung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Statuszeile */}
            {center && (
              <div className="mb-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-caption min-w-0 text-muted-foreground">
                  {placeLabel ?? "Suchgebiet"} · {stations.length} Stationen im Umkreis von{" "}
                  {committedRadius} km
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-fine text-muted-foreground">
                    Aktualisiert {formatRelativeTime(lastUpdate ?? null)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Preise aktualisieren"
                    className="size-11 shrink-0 rounded-full text-primary hover:bg-parchment hover:text-primary"
                    onClick={() => void pricesQuery.refetch()}
                    disabled={pricesQuery.isFetching || ids.length === 0}
                  >
                    <RefreshCw
                      className={pricesQuery.isFetching ? "size-4 animate-spin" : "size-4"}
                    />
                  </Button>
                </div>
              </div>
            )}

            <ResultsLayout
              list={
                <>
                  {!center && !error && (
                    <StartState>
                      <Button
                        onClick={() => {
                          setLocateTarget("search");
                          geo.request();
                        }}
                        className="h-11 rounded-full px-6"
                      >
                        Standort verwenden
                      </Button>
                    </StartState>
                  )}
                  {error && <ErrorState error={error} />}
                  {showSkeleton && <StationSkeletons />}
                  {!error && !showSkeleton && center && stations.length === 0 && (
                    <EmptyState radius={committedRadius} />
                  )}
                  {!error && !showSkeleton && stations.length > 0 && (
                    <StationList
                      stations={stations}
                      fuel={fuel}
                      sort={sort}
                      activeId={activeId}
                      isFavorite={favorites.isFavorite}
                      onToggleFavorite={favorites.toggle}
                      onHover={setActiveId}
                      onSelect={setActiveId}
                      trends={trends}
                      onOpenTrend={setTrendStation}
                      community={communityProps}
                      communityStatuses={communityStatuses}
                    />
                  )}
                </>
              }
              map={
                center ? (
                  <ClientOnly fallback={<MapSkeleton />}>
                    <Suspense fallback={<MapSkeleton />}>
                      <StationMap
                        center={center}
                        radius={committedRadius}
                        stations={stations}
                        fuel={fuel}
                        activeId={activeId}
                        cheapestId={cheapestId}
                        onHover={setActiveId}
                        onSelect={setActiveId}
                      />
                    </Suspense>
                  </ClientOnly>
                ) : (
                  <div className="text-caption flex h-full items-center justify-center bg-parchment text-muted-foreground">
                    Die Karte erscheint nach der ersten Suche.
                  </div>
                )
              }
            />
          </TabsContent>

          <TabsContent value="trip" className="mt-0">
            {trips.hydrated && (
              <RouteFavoritesBar trips={trips.trips} onSelect={applyTrip} onRemove={trips.remove} />
            )}

            <RouteForm
              origin={origin}
              destination={destination}
              originText={originText}
              destinationText={destinationText}
              corridorKm={corridorKm}
              searching={routeQuery.isFetching}
              locating={geo.status === "loading" && locateTarget === "origin"}
              onOriginText={(value) => {
                setOriginText(value);
                setOrigin(null);
              }}
              onDestinationText={(value) => {
                setDestinationText(value);
                setDestination(null);
              }}
              onOriginPick={(point) => {
                setOrigin(point);
                setOriginText(point.label);
              }}
              onDestinationPick={(point) => {
                setDestination(point);
                setDestinationText(point.label);
              }}
              onCorridor={setCorridorKm}
              onLocate={() => {
                setLocateTarget("origin");
                geo.request();
              }}
              onSubmit={() => {
                if (!origin || !destination) return;
                setRouteQueryInput({
                  origin: { lat: origin.lat, lng: origin.lng },
                  destination: { lat: destination.lat, lng: destination.lng },
                  corridorKm,
                });
              }}
            />

            {/* Trajet speichern */}
            {origin && destination && (
              <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Input
                  value={tripName}
                  onChange={(event) => setTripName(event.target.value)}
                  placeholder="Name, z. B. Zuhause → Arbeit"
                  className="h-11 rounded-full bg-background sm:w-64"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full sm:w-auto"
                  disabled={tripName.trim().length === 0}
                  onClick={() => {
                    trips.save({
                      name: tripName.trim(),
                      originLabel: origin.label,
                      destinationLabel: destination.label,
                      origin: { lat: origin.lat, lng: origin.lng },
                      destination: { lat: destination.lat, lng: destination.lng },
                      corridorKm,
                    });
                    setTripName("");
                  }}
                >
                  <Save className="size-4" />
                  Trajet speichern
                </Button>
              </div>
            )}

            {routeResult && (
              <div className="mt-6 mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-caption min-w-0 text-muted-foreground">
                  <span className="num">
                    {routeResult.route.distanceKm.toFixed(0)} km ·{" "}
                    {Math.round(routeResult.route.durationMin)} Min
                  </span>{" "}
                  · {routeResult.stations.length} Stationen im Korridor von ±
                  {corridorKm.toFixed(1).replace(".", ",")} km
                </p>
                <Select value={routeSort} onValueChange={(v) => setRouteSort(v as RouteSortMode)}>
                  <SelectTrigger className="h-11 w-full rounded-full bg-background sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Bester Kompromiss</SelectItem>
                    <SelectItem value="price">Günstigster Preis</SelectItem>
                    <SelectItem value="detour">Kleinster Umweg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <ResultsLayout
              className="mt-6"
              list={
                <>
                  {routeError && <ErrorState error={routeError} />}
                  {!routeError && routeQuery.isFetching && <StationSkeletons />}
                  {!routeError &&
                    !routeQuery.isFetching &&
                    routeResult &&
                    routeStationList.length === 0 && (
                      <div className="rounded-lg border border-hairline bg-pearl p-10 text-center">
                        <h3 className="text-[21px] font-semibold text-ink">
                          Keine Stationen im Korridor
                        </h3>
                        <p className="text-caption mt-2 text-muted-foreground">
                          Erhöhe die Korridorbreite, um mehr Tankstellen entlang der Strecke zu
                          finden.
                        </p>
                      </div>
                    )}
                  {!routeError && !routeQuery.isFetching && routeStationList.length > 0 && (
                    <StationList
                      stations={routeStationList}
                      fuel={fuel}
                      sort={routeSort}
                      activeId={activeId}
                      isFavorite={favorites.isFavorite}
                      onToggleFavorite={favorites.toggle}
                      onHover={setActiveId}
                      onSelect={setActiveId}
                      trends={trends}
                      onOpenTrend={setTrendStation}
                      community={communityProps}
                      communityStatuses={communityStatuses}
                      detours={detours}
                      distanceLabel="Abstand zur Route:"
                    />
                  )}
                  {!routeQueryInput && !routeError && (
                    <div className="rounded-lg border border-hairline bg-pearl p-10 text-center">
                      <RouteIcon className="mx-auto size-7 text-muted-foreground" />
                      <h3 className="mt-4 text-[21px] font-semibold text-ink">
                        Tanken entlang deiner Strecke
                      </h3>
                      <p className="text-caption mt-2 text-muted-foreground">
                        Gib Start und Ziel ein – wir zeigen die günstigsten Stationen im Korridor
                        samt geschätztem Umweg.
                      </p>
                    </div>
                  )}
                </>
              }
              map={
                routeResult ? (
                  <ClientOnly fallback={<MapSkeleton />}>
                    <Suspense fallback={<MapSkeleton />}>
                      <StationMap
                        center={
                          routeResult.route.polyline[0] ??
                          (origin as Coords) ?? { lat: 51.16, lng: 10.45 }
                        }
                        radius={corridorKm}
                        stations={routeStationList}
                        fuel={fuel}
                        activeId={activeId}
                        cheapestId={routeCheapestId}
                        onHover={setActiveId}
                        onSelect={setActiveId}
                        routeLine={routeResult.route.polyline}
                        corridorKm={corridorKm}
                        priceRank={priceRank}
                      />
                    </Suspense>
                  </ClientOnly>
                ) : (
                  <div className="text-caption flex h-full items-center justify-center bg-parchment text-muted-foreground">
                    Die Karte erscheint nach der Trajet-Suche.
                  </div>
                )
              }
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            {!favorites.hydrated ? (
              <StationSkeletons count={2} />
            ) : favorites.favorites.length === 0 ? (
              <div className="rounded-lg border border-hairline bg-pearl p-10 text-center">
                <Star className="mx-auto size-7 text-muted-foreground" />
                <h3 className="mt-4 text-[21px] font-semibold text-ink">Noch keine Favoriten</h3>
                <p className="text-caption mt-2 text-muted-foreground">
                  Tippe auf den Stern einer Station, um sie hier dauerhaft zu speichern.
                </p>
              </div>
            ) : (
              <StationList
                stations={favorites.favorites}
                fuel={fuel}
                sort={sort}
                activeId={null}
                isFavorite={favorites.isFavorite}
                onToggleFavorite={favorites.toggle}
                trends={trends}
                onOpenTrend={setTrendStation}
                community={communityProps}
                communityStatuses={communityStatuses}
                highlightCheapest={false}
                layout="grid"
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-hairline bg-parchment">
        <div className="text-fine mx-auto max-w-6xl px-4 py-8 text-muted-foreground">
          Preisdaten:{" "}
          <a
            href="https://creativecommons.tankerkoenig.de/"
            target="_blank"
            rel="noreferrer"
            className="text-primary"
          >
            Tankerkönig
          </a>{" "}
          (CC BY 4.0) · Kartendaten © OpenStreetMap-Mitwirkende · Angaben ohne Gewähr.
        </div>
      </footer>

      <ReportPriceDialog
        station={reportStation}
        fuel={fuel}
        contributorId={contributorId}
        userCoords={geo.coords}
        open={reportStation !== null}
        onOpenChange={(open) => {
          if (!open) setReportStation(null);
        }}
        onDone={() => void communityQuery.refetch()}
      />

      <PriceTrendChart
        station={trendStation}
        fuel={fuel}
        onOpenChange={(open) => {
          if (!open) setTrendStation(null);
        }}
      />
    </div>
  );
}
