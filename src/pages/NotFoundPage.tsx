import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-safe">
      <div className="w-full max-w-sm">
        <p className="price-display text-5xl leading-none text-ink-3">404</p>
        <h1 className="text-title mt-4 text-foreground">Seite nicht gefunden</h1>
        <p className="text-caption mt-1 text-ink-2">
          Diese Adresse gibt es nicht oder nicht mehr. Zurück zur Suche, um Spritpreise in deiner
          Nähe zu vergleichen.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Zur Preissuche</Link>
        </Button>
      </div>
    </main>
  );
}
