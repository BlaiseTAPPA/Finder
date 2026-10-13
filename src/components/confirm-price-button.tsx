/** One-Tap-Bestätigung "Preis stimmt" – nur in ~500 m Umkreis möglich. */
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@/lib/server-fn-client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { confirmPrice } from "@/lib/community.functions";
import { RESULT_MESSAGES } from "@/lib/community-input";
import { CONFIRM_RADIUS_M, isNearStation } from "@/lib/community";
import type { Coords, FuelType, Station } from "@/types/station";

interface Props {
  station: Station;
  fuel: FuelType;
  contributorId: string | null;
  userCoords: Coords | null;
  onDone?: (() => void) | undefined;
}

export function ConfirmPriceButton({ station, fuel, contributorId, userCoords, onDone }: Props) {
  const [pending, setPending] = useState(false);
  const call = useServerFn(confirmPrice);

  const near = userCoords ? isNearStation(userCoords, station) : false;
  const disabled = pending || !contributorId || !userCoords || !near;

  const hint = !userCoords
    ? "Standort freigeben, um den Preis vor Ort zu bestätigen."
    : !near
      ? `Nur in ${CONFIRM_RADIUS_M} m Umkreis der Tankstelle möglich.`
      : "Bestätige, dass der angezeigte Preis dem Aushang entspricht.";

  async function handleClick() {
    if (!contributorId || !userCoords) return;
    setPending(true);
    try {
      const result = await call({
        data: {
          stationId: station.id,
          fuelType: fuel,
          contributorId,
          lat: userCoords.lat,
          lng: userCoords.lng,
        },
      });
      if (result.ok) {
        toast.success("Danke für deine Bestätigung!");
        onDone?.();
      } else {
        toast.error(RESULT_MESSAGES[result.reason]);
      }
    } catch {
      toast.error(RESULT_MESSAGES.unknown);
    } finally {
      setPending(false);
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              variant="ghost"
              disabled={disabled}
              className="h-11 min-w-11 rounded-md px-3 text-ink-2 shadow-none hover:bg-surface-sunken hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                void handleClick();
              }}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              <span className="@max-sm:sr-only">Stimmt</span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-xs">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
