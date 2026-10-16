/**
 * Quellen- und Lizenzhinweis (Tankerkönig CC BY 4.0, OSM) mit Impressum und Datenschutz –
 * Footer am Desktop, Menü auf Mobil.
 */
import { Link } from "react-router-dom";

const TANKERKOENIG_URL = "https://creativecommons.tankerkoenig.de/";

export function DataCredits({ className }: { className?: string | undefined }) {
  return (
    <p className={className}>
      Preisdaten:{" "}
      <a href={TANKERKOENIG_URL} target="_blank" rel="noreferrer" className="text-primary">
        Tankerkönig
      </a>{" "}
      (CC BY 4.0) · Kartendaten © OpenStreetMap-Mitwirkende · Angaben ohne Gewähr.
      <span className="mt-2 flex gap-4">
        <Link
          to="/impressum"
          className="inline-flex min-h-11 items-center text-primary pointer-fine:min-h-0"
        >
          Impressum
        </Link>
        <Link
          to="/datenschutz"
          className="inline-flex min-h-11 items-center text-primary pointer-fine:min-h-0"
        >
          Datenschutz
        </Link>
      </span>
    </p>
  );
}
