/** Auswahl der Kraftstoffsorte (E5 / E10 / Diesel). */
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FUEL_LABELS, FUEL_TYPES, type FuelType } from "@/types/station";

interface Props {
  value: FuelType;
  onChange: (value: FuelType) => void;
}

export function FuelTypeFilter({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as FuelType)}>
      <TabsList className="h-11 w-full rounded-full bg-parchment p-1">
        {FUEL_TYPES.map((fuel) => (
          <TabsTrigger
            key={fuel}
            value={fuel}
            className="flex-1 rounded-full text-caption data-[state=active]:bg-background data-[state=active]:shadow-none"
          >
            {FUEL_LABELS[fuel]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
