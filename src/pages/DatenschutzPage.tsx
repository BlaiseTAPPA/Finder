/**
 * Datenschutzerklärung (Feature 0005). Beschreibt die tatsächlichen Datenflüsse der App –
 * bei neuen Diensten oder Datenfeldern hier nachziehen und LEGAL_UPDATED anpassen.
 */
import { Link } from "react-router-dom";
import {
  ExternalLink,
  LegalPage,
  LegalSection,
  OperatorAddress,
  OperatorContact,
} from "@/components/legal-page";
import { LEGAL_UPDATED, darkTilesHost } from "@/lib/legal";

const List = ({ children }: { children: React.ReactNode }) => (
  <ul className="grid list-disc gap-1 pl-5">{children}</ul>
);

const THIRD_COUNTRY =
  "Soweit dabei Daten in die USA übermittelt werden, stützt sich die Übermittlung auf das EU-US Data Privacy Framework bzw. auf Standardvertragsklauseln der EU-Kommission (Art. 45, 46 DSGVO).";

export function DatenschutzPage() {
  const darkHost = darkTilesHost();

  return (
    <LegalPage title="Datenschutzerklärung" updated={LEGAL_UPDATED}>
      <LegalSection id="ds-verantwortlich" title="1. Verantwortlicher">
        <OperatorAddress />
        <OperatorContact />
      </LegalSection>

      <LegalSection id="ds-kurz" title="2. Das Wichtigste in Kürze">
        <List>
          <li>Kein Tracking, keine Werbung, keine Analyse-Tools, keine Werbe-Cookies.</li>
          <li>
            Die App funktioniert ohne Konto. Ein Konto ist nur für Synchronisierung, Preisalarme und
            das Tankbudget nötig.
          </li>
          <li>Deinen Standort fragen wir nur ab, wenn du ihn ausdrücklich anforderst.</li>
          <li>Wir verkaufen keine Daten und bilden keine Profile zu Werbezwecken.</li>
        </List>
      </LegalSection>

      <LegalSection id="ds-hosting" title="3. Hosting und Server-Protokolle">
        <p>
          Die App wird bei Vercel Inc. (USA) betrieben. Beim Aufruf werden technisch notwendige
          Daten verarbeitet: IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser-Kennung und
          Fehlermeldungen. Das ist nötig, um die App auszuliefern und Fehler sowie Missbrauch zu
          erkennen (Art. 6 Abs. 1 lit. f DSGVO). Die Protokolle werden vom Hoster nach kurzer Zeit
          gelöscht. {THIRD_COUNTRY}
        </p>
        <p>
          Datenschutzhinweise von Vercel:{" "}
          <ExternalLink href="https://vercel.com/legal/privacy-policy">
            vercel.com/legal/privacy-policy
          </ExternalLink>
        </p>
      </LegalSection>

      <LegalSection id="ds-suche" title="4. Standort, Suche und Strecken">
        <List>
          <li>
            <strong className="text-foreground">Standort:</strong> Nur wenn du auf „Standort“
            tippst, fragt dein Browser nach deiner Erlaubnis. Die Koordinaten nutzen wir
            ausschließlich für die Suche und speichern sie nicht in einem Konto.
          </li>
          <li>
            <strong className="text-foreground">Tankstellensuche:</strong> Der Suchpunkt
            (Koordinaten) und der Radius gehen über unseren Server an die Tankerkönig-API. Deine
            IP-Adresse wird dabei nicht weitergegeben.
          </li>
          <li>
            <strong className="text-foreground">Ortssuche und Adressvorschläge:</strong> Der
            eingegebene Text geht über unseren Server an Nominatim der OpenStreetMap Foundation
            (Vereinigtes Königreich, angemessenes Datenschutzniveau nach Art. 45 DSGVO).
          </li>
          <li>
            <strong className="text-foreground">Strecken:</strong> Start- und Zielkoordinaten gehen
            über unseren Server an einen Routing-Dienst (standardmäßig den öffentlichen Server des
            Projekts OSRM).
          </li>
          <li>
            <strong className="text-foreground">„Route“:</strong> Der Button öffnet Google Maps bzw.
            Apple Karten mit der Adresse der Tankstelle. Dort gelten die Datenschutzbestimmungen des
            jeweiligen Anbieters.
          </li>
        </List>
        <p>
          Rechtsgrundlage ist die Bereitstellung der von dir angeforderten Funktion (Art. 6 Abs. 1
          lit. b DSGVO) bzw. unser berechtigtes Interesse an einer funktionierenden Suche (Art. 6
          Abs. 1 lit. f DSGVO).
        </p>
      </LegalSection>

      <LegalSection id="ds-karte" title="5. Kartenanzeige">
        <p>
          Die Kartenkacheln lädt dein Browser direkt von den Servern der OpenStreetMap Foundation
          {darkHost ? ` und, im dunklen Modus, von ${darkHost}` : ""}. Dabei werden deine IP-Adresse
          und der angezeigte Kartenausschnitt übermittelt (Art. 6 Abs. 1 lit. f DSGVO). Hinweise der
          OpenStreetMap Foundation:{" "}
          <ExternalLink href="https://osmfoundation.org/wiki/Privacy_Policy">
            osmfoundation.org/wiki/Privacy_Policy
          </ExternalLink>
        </p>
      </LegalSection>

      <LegalSection id="ds-geraet" title="6. Speicherung auf deinem Gerät">
        <p>
          Die App speichert im lokalen Speicher deines Browsers (localStorage): Favoriten,
          gespeicherte Strecken, die letzte Suche, eine zufällige Kennung für Preismeldungen und ob
          du die Fahrzeugabfrage übersprungen hast. Für die Offline-Nutzung speichert ein Service
          Worker Programmdateien. Diese Speicherungen sind für die von dir genutzten Funktionen
          unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst sie jederzeit über die
          Browser-Einstellungen löschen.
        </p>
      </LegalSection>

      <LegalSection id="ds-konto" title="7. Benutzerkonto (optional)">
        <p>
          Für die Anmeldung nutzen wir Clerk (Clerk, Inc., USA). Verarbeitet werden E-Mail-Adresse,
          Name und Profilbild (falls angegeben) sowie Anmelde- und Sicherheitsdaten. Clerk setzt
          dafür technisch notwendige Cookies für die Sitzung.
        </p>
        <p>Mit Konto speichern wir in unserer Datenbank bei Supabase (Supabase, Inc., USA):</p>
        <List>
          <li>Favoriten und gespeicherte Strecken,</li>
          <li>Preisalarme (Station, Sorte, Schwelle),</li>
          <li>dein Fahrzeug (Kraftstoff, Verbrauch, Tankgröße, optionaler Name),</li>
          <li>dein Budget und dein Tankbuch (Zeitpunkt, Station, Sorte, Liter, Preis).</li>
        </List>
        <p>
          Zu Tankvorgängen speichern wir keine Koordinaten. Jedes Konto kann nur seine eigenen Daten
          lesen und ändern. Rechtsgrundlage ist die Bereitstellung des Kontos (Art. 6 Abs. 1 lit. b
          DSGVO). Die Daten bleiben gespeichert, bis du sie löschst oder die Löschung deines Kontos
          verlangst. {THIRD_COUNTRY}
        </p>
        <p>
          Datenschutzhinweise:{" "}
          <ExternalLink href="https://clerk.com/legal/privacy">Clerk</ExternalLink> ·{" "}
          <ExternalLink href="https://supabase.com/privacy">Supabase</ExternalLink>
        </p>
      </LegalSection>

      <LegalSection id="ds-meldungen" title="8. Preismeldungen und Bestätigungen">
        <p>
          Wenn du einen Preis meldest oder bestätigst, speichern wir: Station, Sorte, Preis,
          Zeitpunkt, deine zufällige Kennung (bzw. deine Konto-Kennung, wenn du angemeldet bist) und
          – falls freigegeben – deinen Standort, gerundet auf etwa 100 m. Damit prüfen wir die
          Plausibilität und begrenzen Missbrauch (Art. 6 Abs. 1 lit. f DSGVO). Auf Anfrage löschen
          wir deine Meldungen.
        </p>
      </LegalSection>

      <LegalSection id="ds-preise" title="9. Preisverlauf">
        <p>
          Für Trends und Verläufe speichern wir Preise von Tankstellen über die Zeit. Diese Daten
          enthalten keine personenbezogenen Angaben.
        </p>
      </LegalSection>

      <LegalSection id="ds-rechte" title="10. Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art.
          17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und
          Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Wende
          dich dafür an die oben genannte E-Mail-Adresse.
        </p>
        <p>
          Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO),
          insbesondere in dem Bundesland, in dem du wohnst.
        </p>
        <p>
          Eine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO findet nicht statt.
        </p>
      </LegalSection>

      <LegalSection id="ds-aenderungen" title="11. Änderungen">
        <p>
          Wir passen diese Erklärung an, wenn sich die App oder die Rechtslage ändert. Es gilt die
          hier veröffentlichte Fassung. Siehe auch das{" "}
          <Link to="/impressum" className="text-primary underline-offset-2 hover:underline">
            Impressum
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
