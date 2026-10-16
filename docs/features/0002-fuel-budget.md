# 0002 · Fuel budget, phase 1: vehicle, budget and fill-up log

|            |                                                      |
| ---------- | ---------------------------------------------------- |
| **Status** | Done                                                 |
| **Branch** | `feat/0002-fuel-budget`                              |
| **PR**     | [#10](https://github.com/BlaiseTAPPA/Finder/pull/10) |

### 1. Goal

Users can follow price trends but have no way to manage what they actually spend on fuel. This phase gives signed-in users a **fuel budget**: they set a weekly or monthly amount, log each fill-up in a few seconds, and always see how much they've spent, what's left and whether they're on track to stay within budget.

A budget alone can't tell anyone how to stay within it. What drives spending is how much you drive, so the **fill-up log** ("Tankbuch") is the core of the feature. Logging must take almost no effort, or nobody will keep it up. Recommendations built on this data (affordable litres per station, best station with detour cost, when to fill up) come in phase 2, see "Not in this phase".

### 2. Build

**Vehicle profile, asked first after sign-in**

- After signing in, a user without a vehicle profile is taken to a one-screen onboarding ("Dein Fahrzeug") before anything else.
- **Fields:** fuel type (E5 / E10 / Diesel), average consumption (L/100 km), tank capacity (L), and an optional name ("Golf").
- **Defaults:** values are pre-filled (E10, 7.0 L/100 km, 50 L), so the user can confirm with one tap.
- **"Später":** the user can skip for now. `/budget` can't be used without a profile and asks for it again there.
- The profile can be edited later from `/budget`.
- Once a profile exists, its fuel type pre-selects the fuel filter on the home page, unless a restored search session already has one (see `src/lib/search-session.ts`).

**Budget**

- One active budget per user: an amount in € and a period, **weekly** (Monday to Sunday) or **monthly** (calendar month). Periods are computed in Europe/Berlin time.
- Changing the amount or the period applies to the current period immediately. The log entries stay.

**Fill-up log ("Tankbuch")**

- An entry has: date and time, station (id plus a snapshot of name/brand/place, so it survives the station disappearing; it can also be empty for a manual entry), fuel type, litres, and price per litre. The total is computed.
- **"Getankt" on the station card** (signed-in users only) opens a dialog pre-filled with the station, the vehicle's fuel type and the current price. The user enters litres _or_ the amount paid, and the other value is computed. One more tap saves it.
- **Manual entry** on `/budget` uses the same dialog, without a station.
- Entries can be edited and deleted.

**Budget status**

- **Pure logic in `src/lib/budget.ts`**, unit-tested like `trend.ts`:
  - period bounds,
  - spent / remaining / days left,
  - **projected end-of-period spend**, at the current pace,
  - litres affordable with the remaining amount at a given price.
- **When to show the projection:** only from 3 days into the period _and_ at least 2 entries; before that, the card says there isn't enough data yet.
- **Start screen card** (`src/components/start-overview.tsx`), above the favorites, when a budget is set. Example: "116 / 200 € · noch 84 € · 11 Tage". It switches to a warning style when the projection exceeds the budget, and taps through to `/budget`.

**`/budget` page**, protected like `/alerts` (`ProtectedLayout`) and linked from the header next to the alerts bell (wallet icon). It contains:

- the budget status for the current period,
- the budget settings,
- the vehicle profile,
- the log of the current period, newest first, with edit and delete,
- the totals of the previous periods (amount and litres).

**Data and API**

- **Supabase migration:**
  - tables `vehicle_profiles` (one per user, key `clerk_user_id`), `fuel_budgets` (one per user) and `fuel_logs`, with row-level security following `20261013150000_user_data_rls.sql`;
  - `fuel_logs` indexed on `(clerk_user_id, filled_at desc)`.
- **Endpoints in `server.ts`**, under `/api/account/*`, all behind `getAuthUserId`:
  - read the vehicle, budget and logs for a date range,
  - upsert the vehicle,
  - upsert the budget,
  - add / update / delete a log entry.
- **Typed client calls** in `src/lib/account.functions.ts`; **Zod schemas** in `src/lib/account-input.ts`.
- **Validation ranges:**
  - litres 0.5–150,
  - price 0.50–5.00 €/L,
  - consumption 2–30 L/100 km,
  - tank 10–150 L,
  - budget 1–10 000 €.

### 3. Constraints

- **Signed-in users only.** Guests see no budget UI, no "Getankt" action and no onboarding. Their experience must not change in any way.
- **Don't break existing account data:** `profiles`, `user_favorites`, `user_trips` and `price_alerts` stay as they are. New data goes in new tables.
- **Prices stay Tankerkönig's.** The price pre-filled in "Getankt" is a suggestion the user can edit. The log stores what the user actually paid.
- **Honest copy:** the tool helps users stay within budget; it never promises it. A projection is labelled as an estimate.
- **Privacy:** fill-ups reveal places and habits.
  - Row-level security on every new table.
  - Each user can only read and write their own rows.
  - Coordinates are not stored; the station snapshot is enough.
- **Design system:** use the existing tokens, primitives and type scale (`src/styles.css`, `src/components/ui/*`), `PriceFigure` for €/L, 44px touch targets, light and dark mode. UI copy is in German.
- **The station card must still fit at 360px** with the extra action. The existing icon-only collapse of secondary actions must keep it on one row.
- **No new heavy dependencies.** Date handling uses `date-fns`, which is already installed.
- `npm run typecheck`, `npm run lint` and `npm test` stay green.

### 4. Acceptance check

- [ ] A new signed-in user without a vehicle profile sees "Dein Fahrzeug" right after signing in; "Später" lets them continue, and `/budget` asks again.
- [ ] Defaults are pre-filled; saving takes one tap. The profile's fuel type pre-selects the home fuel filter, unless a search session is restored.
- [ ] A user can set a weekly or monthly budget and change it; existing log entries are kept.
- [ ] "Getankt" on a station card opens a pre-filled dialog. Entering only litres, or only the amount, computes the other, and saving adds the entry.
- [ ] Log entries can be added manually, edited and deleted on `/budget`.
- [ ] Spent, remaining and days left are correct across period boundaries, including a Sunday 23:30 → Monday 00:30 fill-up in Berlin time and month-end. This is covered by unit tests in `src/lib/budget.test.ts`.
- [ ] The projection appears only from day 3 with ≥ 2 entries, and the start-screen card shows the warning style when it exceeds the budget.
- [ ] A guest sees no budget UI, no "Getankt" and no onboarding, and the home page behaves exactly as before.
- [ ] With two accounts, neither can read or change the other's vehicle, budget or log, through the API or directly in Supabase.
- [ ] At 360px, the station card with "Getankt" fits on one row; everything new works in light and dark mode and is keyboard-reachable.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass.

### 5. Not in this phase

- **Phase 2 (0003):**
  - affordable litres on station cards,
  - the effective cost of a station including the detour (reusing `src/lib/route-score.ts`),
  - a budget-aware "best choice" nearby or along a trip,
  - when-to-fill-up hints from the trend data.
- **Phase 3 (0004):**
  - monthly history charts,
  - savings compared with the local average (`price_daily`),
  - alerts when the pace exceeds the budget,
  - data export.
- Budget and fill-up log for guests.
- Several vehicles or several budgets per user.
- Odometer tracking or consumption computed from fill-ups.
- Push notifications.
