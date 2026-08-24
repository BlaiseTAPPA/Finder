/**
 * Community-Badge: zusätzliches Vertrauenssignal.
 * Der angezeigte Preis stammt weiterhin ausschließlich von Tankerkönig.
 */
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CommunityStatus } from "@/lib/community";

export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  return `vor ${hours} Std.`;
}

export function CommunityTrustBadge({
  status,
}: {
  status: CommunityStatus | undefined;
}) {
  if (!status || status.status === "neutral") return null;
  const confirmed = status.status === "confirmed";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-fine cursor-help rounded-full border-0 px-2.5 py-1 font-medium",
              confirmed ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
            )}
          >

            {confirmed ? "✓ Kürzlich bestätigt" : "⚠️ Preis angezweifelt"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-xs">
          <p>
            {status.confirmationsCount} Bestätigung(en) und {status.reportsCount}{" "}
            Meldung(en) in den letzten 48 Stunden
            {status.lastActivityAt ? `, zuletzt ${relativeTime(status.lastActivityAt)}` : ""}
            .
          </p>
          <p className="mt-1 text-muted-foreground">
            Community-Hinweis. Der Preis selbst stammt von Tankerkönig (offizielle
            Meldung der Station) und wird dadurch nicht verändert.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
