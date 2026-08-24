/** Umkreis-Regler von 1 bis 25 km. */
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface Props {
  value: number;
  onChange: (value: number) => void;
  onCommit?: ((value: number) => void) | undefined;
}

export function RadiusSlider({ value, onChange, onCommit }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="radius" className="text-caption text-muted-foreground">
          Umkreis
        </Label>
        <span className="num text-caption font-semibold text-ink">{value} km</span>
      </div>
      <Slider
        id="radius"
        min={1}
        max={25}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? value)}
        onValueCommit={(v) => onCommit?.(v[0] ?? value)}
      />
    </div>
  );
}
