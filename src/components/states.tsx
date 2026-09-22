/** Lade-, Leer- und Fehlerzustände. */
import { AlertTriangle, KeyRound, MapPinOff, SearchX, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiErrorShape } from "@/types/station";

export function StationSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="gap-0 rounded-lg border-hairline p-4 shadow-none sm:p-5">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="mt-2 h-4 w-3/5" />
          <Skeleton className="mt-4 h-6 w-24 rounded-full" />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function Notice({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="items-center gap-0 rounded-lg border-hairline bg-pearl p-6 text-center shadow-none sm:p-10">
      <div className="text-muted-foreground">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-ink sm:text-[21px]">{title}</h3>
      <p className="text-caption mt-2 max-w-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </Card>
  );
}

export function EmptyState({ radius }: { radius: number }) {
  return (
    <Notice
      icon={<SearchX className="size-7" />}
      title="Keine Tankstellen gefunden"
      description={`Im Umkreis von ${radius} km wurden keine Stationen gemeldet. Erhöhe den Radius oder suche einen anderen Ort.`}
    />
  );
}

export function StartState({ children }: { children?: React.ReactNode }) {
  return (
    <Notice
      icon={<MapPinOff className="size-7" />}
      title="Wo möchtest du tanken?"
      description="Erlaube den Standortzugriff oder gib einen Ort bzw. eine Postleitzahl ein, um Preise in deiner Nähe zu vergleichen."
    >
      {children}
    </Notice>
  );
}

export function ErrorState({ error }: { error: ApiErrorShape }) {
  if (error.kind === "quota") {
    return (
      <Notice
        icon={<Timer className="size-7" />}
        title="Anfragelimit erreicht"
        description={error.message}
      />
    );
  }
  if (error.kind === "missing-key") {
    return (
      <Notice
        icon={<KeyRound className="size-7" />}
        title="API-Schlüssel fehlt"
        description="Für die Live-Preise wird ein Tankerkönig-API-Schlüssel benötigt. Bitte TANKERKOENIG_API_KEY hinterlegen."
      />
    );
  }
  return (
    <Notice
      icon={<AlertTriangle className="size-7" />}
      title="Daten nicht verfügbar"
      description={error.message}
    />
  );
}
