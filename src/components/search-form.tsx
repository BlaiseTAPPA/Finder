/** Manuelle Ortssuche (Ort oder PLZ) als Fallback zur Geolokalisierung. */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  query: z.string().min(2, "Bitte mindestens 2 Zeichen eingeben").max(120, "Eingabe zu lang"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSearch: (query: string) => void;
  onLocate: () => void;
  searching: boolean;
  locating: boolean;
}

export function SearchForm({ onSearch, onLocate, searching, locating }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { query: "" },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSearch(values.query.trim()))}
      className="space-y-2"
      noValidate
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            {...form.register("query")}
            placeholder="Ort oder Postleitzahl"
            aria-label="Ort oder Postleitzahl"
            className="h-12 rounded-full border-input bg-background pl-11 text-caption"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={searching}
            className="h-12 flex-1 rounded-full px-6 sm:flex-none"
          >
            {searching ? <Loader2 className="size-4 animate-spin" /> : "Suchen"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onLocate}
            disabled={locating}
            className="h-12 flex-1 rounded-full px-5 text-primary sm:flex-none"
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
            <span className="ml-1 hidden min-[380px]:inline">Standort</span>
          </Button>
        </div>
      </div>
      {form.formState.errors.query && (
        <p className="text-fine text-destructive">{form.formState.errors.query.message}</p>
      )}
    </form>
  );
}
