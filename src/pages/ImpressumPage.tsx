/** Impressum nach § 5 DDG (Feature 0005). */
import { Link } from "react-router-dom";
import {
  ExternalLink,
  LegalPage,
  LegalSection,
  OperatorAddress,
  OperatorContact,
} from "@/components/legal-page";

export function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <LegalSection id="impressum-anbieter" title="Angaben gemäß § 5 DDG">
        <OperatorAddress />
      </LegalSection>

      <LegalSection id="impressum-kontakt" title="Kontakt">
        <OperatorContact />
      </LegalSection>

      <LegalSection id="impressum-daten" title="Herkunft der Daten">
        <p>
          Die Kraftstoffpreise stammen von der Markttransparenzstelle für Kraftstoffe (MTS-K) des
          Bundeskartellamts und werden über{" "}
          <ExternalLink href="https://creativecommons.tankerkoenig.de/">Tankerkönig</ExternalLink>{" "}
          unter der Lizenz CC BY 4.0 bereitgestellt. Kartendaten © OpenStreetMap-Mitwirkende (ODbL).
        </p>
        <p>
          Preise, Öffnungsstatus, Umwege, Trends und Budgetwerte werden automatisch ermittelt bzw.
          geschätzt. Alle Angaben ohne Gewähr – maßgeblich ist der Preis an der Zapfsäule.
        </p>
      </LegalSection>

      <LegalSection id="impressum-haftung" title="Haftung für Links">
        <p>
          Diese App verlinkt auf Angebote Dritter (z. B. Kartendienste für die Route). Für deren
          Inhalte sind ausschließlich die jeweiligen Anbieter verantwortlich. Bei Bekanntwerden von
          Rechtsverletzungen entfernen wir entsprechende Links umgehend.
        </p>
      </LegalSection>

      <p>
        Informationen zum Umgang mit deinen Daten findest du in der{" "}
        <Link to="/datenschutz" className="text-primary underline-offset-2 hover:underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
    </LegalPage>
  );
}
