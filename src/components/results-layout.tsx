/**
 * Ergebnis-Layout: mobil Umschalter Liste/Karte, ab md gestapelt,
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
      <div className="md:hidden">
        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "map")}>
          <TabsList className="h-11 w-full rounded-full bg-parchment p-1">
            <TabsTrigger
              value="list"
              className="text-caption min-h-9 flex-1 rounded-full data-[state=active]:bg-background"
            >
              <List className="mr-1.5 size-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="text-caption min-h-9 flex-1 rounded-full data-[state=active]:bg-background"
            >
              <MapIcon className="mr-1.5 size-4" />
              Karte
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className={cn("order-2 min-w-0 lg:order-1", view === "map" && "hidden md:block")}>
        {list}
      </div>

      <div
        className={cn(
          "order-1 min-w-0 lg:sticky lg:top-16 lg:order-2 lg:h-[calc(100vh-6rem)]",
          view === "list" && "hidden md:block",
        )}
      >
        <div className="h-[60vh] w-full overflow-hidden rounded-lg border border-hairline md:h-[55vh] lg:h-full">
          {map}
        </div>
      </div>
    </div>
  );
}
