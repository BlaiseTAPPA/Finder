# Tankstellen-Finder

Real-time fuel prices for Germany, built for checking at a glance on the road. Find the cheapest station nearby or along a route, see whether today's price is high or low, and keep your usual stations one tap away.

Prices come from [Tankerkönig](https://creativecommons.tankerkoenig.de/) (CC BY 4.0). The app is in German, and installable as a PWA.

## Features

- **Nearby search:** search by place, postcode or current location within 1–25 km. Results are sorted by price or distance, shown as a list and on a map, and prices refresh every 5 minutes.
- **Trip search ("Strecke"):** stations within a corridor along a driving route, ranked by best value, price or smallest detour, with the estimated detour per station.
- **Price trends:** an own price history, since Tankerkönig only provides current prices.
  - Each station shows a low/average/high badge against the last 7 days.
  - A hint tells you when prices are usually lowest in the day.
  - A 7/15/30-day chart shows the daily averages.
- **Favorites and saved trips:** stored locally. When signed in, they sync to your account. The start screen shows your favorites with live prices, cheapest first.
- **Price alerts:** a signed-in user sets a threshold per favorite station and fuel type. The alerts page flags an alert once the latest collected price drops below it. There are no push notifications.
- **Community signals:** users near a station (within 500 m) can confirm a price, and anyone can report a wrong one. Activity from the last 48 hours turns into a "Kürzlich bestätigt" or "Preis angezweifelt" badge. The displayed price itself always comes from Tankerkönig.
- **Accessible and glanceable:**
  - 44px touch targets, WCAG AA contrast in light and dark mode, a visible keyboard focus, and respect for `prefers-reduced-motion`.
  - Prices are shown pump-style (1,74⁹ €).
  - Dark mode follows the operating system.

## Tech stack

| Layer         | Technology                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend      | React 19, React Router 7, TanStack Query 5, Tailwind CSS 4, Radix UI primitives (shadcn/ui-based), Leaflet / react-leaflet, Recharts |
| Backend       | Express 5 (`server.ts`), validated with Zod                                                                                          |
| Data          | Supabase (Postgres, `pg_cron`, `pg_net`, Vault)                                                                                      |
| Auth          | Clerk (optional)                                                                                                                     |
| External APIs | Tankerkönig (prices), Nominatim (geocoding), OSRM (routing), OpenStreetMap tiles                                                     |
| Tooling       | Vite 8, TypeScript 5, Vitest, ESLint, Prettier, vite-plugin-pwa                                                                      |
| Hosting       | Vercel (static frontend + serverless API)                                                                                            |

## Getting started

### Prerequisites

- Node.js **20.19+ or 22.12+** (required by Vite 8)
- A free [Tankerkönig API key](https://creativecommons.tankerkoenig.de/)
- Optional:
  - a [Supabase](https://supabase.com) project, for trends, community signals and accounts,
  - a [Clerk](https://clerk.com) application, for sign-in.

### Install and run

```sh
git clone https://github.com/BlaiseTAPPA/Finder.git
cd Finder
npm install
# create .env (see the template below), then:
npm run dev
```

Minimal `.env`. Add the other variables from [Configuration](#configuration) as needed:

```sh
TANKERKOENIG_API_KEY=your-tankerkoenig-key

# Optional: trends, community, accounts, alerts
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...

# Optional: sign-in
CLERK_SECRET_KEY=...
VITE_CLERK_PUBLISHABLE_KEY=...
```

`.env` files are git-ignored. Never commit real keys.

Open http://localhost:3000. In development, `server.ts` serves the API and mounts Vite as middleware, so the frontend and `/api/*` run on the same port with hot reload.

With only `TANKERKOENIG_API_KEY` set, the nearby and trip search work. Trends, community badges, accounts and alerts need Supabase, and sign-in needs Clerk.

### Scripts

| Command             | What it does                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Dev server (API + Vite) on port 3000                                                                           |
| `npm run build`     | Builds the frontend into `dist/`, plus the server bundles `dist/server.cjs` (Node) and `api/index.js` (Vercel) |
| `npm start`         | Runs the production build (`node dist/server.cjs`)                                                             |
| `npm test`          | Unit tests (Vitest): trend maths, geo helpers, community scoring, session state                                |
| `npm run typecheck` | `tsc --noEmit`                                                                                                 |
| `npm run lint`      | ESLint                                                                                                         |
| `npm run format`    | Prettier                                                                                                       |

## Configuration

Environment variables are read from `.env` in development and from the hosting provider in production. Variables prefixed with `VITE_` are compiled into the frontend and are therefore **public**.

| Variable                                                         | Required            | Purpose                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TANKERKOENIG_API_KEY`                                           | **yes**             | Tankerkönig API key. Server-only: all price requests go through `/api/stations/*`.                                                                                                                                   |
| `SUPABASE_URL`                                                   | for data features   | Supabase project URL (server)                                                                                                                                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY`                                      | for data features   | Service role key, server-only, never exposed to the browser                                                                                                                                                          |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`            | for data features   | Supabase client config                                                                                                                                                                                               |
| `CLERK_SECRET_KEY`                                               | for accounts        | Clerk secret key (server)                                                                                                                                                                                            |
| `VITE_CLERK_PUBLISHABLE_KEY`                                     | for accounts        | Clerk publishable key. Can also be served at runtime via `CLERK_PUBLISHABLE_KEY` and `/api/account/clerk-key`. Without it, the app runs in guest mode.                                                               |
| `CRON_SECRET`                                                    | recommended in prod | Shared secret required by the price-collection endpoint (`x-cron-secret` header)                                                                                                                                     |
| `OSRM_BASE_URL`                                                  | no                  | Routing server; defaults to the public `https://router.project-osrm.org`                                                                                                                                             |
| `VITE_MAP_DARK_TILES_URL` / `VITE_MAP_DARK_TILES_ATTRIBUTION`    | no                  | A keyed dark map style (e.g. MapTiler, Stadia) for dark mode. Without it, dark mode dims the OSM tiles.                                                                                                              |
| `VITE_LEGAL_NAME` / `_STREET` / `_POSTCODE` / `_CITY` / `_EMAIL` | **yes, in prod**    | Operator details for `/impressum` and `/datenschutz` (§ 5 DDG). Kept out of the repository; the pages show a warning while any is missing. Optional: `VITE_LEGAL_COUNTRY` (default Deutschland), `VITE_LEGAL_PHONE`. |

## Architecture

```
Browser (React SPA, PWA)
  │  fetch /api/*  (src/lib/*.functions.ts → fetchApi)
  ▼
Express API (server.ts)  ── Zod-validated input, in-memory TTL caches
  ├── Tankerkönig   list.php / prices.php   (prices, keyed server-side)
  ├── Nominatim     geocoding + address suggestions
  ├── OSRM          driving route for the trip search
  └── Supabase      price history, community, accounts, alerts
        ▲
        └── pg_cron (every 20 min) → POST /api/public/cron/collect-prices
```

### Project layout

```
server.ts                   Express app: every API route, cron endpoint, static/Vite serving
api/index.js                Vercel serverless entry (generated by `npm run build`)
src/
  pages/                    HomePage (search · trip · favorites), AlertsPage, auth, 404
  components/               Station card/list/map, forms, dialogs, start overview, states
  components/ui/            Radix-based primitives (button, dialog, select, tabs, …)
  lib/
    *.functions.ts          Typed client calls to the API
    *.server.ts             Server-only logic (Tankerkönig, Supabase, routing, Nominatim)
    *-input.ts              Zod schemas shared by client and server
    trend.ts, community.ts  Pure, unit-tested domain logic
  styles.css                Design tokens (light/dark), type scale, Leaflet theming
supabase/migrations/        Database schema, RLS policies, cron jobs
docs/features/              Implementation prompts for upcoming features (see its README)
```

### API

All endpoints live in `server.ts` and take JSON:

- `/api/stations/{list,refresh,geocode}`: nearby stations, price refresh, place search
- `/api/routes/{plan,stations,suggest}`: driving route, stations along it, address autocomplete
- `/api/trends/{history,trend,summaries}`: price history and trend badges
- `/api/community/{report,confirm,status,statuses}`: price reports and confirmations
- `/api/account/*`: favorites, trips and alerts sync (requires a Clerk session)
- `/api/public/cron/collect-prices`: the price collector (protected by `CRON_SECRET`)
- `/api/health`: health check

## Data and the price collector

Tankerkönig only returns the current price, so the app builds its own history in Supabase:

1. **Pool:** every nearby search upserts the returned stations into `stations`. The collector tracks stations seen in the last 14 days.
2. **Collection:** `pg_cron` calls the collector endpoint every 20 minutes via `pg_net`. Each run fetches up to 10 batches of 100 stations, using a rotating cursor, a single-flight lease (`collector_state`) and a circuit breaker on quota errors.
3. **Storage:** a row goes into `price_history` only when a price changes, which comes to roughly 300 rows per station per month.
4. **Compaction:** nightly at 03:15 UTC, `compact_price_history()` rolls data older than 30 days into daily values (`price_daily`) and deletes the raw rows.
5. **Trends** (`src/lib/trend.ts`): min/max/average, the percentile of the current price, a low (<25 %) / high (>75 %) classification, and the daily pattern in Europe/Berlin time. Recommendations appear only with at least 4 distinct days and 20 data points.

Other tables:

- `price_reports` and `price_confirmations` hold the community layer.
- `profiles`, `user_favorites`, `user_trips` and `price_alerts` hold account data, with row-level security.

### Enabling the collector

The cron migration doesn't store the endpoint URL or the secret. They are read from **Supabase Vault** at run time. Until both secrets exist, the job does nothing:

```sql
select vault.create_secret('https://<your-domain>/api/public/cron/collect-prices', 'collector_url');
select vault.create_secret('<same value as CRON_SECRET>', 'collector_secret');
```

### Staying within the Tankerkönig quota

- **Server-side caches:**
  - `list.php`: 5 minutes,
  - `prices.php`: 3 minutes,
  - geocoding: 24 hours.
- **The client polls prices** every 5 minutes, only for visible stations, and pauses in background tabs.
- **No retry loops** on quota errors. The UI shows a dedicated "Anfragelimit erreicht" state instead.

## Deployment (Vercel)

`vercel.json` rewrites `/api/*` to the serverless function `api/index.js` and everything else to `index.html`. `npm run build` produces both.

1. Import the repository in Vercel. The build command is `npm run build` and the output directory is `dist`.
2. Add the environment variables from [Configuration](#configuration).
3. Apply the migrations in `supabase/migrations/` to your Supabase project.
4. Create the two Vault secrets so the collector runs against your production URL.

Outside Vercel, `npm run build && npm start` serves the API and the built frontend from one Node process on port 3000.

## Data sources and licensing

| Source                                                   | Use                            | Terms                                                                                                              |
| -------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [Tankerkönig](https://creativecommons.tankerkoenig.de/)  | Fuel prices and stations       | CC BY 4.0, **non-commercial use**; attribution is shown in the app                                                 |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Map tiles, map data            | ODbL; follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/)                         |
| [Nominatim](https://nominatim.org)                       | Geocoding, address suggestions | [Usage policy](https://operations.osmfoundation.org/policies/nominatim/): max. 1 request/s, identifying User-Agent |
| [OSRM demo server](https://project-osrm.org)             | Driving routes                 | Demo use only. Set `OSRM_BASE_URL` to your own instance for production traffic.                                    |

For commercial use, or traffic beyond what these free services allow, you'll need your own instances or paid plans.

## License

The source code is released under the [MIT License](LICENSE).

The license covers the code only. Data and services used by the app keep their own terms (see the table above). In particular, Tankerkönig price data is CC BY 4.0 for **non-commercial use**, whatever the code license.
