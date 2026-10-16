/** Gemeinsamer Rahmen für Impressum und Datenschutzerklärung (Feature 0005). */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LEGAL_OPERATOR, missingLegalFields, type LegalOperator } from "@/lib/legal";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string | undefined;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-safe pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Link
        to="/"
        className="text-caption -ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-ink-2 hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück
      </Link>
      <h1 className="text-title mt-1 text-foreground">{title}</h1>
      {updated && <p className="text-fine mt-1 text-ink-3">Stand: {updated}</p>}
      <div className="text-caption mt-6 grid gap-8 text-ink-2">{children}</div>
    </main>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <h2 id={id} className="text-body font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Externer Link im Fließtext. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

/** Name und Anschrift des Anbieters; bei fehlenden Angaben ein deutlicher Hinweis. */
export function OperatorAddress({ operator = LEGAL_OPERATOR }: { operator?: LegalOperator }) {
  const missing = missingLegalFields(operator);
  if (missing.length > 0) {
    return (
      <p
        role="alert"
        className="rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive"
      >
        Anbieterangaben fehlen. Bitte {missing.join(", ")} in der Umgebung setzen.
      </p>
    );
  }
  return (
    <address className="text-foreground not-italic">
      {operator.name}
      <br />
      {operator.street}
      <br />
      {operator.postCode} {operator.city}
      <br />
      {operator.country}
    </address>
  );
}

export function OperatorContact({ operator = LEGAL_OPERATOR }: { operator?: LegalOperator }) {
  if (!operator.email) return null;
  return (
    <p>
      E-Mail:{" "}
      <a
        href={`mailto:${operator.email}`}
        className="text-primary underline-offset-2 hover:underline"
      >
        {operator.email}
      </a>
      {operator.phone && (
        <>
          <br />
          Telefon: {operator.phone}
        </>
      )}
    </p>
  );
}
