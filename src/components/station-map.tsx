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
import { directionsUrl, formatDistance, formatPrice } from "@/lib/format";
import { FUEL_LABELS, type Coords, type FuelType, type Station } from "@/types/station";

/** Grün (günstig) bis Rot (teuer) für die Trajet-Ansicht. */
function priceColor(rank: number): string {
  const hue = 130 - Math.max(0, Math.min(1, rank)) * 130;
  return `hsl(${hue} 62% 42%)`;
}

/** Schlichter Pin im Design-System-Blau; hervorgehoben = größer + gefüllt. */
function pin(highlighted: boolean, cheapest: boolean, color?: string) {
  const size = highlighted ? 34 : 26;
  const stroke = color ?? "#0066cc";
  const fill = cheapest || highlighted ? stroke : "#ffffff";
  const dot = cheapest || highlighted ? "#ffffff" : stroke;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${fill};border:2px solid ${stroke};box-shadow:0 2px 10px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center"><span style="width:${size / 4}px;height:${size / 4}px;border-radius:9999px;background:${dot}"></span></div>`,
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
    map.fitBounds(
      L.latLngBounds(line.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [28, 28] },
    );
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
              color: "#0066cc",
              opacity: 0.12,
              weight: Math.min(60, Math.max(12, (corridorKm ?? 2) * 9)),
              lineCap: "round",
            }}
          />
          <Polyline
            positions={line}
            pathOptions={{ color: "#0066cc", opacity: 0.9, weight: 4 }}
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
            priceRank ? priceColor(priceRank.get(station.id) ?? 0.5) : undefined,
          )}
          eventHandlers={{
            click: () => onSelect?.(station.id),
            mouseover: () => onHover?.(station.id),
            mouseout: () => onHover?.(null),
          }}
        >
          <Popup maxWidth={260} minWidth={180} autoPanPadding={[16, 16]}>
            <div style={{ maxWidth: 240 }}>
              <strong style={{ fontSize: 14 }}>{station.name}</strong>
              <div style={{ fontSize: 12, color: "#7a7a7a", marginTop: 2 }}>
                {station.brand} · {formatDistance(station.dist)} ·{" "}
                {station.isOpen ? "geöffnet" : "geschlossen"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>
                {FUEL_LABELS[fuel]}: {formatPrice(station.prices[fuel])}
              </div>
              <Button
                type="button"
                variant="link"
                className="mt-2 h-auto p-0 text-[13px]"
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
