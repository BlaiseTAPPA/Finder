/** Manuelle Ortssuche (Ort oder PLZ) als Fallback zur Geolokalisierung. */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2, LocateFixed, Search } from "lucide-react";
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
  /**
   * Text, den die Seite ins Feld schreibt (Ortsname nach Standort oder Favorit, wiederhergestellte
   * Suche). `key` zählt hoch, damit auch derselbe Text erneut gesetzt wird.
   */
  fill?: { text: string; key: number };
}

export function SearchForm({
  onSearch,
  onLocate,
  searching,
  locating,
  fill = { text: "", key: 0 },
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { query: fill.text },
  });

  // Sonst bliebe z. B. "Mannheim" stehen, obwohl jetzt am Standort gesucht wird.
  useEffect(() => {
    if (fill.key > 0) form.reset({ query: fill.text });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fill.key]);

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSearch(values.query.trim()))}
      className="space-y-2"
      noValidate
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            {...form.register("query")}
            placeholder="Ort oder Postleitzahl"
            aria-label="Ort oder Postleitzahl"
            className="h-12 pr-12 pl-10 sm:pr-3"
          />
          {/* Mobil: Absenden direkt im Feld, damit "Standort" die Hauptaktion sein kann */}
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Suchen"
            disabled={searching}
            className="absolute top-0.5 right-0.5 text-primary sm:hidden"
          >
            {searching ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={searching} className="hidden h-12 px-6 sm:inline-flex">
            {searching ? <Loader2 className="animate-spin" /> : "Suchen"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onLocate}
            disabled={locating}
            className="h-12 flex-1 px-5 max-sm:border-transparent max-sm:bg-primary max-sm:text-primary-foreground max-sm:hover:bg-primary/90 max-sm:hover:text-primary-foreground sm:flex-none"
          >
            {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
            <span>
              <span className="sm:hidden">Meinen </span>Standort
              <span className="sm:hidden"> verwenden</span>
            </span>
          </Button>
        </div>
      </div>
      {form.formState.errors.query && (
        <p className="text-fine text-destructive">{form.formState.errors.query.message}</p>
      )}
    </form>
  );
}
