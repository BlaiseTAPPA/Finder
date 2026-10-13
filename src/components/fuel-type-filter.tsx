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
      <TabsList className="w-full">
        {FUEL_TYPES.map((fuel) => (
          <TabsTrigger key={fuel} value={fuel} className="flex-1">
            {FUEL_LABELS[fuel]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
