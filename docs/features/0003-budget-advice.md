# 0003 · Fuel budget, phase 2: budget-aware recommendations

|            |                                                      |
| ---------- | ---------------------------------------------------- |
| **Status** | Done                                                 |
| **Branch** | `feat/0003-budget-advice`                            |
| **PR**     | [#12](https://github.com/BlaiseTAPPA/Finder/pull/12) |

### 1. Goal

Phase 1 ([0002](0002-fuel-budget.md)) tells signed-in users what they've spent and what's left. It doesn't yet help them spend less. This phase uses the vehicle profile and the remaining budget to answer the questions they ask at the pump: **what will a fill-up cost here, all in? How much can I still afford? Which station nearby or on my trip is the best choice for my budget, and is now a good time?**

### 2. Build

**Pure logic in `src/lib/budget-advice.ts`**, unit-tested like `budget.ts`:

- **Planned fill:** the vehicle's tank capacity, the same for every station, so stations compare fairly. The tank level isn't known (no odometer or gauge in this app).
- **Fill cost** at a station: litres × price.
- **Access cost:** fuel burned to reach the station, `detourKm × consumption / 100 × price`. Time is _not_ counted: the budget is money actually spent.
  - Nearby search: `estimateDetour(station.dist)` from `src/lib/route-score.ts` (there and back from the search point).
  - Trip: the detour already computed for the corridor.
  - Favorites: no access cost (the distance there is not current).
- **Effective cost** = fill cost + access cost.
- **Affordable litres** with the remaining budget at that station's price (`affordableLiters` from `budget.ts`), when a budget is set. The access cost is taken off the remaining budget first.
- **Best choice:** among open stations with a price for the vehicle's fuel, the lowest effective cost. Shown only with at least 2 candidates. Its saving is compared with the median effective cost of the candidates.

**Personalised "Bester Kompromiss" on trips:** `detourScore` in `route-score.ts` accepts the vehicle's tank capacity and consumption instead of the fixed 50 L / 7 L/100 km. Without a vehicle, the server's score stays as is.

**Station card** (signed-in, vehicle saved, selected fuel = vehicle fuel): only "Beste Wahl" in the label above the price, like "Günstigster". The cards were already dense, so the costs and the budget stay in the best-choice card. On trips, the detour replaces the distance to the route in the top-right corner ("+3 Min", "Umweg +462 m" below), and the saving joins the label above the price ("spart ca. 3,41 € · Super E10"). The label holds at most two hints, in the order Beste Wahl, saving, Günstigster; the fuel name is dropped when two are shown.

**"Beste Wahl für dein Budget" card** above the results, in the nearby and trip views:

- station name, price, effective cost of the planned fill, and the saving versus the median ("ca. 3,20 € günstiger als der Mittelwert hier", only from 0,50 €);
- affordable litres there, when a budget is set;
- a **timing hint** from that station's trend, when it's available: the existing recommendation ("Der Preis fällt üblicherweise gegen 19 Uhr…"), or "Gerade teurer als meist in den letzten 7 Tagen" when the price level is high;
- "Anzeigen" selects and scrolls to that station's card (and highlights it on the map), next to "Getankt".

**`/budget` page:** under the budget status, the range of the remaining budget: "Reicht noch für ca. 42 L ≈ 600 km", at the price of the last fill-up, with that price shown.

### 3. Constraints

- **Guests, and users without a vehicle, see nothing new.** The home page behaves exactly as before for them.
- **Advice only for the vehicle's fuel.** When the user selects another fuel, no advice is shown (the profile's tank and consumption describe that car).
- **Honest copy:** everything is an estimate ("≈", "ca."). The access cost uses the straight-line estimate already used for trips; this is said once in the best-choice card. Nothing promises the user will stay within budget.
- **No new data, no new endpoints:** everything is derived on the client from data already loaded (stations, detours, trends, the phase 1 budget query).
- **Server score unchanged** for everyone; personalisation happens on the client.
- **The station card still fits at 360px.** The advice line wraps rather than overflowing.
- Design system, German copy, 44px touch targets, light and dark mode, as in 0002.
- `npm run typecheck`, `npm run lint` and `npm test` stay green.

### 4. Acceptance check

- [ ] With a vehicle (50 L, 7 L/100 km) and E10 selected, the best-choice card for a station at 1,749 € shows "Volltanken (50 L) ≈ 87,45 €"; in nearby search, a station 3 km away adds the access cost of a 6 km round trip.
- [ ] With 40 € left, the best-choice card at a 1,749 € station 3 km away shows "Restbudget reicht für 22,4 L" (22,8 L without access cost); with nothing left it shows "Budget aufgebraucht".
- [ ] The best-choice card names the station with the lowest effective cost, which can be a slightly dearer but closer station; it doesn't appear with fewer than 2 candidates.
- [ ] "Anzeigen" scrolls to and highlights the station.
- [ ] On a trip, "Bester Kompromiss" uses the vehicle's tank and consumption.
- [ ] Selecting a fuel other than the vehicle's hides all advice.
- [ ] A guest, or a user without a vehicle, sees no change.
- [ ] `/budget` shows the range of the remaining budget at the last price paid.
- [ ] Unit tests cover the fill and access cost, affordable litres, the best choice (closer vs cheaper, closed stations, missing prices, fewer than 2 candidates) and the personalised score.
- [ ] The station card gains no extra row: only "Beste Wahl" in its label.
- [ ] At 360px, everything fits; light and dark mode; keyboard-reachable.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass.

### 5. Not in this phase

- **Phase 3 (0004):** monthly history charts, savings compared with the local average (`price_daily`), alerts when the pace exceeds the budget, data export.
- Tank level, odometer, or consumption computed from fill-ups.
- Road-distance access cost (routing every nearby station).
- Valuing the user's time in the budget advice.
- Advice for guests.
