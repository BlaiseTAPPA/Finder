/** Quellen- und Lizenzhinweis (Tankerkönig CC BY 4.0, OSM) – Footer am Desktop, Menü auf Mobil. */
export const TANKERKOENIG_URL = "https://creativecommons.tankerkoenig.de/";

export function DataCredits({ className }: { className?: string | undefined }) {
  return (
    <p className={className}>
      Preisdaten:{" "}
      <a href={TANKERKOENIG_URL} target="_blank" rel="noreferrer" className="text-primary">
        Tankerkönig
      </a>{" "}
      (CC BY 4.0) · Kartendaten © OpenStreetMap-Mitwirkende · Angaben ohne Gewähr.
    </p>
  );
}
