/**
 * Ergebnis-Layout: mobil schwebender Umschalter Liste/Karte, ab md gestapelt,
 * ab lg zweispaltig mit klebender Karte.
 * Beide Ansichten bleiben montiert, damit Leaflet nicht neu initialisiert wird.
 */
import { useEffect, useState, type ReactNode } from "react";
import { List, Map as MapIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Props {
  list: ReactNode;
  map: ReactNode;
  className?: string | undefined;
}

const TOGGLE =
  "rounded-full px-5 data-[state=active]:bg-on-chrome data-[state=active]:text-chrome data-[state=active]:shadow-none";

export function ResultsLayout({ list, map, className }: Props) {
  const [view, setView] = useState<"list" | "map">("list");

  // Leaflet berechnet seine Größe nur bei sichtbarem Container neu.
  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => clearTimeout(timer);
  }, [view]);

  return (
    <div
      className={cn(
        "grid w-full min-w-0 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
        className,
      )}
    >
      <div className={cn("order-2 min-w-0 lg:order-1", view === "map" && "hidden md:block")}>
        {list}
      </div>

      <div
        className={cn(
          "order-1 min-w-0 lg:sticky lg:top-16 lg:order-2 lg:h-[calc(100vh-6rem)]",
          view === "list" && "hidden md:block",
        )}
      >
        <div className="isolate h-[60vh] w-full overflow-hidden rounded-md border md:h-[55vh] lg:h-full">
          {map}
        </div>
      </div>

      {/* Mobil: schwebender Umschalter, klebt am unteren Rand solange die Ergebnisse sichtbar sind */}
      <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 order-3 justify-self-center md:hidden">
        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "map")}>
          <TabsList className="h-12 rounded-full bg-chrome p-1 text-on-chrome/70 shadow-float">
            <TabsTrigger value="list" className={TOGGLE}>
              <List />
              Liste
            </TabsTrigger>
            <TabsTrigger value="map" className={TOGGLE}>
              <MapIcon />
              Karte
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
