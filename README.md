# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Tankstellen-Finder

Live-Spritpreise (Tankerkönig) mit Umkreissuche, Karte und Favoriten.

### Einrichtung
1. Kostenlosen API-Key auf https://creativecommons.tankerkoenig.de/ beantragen.
2. `TANKERKOENIG_API_KEY` als Secret hinterlegen (siehe `.env.example`).
3. Abhängigkeiten: `bun install` (Leaflet/react-leaflet sind enthalten).

### Aufbau
- `src/lib/stations.functions.ts` – Server-Funktionen als Proxy (Key bleibt serverseitig)
- `src/lib/tankerkoenig.server.ts` – HTTP + TTL-Cache + Quota-Fehler
- `src/lib/tankerkoenig.ts` – Zod-Schemas/Normalisierung
- `src/components/*` – Karte, Liste, Filter, Slider, Zustände

### Quota
Tankerkönig ist nur für nicht-kommerzielle Nutzung freigegeben und drosselt häufige Abfragen.
Deshalb: `list.php` serverseitig 5 Min gecacht (Cache-Key auf ~1 km Raster gerundet),
`prices.php` 3 Min, Client-Polling alle 5 Min und nur für sichtbare Stationen,
Pausieren bei inaktivem Tab, kein Retry-Loop bei Limitüberschreitung (eigener Fehlerzustand).

## Preistrend & Prognose

Zusätzlich zu den Live-Preisen baut die App eine **eigene Messreihe** auf, weil Tankerkönig
nur den aktuellen Preis liefert.

- **Sammlung**: Cron-Job alle 20 Minuten → `POST /api/public/cron/collect-prices`
  (`src/routes/api/public/cron/collect-prices.ts`). Pro Lauf max. 10 Batches à 100 IDs,
  rotierender Cursor, Single-Flight-Lock und Circuit-Breaker bei Quota-Fehlern.
- **Pool**: Stationen, die Nutzer in den letzten 14 Tagen gesehen haben
  (Upsert in `stations` bei jeder Umkreissuche).
- **Speicherung**: neue Zeile in `price_history` nur bei Preisänderung.
  Nach 30 Tagen Verdichtung zu Tageswerten (`price_daily`) und Löschung der Rohdaten
  (`compact_price_history()`, nachts um 3 Uhr).
- **Berechnung** (`src/lib/trend.ts`, getestet mit `npm test`): Min/Max/Ø, Perzentil des
  aktuellen Preises, Klassifizierung (<25 % niedrig, >75 % hoch) und Tagesrhythmus
  (Stundenmittel in Europe/Berlin, Tief/Hoch). Empfehlungen erst ab 4 verschiedenen Tagen
  und 20 Messpunkten – sonst zeigt die UI nichts bzw. „noch nicht genug Daten“.
- **UI**: Trend-Badge + Tooltip auf der Stationskarte, Hinweistext zum Tagesrhythmus,
  Dialog mit Verlaufsdiagramm (7/14/30 Tage inkl. Durchschnittslinie).

### Kompromisse
20 Minuten Takt bildet den typischen Tagesverlauf ab (Preise ändern sich real ca. 4–8×/Tag)
und bleibt deutlich unter dem Tankerkönig-Limit; differenzielles Schreiben begrenzt das
Volumen auf ~300 Zeilen pro Station und Monat, die 30-Tage-Verdichtung deckelt das Wachstum.
Die Daten stehen unter CC BY 4.0 (nicht-kommerzielle Nutzung) – die Quelle wird in der App
genannt.
