/**
 * Interaktive Leaflet-Karte.
 * Wird nur im Browser geladen (React.lazy hinter <ClientOnly>),
 * da Leaflet beim Import auf `window` zugreift.
 */
import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { PriceFigure } from "@/components/price-figure";
import { directionsUrl, formatDistance } from "@/lib/format";
import { FUEL_LABELS, type Coords, type FuelType, type Station } from "@/types/station";

/** Dieselbe 3-stufige Preisskala wie die Badges: günstig / mittel / teuer. */
function priceColor(rank: number | undefined): string {
  if (rank === undefined) return "var(--ink-3)";
  if (rank <= 1 / 3) return "var(--price-low)";
  if (rank <= 2 / 3) return "var(--price-mid)";
  return "var(--price-high)";
}

/** Rang 0 (günstigste) … 1 (teuerste) der gewählten Sorte; Stationen ohne Preis fehlen. */
function rankByPrice(stations: Station[], fuel: FuelType): Map<string, number> {
  const priced = stations.filter((s) => s.prices[fuel] !== null);
  const values = priced.map((s) => s.prices[fuel]!);
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  return new Map(priced.map((s) => [s.id, span > 0 ? (s.prices[fuel]! - min) / span : 0]));
}

/** Pin in Preisfarbe (Design-Tokens, folgt dem Farbschema); hervorgehoben = größer + gefüllt. */
function pin(highlighted: boolean, cheapest: boolean, color: string) {
  const size = highlighted ? 34 : 26;
  const filled = cheapest || highlighted;
  const fill = filled ? color : "var(--surface)";
  const dot = filled ? "var(--surface)" : color;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${fill};border:2px solid ${color};box-shadow:var(--shadow-float);display:flex;align-items:center;justify-content:center"><span style="width:${size / 4}px;height:${size / 4}px;border-radius:9999px;background:${dot}"></span></div>`,
  });
}

/** Hält die Kartenansicht mit dem Suchmittelpunkt und dem Radius synchron. */
function ViewSync({ center, radius }: { center: Coords; radius: number }) {
  const map = useMap();
  useEffect(() => {
    const zoom = radius <= 2 ? 14 : radius <= 5 ? 13 : radius <= 12 ? 12 : 11;
    map.setView([center.lat, center.lng], zoom);
  }, [map, center.lat, center.lng, radius]);
  return null;
}

/** Zoomt auf die gesamte Route. */
function RouteSync({ line }: { line: Coords[] }) {
  const map = useMap();
  useEffect(() => {
    if (line.length < 2) return;
    map.fitBounds(L.latLngBounds(line.map((p) => [p.lat, p.lng] as [number, number])), {
      padding: [28, 28],
    });
  }, [map, line]);
  return null;
}

/** Fliegt zur aktiven Station, wenn sie in der Liste ausgewählt wurde. */
function ActiveSync({ station }: { station: Station | null }) {
  const map = useMap();
  useEffect(() => {
    if (station) map.panTo([station.lat, station.lng], { animate: true });
  }, [map, station]);
  return null;
}

interface Props {
  center: Coords;
  radius: number;
  stations: Station[];
  fuel: FuelType;
  activeId: string | null;
  cheapestId: string | null;
  onHover?: ((id: string | null) => void) | undefined;
  onSelect?: ((id: string) => void) | undefined;
  onShowRoute?: ((station: Station) => void) | undefined;
  /** Trajet-Modus: Geometrie der Route. */
  routeLine?: Coords[] | undefined;
  /** Korridorbreite in km (halbtransparentes Band um die Route). */
  corridorKm?: number | undefined;
  /** Station-ID -> Preisrang 0 (günstig) … 1 (teuer). */
  priceRank?: Map<string, number> | undefined;
}

export default function StationMap({
  center,
  radius,
  stations,
  fuel,
  activeId,
  cheapestId,
  onHover,
  onSelect,
  routeLine,
  corridorKm,
  priceRank,
}: Props) {
  const active = useMemo(
    () => stations.find((s) => s.id === activeId) ?? null,
    [stations, activeId],
  );

  // Nur im Browser ausgewertet (Komponente wird ausschließlich clientseitig geladen).
  const coarsePointer =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  // Trajet liefert den Rang mit; in der Umkreissuche wird er hier für die Pinfarbe ermittelt.
  const ranks = useMemo(
    () => priceRank ?? rankByPrice(stations, fuel),
    [priceRank, stations, fuel],
  );

  const line = useMemo(
    () => (routeLine ?? []).map((p) => [p.lat, p.lng] as [number, number]),
    [routeLine],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      // Auf Touch-Geräten kein Wheel-Zoom: sonst bleibt das Seiten-Scrollen hängen.
      scrollWheelZoom={!coarsePointer}
      zoomControl={false}
      className="h-full w-full [&_.leaflet-bottom.leaflet-right]:mb-[env(safe-area-inset-bottom)]"
      attributionControl
    >
      {/* Zoom-Buttons unten rechts, außerhalb der Daumenzone am unteren Rand. */}
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {line.length > 1 ? (
        <RouteSync line={routeLine!} />
      ) : (
        <ViewSync center={center} radius={radius} />
      )}
      <ActiveSync station={active} />

      {line.length > 1 && (
        <>
          {/* Korridor als breites, halbtransparentes Band. */}
          <Polyline
            positions={line}
            pathOptions={{
              className: "route-line",
              opacity: 0.12,
              weight: Math.min(60, Math.max(12, (corridorKm ?? 2) * 9)),
              lineCap: "round",
            }}
          />
          <Polyline
            positions={line}
            pathOptions={{ className: "route-line", opacity: 0.9, weight: 4 }}
          />
        </>
      )}

      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lng]}
          icon={pin(
            station.id === activeId,
            station.id === cheapestId,
            priceColor(ranks.get(station.id)),
          )}
          eventHandlers={{
            click: () => onSelect?.(station.id),
            mouseover: () => onHover?.(station.id),
            mouseout: () => onHover?.(null),
          }}
        >
          <Popup maxWidth={260} minWidth={180} autoPanPadding={[16, 16]}>
            <div className="max-w-60">
              <div className="text-fine text-ink-2">{FUEL_LABELS[fuel]}</div>
              <div className="price-display mt-0.5 text-xl leading-none text-foreground">
                <PriceFigure value={station.prices[fuel]} />
              </div>
              <div className="text-caption mt-2 font-semibold text-foreground">{station.name}</div>
              <div className="text-fine text-ink-2">
                {station.brand} · {formatDistance(station.dist)}
                {station.isOpen ? "" : " · geschlossen"}
              </div>
              <Button
                type="button"
                variant="link"
                className="text-caption mt-2 h-auto p-0"
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(directionsUrl(station), "_blank", "noopener,noreferrer");
                }}
              >
                Route anzeigen →
              </Button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
