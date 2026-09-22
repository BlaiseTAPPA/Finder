/** Meldung eines abweichenden Preises (ergänzt Tankerkönig, ersetzt es nicht). */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@/lib/server-fn-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { reportPrice } from "@/lib/community.functions";
import { RESULT_MESSAGES } from "@/lib/community-input";
import { FUEL_LABELS, FUEL_TYPES, type Coords, type FuelType, type Station } from "@/types/station";

interface Props {
  station: Station | null;
  fuel: FuelType;
  contributorId: string | null;
  userCoords: Coords | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: (() => void) | undefined;
}

export function ReportPriceDialog({
  station,
  fuel,
  contributorId,
  userCoords,
  open,
  onOpenChange,
  onDone,
}: Props) {
  const [fuelType, setFuelType] = useState<FuelType>(fuel);
  const [price, setPrice] = useState("");
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const call = useServerFn(reportPrice);

  useEffect(() => {
    if (open) {
      setFuelType(fuel);
      setPrice("");
      setComment("");
    }
  }, [open, fuel]);

  async function submit() {
    if (!station || !contributorId) return;
    const parsed = price.trim() ? Number(price.trim().replace(",", ".")) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0.5 || parsed > 5)) {
      toast.error("Bitte einen realistischen Preis zwischen 0,50 € und 5,00 € angeben.");
      return;
    }

    setPending(true);
    try {
      const result = await call({
        data: {
          stationId: station.id,
          fuelType,
          contributorId,
          reportedPrice: parsed,
          comment: comment.trim() || null,
          lat: userCoords?.lat ?? null,
          lng: userCoords?.lng ?? null,
        },
      });
      if (result.ok) {
        toast.success("Danke! Deine Meldung hilft anderen Nutzenden.");
        onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preis melden</DialogTitle>
          <DialogDescription>
            {station?.name} · Der angezeigte Preis stammt von Tankerkönig (offizielle Meldung der
            Station). Deine Meldung ergänzt ihn nur als Community-Hinweis und ändert ihn nicht.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-fuel">Kraftstoff</Label>
            <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
              <SelectTrigger id="report-fuel" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {FUEL_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-price">Beobachteter Preis (optional)</Label>
            <Input
              id="report-price"
              inputMode="decimal"
              placeholder="z. B. 1,749"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-comment">Kommentar (optional)</Label>
            <Textarea
              id="report-comment"
              maxLength={200}
              placeholder="Kurzer Hinweis, z. B. „Aushang zeigt 3 Cent mehr“"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <p className="text-fine text-muted-foreground">
            Bleibt die Abweichung bestehen, wende dich bitte direkt an die Tankstelle oder melde sie
            über die offiziellen Kanäle der{" "}
            <a
              href="https://www.bundeskartellamt.de/DE/Aufgaben/Markttransparenzstelle/MTS-Kraftstoffe/mtskraftstoffe_node.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Markttransparenzstelle für Kraftstoffe
            </a>
            .
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="min-h-11 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            className="min-h-11 rounded-full"
            disabled={pending || !contributorId}
            onClick={() => void submit()}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Meldung senden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
