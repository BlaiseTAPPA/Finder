/** Lade-, Leer- und Fehlerzustände. */
import { AlertTriangle, KeyRound, MapPin, MapPinOff, SearchX, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GeoPermission } from "@/lib/geolocation";
import type { ApiErrorShape } from "@/types/station";

export function StationSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="gap-0 bg-surface p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-3 w-14" />
              <Skeleton className="mt-2 h-7 w-28" />
            </div>
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="mt-4 h-4 w-3/5" />
          <Skeleton className="mt-1.5 h-3.5 w-4/5" />
          <Skeleton className="mt-3 h-3.5 w-2/5" />
          <div className="mt-4 border-t pt-3">
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Einheitlicher Hinweisblock für Start-, Leer- und Fehlerzustände: kompakt, linksbündig. */
export function Notice({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-md border bg-surface p-4 sm:p-5">
      {icon && <div className="mt-px shrink-0 text-ink-3 [&_svg]:size-5">{icon}</div>}
      <div className="min-w-0">
        <h3 className="text-body font-semibold text-foreground">{title}</h3>
        <p className="text-caption mt-1 max-w-prose text-ink-2">{description}</p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ radius }: { radius: number }) {
  return (
    <Notice
      icon={<SearchX />}
      title="Keine Tankstellen gefunden"
      description={`Im Umkreis von ${radius} km wurden keine Stationen gemeldet. Erhöhe den Radius oder suche einen anderen Ort.`}
    />
  );
}

/**
 * Startzustand ohne Suche (Feature 0006). Erklärt den Vorteil der Standortfreigabe; der
 * Standort-Button steht oben in der Suche, hier nicht noch einmal.
 */
export function StartState({ permission = "unknown" }: { permission?: GeoPermission }) {
  return (
    <Notice
      icon={permission === "denied" ? <MapPinOff /> : <MapPin />}
      title="Wo möchtest du tanken?"
      description={
        permission === "denied"
          ? "Die Standortfreigabe ist in deinem Browser blockiert. Suche oben nach Ort oder Postleitzahl – oder erlaube den Standort in den Browser-Einstellungen."
          : "Nutze oben deinen Standort – dann öffnet die App künftig direkt mit den Preisen in deiner Nähe. Oder suche nach Ort oder Postleitzahl."
      }
    />
  );
}

export function ErrorState({ error }: { error: ApiErrorShape }) {
  if (error.kind === "quota") {
    return <Notice icon={<Timer />} title="Anfragelimit erreicht" description={error.message} />;
  }
  if (error.kind === "missing-key") {
    return (
      <Notice
        icon={<KeyRound />}
        title="API-Schlüssel fehlt"
        description="Für die Live-Preise wird ein Tankerkönig-API-Schlüssel benötigt. Bitte TANKERKOENIG_API_KEY hinterlegen."
      />
    );
  }
  return (
    <Notice icon={<AlertTriangle />} title="Daten nicht verfügbar" description={error.message} />
  );
}
