# 0005 · Impressum, privacy policy and German wording

|            |                         |
| ---------- | ----------------------- |
| **Status** | In progress             |
| **Branch** | `feat/0005-legal-pages` |
| **PR**     | —                       |

### 1. Goal

The app can't be offered to the German public without an Impressum (§ 5 DDG) and a privacy policy (GDPR, Art. 13): without them, it is open to costly cease-and-desist letters (_Abmahnungen_), and users have no way to know who runs it or what happens to their data. The UI also used the French word "Trajet", which German users notice immediately. This is the first step of the roadmap towards an everyday app.

### 2. Build

**Wording**

- "Trajet" becomes **"Strecke"** everywhere: the tab, "Strecke suchen", "Strecke speichern", "Gespeicherte Strecken", "Deine Strecken", the empty map message. "Route" stays the button that opens navigation to a station.

**Operator details**

- Name, street, postcode, city, email (required) and country, phone (optional) come from `VITE_LEGAL_*` variables (`src/lib/legal.ts`), so personal details stay out of the repository. They're public anyway, since the Impressum shows them.
- While a required value is missing, both pages show a visible warning naming the missing variables.

**`/impressum`**

- Angaben gemäß § 5 DDG, contact, data sources (MTS-K via Tankerkönig, CC BY 4.0; OpenStreetMap), "ohne Gewähr", liability for links.
- No EU online dispute resolution notice: the ODR platform was shut down in July 2025.

**`/datenschutz`**, describing the data flows the app actually has:

- controller; summary (no tracking, no ads, no analytics);
- hosting and server logs (Vercel);
- location (only on request), station search (Tankerkönig, via our server), place search (Nominatim, via our server), routing (OSRM by default, via our server), the "Route" button (Google Maps / Apple Maps);
- map tiles loaded by the browser from OpenStreetMap, plus the dark-mode tile host when `VITE_MAP_DARK_TILES_URL` is set;
- local storage and service worker (§ 25 Abs. 2 Nr. 2 TDDDG);
- account (Clerk) and account data in Supabase: favorites, trips, alerts, vehicle, budget, fill-up log;
- community price reports (random id or account id, position rounded to ~100 m);
- price history (no personal data);
- rights (Art. 15–21, 77), no automated decisions, changes.

**Links**: "Impressum" and "Datenschutz" next to the data credits, in the desktop footer and the mobile menu. Both pages are public and exempt from the vehicle onboarding redirect.

### 3. Constraints

- **Describe only what the code does.** Any new third-party service or stored field must be added to `/datenschutz` in the same PR, and `LEGAL_UPDATED` changed.
- **No personal details in the repository.**
- **No consent banner:** the app sets no cookies or storage that require consent (only strictly necessary ones). Adding analytics or ads later would change that.
- Design system, German copy, 44px touch targets, light and dark mode.
- `npm run typecheck`, `npm run lint` and `npm test` stay green.

### 4. Acceptance check

- [ ] No "Trajet" left in the UI.
- [ ] `/impressum` and `/datenschutz` are reachable without an account, from the footer (desktop) and the menu (mobile).
- [ ] With all `VITE_LEGAL_*` set, the Impressum shows name, full address and email; with one missing, a warning names it.
- [ ] Every external service called by the app appears in `/datenschutz`.
- [ ] A signed-in user without a vehicle can open both pages without being redirected.
- [ ] The texts have been reviewed by the operator (they are a draft, not legal advice).
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass.

### 5. Not in this phase

- Account deletion inside the app (requests go by email for now).
- A retention period for community price reports (currently kept until deletion on request).
- English versions of the legal pages.
