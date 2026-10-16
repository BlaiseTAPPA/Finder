# 0006 · Open and know: instant prices on launch, install prompt

|            |                          |
| ---------- | ------------------------ |
| **Status** | In progress              |
| **Branch** | `feat/0006-instant-home` |
| **PR**     | —                        |

### 1. Goal

Fuel apps are opened at a red light or in the car park, with a single question: _where is it cheapest right now?_ Today every launch starts with a marketing headline and an empty search; the user has to tap "Standort" each time. A returning user should open the app and **see the prices around them within two seconds, without a tap**, and be invited to **install the app** so it's one tap away on the home screen.

### 2. Build

**Automatic location on launch**

- When the browser reports the geolocation permission as **already granted** (Permissions API) and no search is restored from the session, the app locates the user and runs the nearby search on its own.
- The app **never triggers the permission prompt on load**. Where the Permissions API isn't available, nothing changes.
- A new search session (new tab, PWA cold start) starts from the current position; a restored session keeps its place.

**Start screen when the location isn't granted yet**

- The start notice gets a primary **"Standort verwenden"** button and says why: once allowed, the app opens directly on the prices nearby. The prompt only appears after that tap.
- If the permission was denied, the notice explains how to search by place instead (no button that can't work).

**Compact header once there are results**

- The headline and tagline ("Günstig tanken. Ganz in der Nähe.") stay on the empty start screen. As soon as a nearby or trip search is active, they're visually hidden (still read by screen readers), so results move up.

**Install prompt**

- A small, dismissible banner above the results: "Tankfinder installieren – öffnet direkt mit den Preisen in deiner Nähe."
  - **Android / Chromium:** "Installieren" opens the browser's install dialog (`beforeinstallprompt`).
  - **iPhone / iPad (Safari):** short instructions: "Teilen" → "Zum Home-Bildschirm".
- **When:** **right away**, on the first visit (the user's choice), never when already installed (standalone), and not again for 30 days after "Später". Never after the app was installed.
- Pure eligibility logic in `src/lib/install-prompt.ts`, unit-tested.

**Home screen shortcuts** (web app manifest)

- "In der Nähe" → `/?standort=1`: opens and locates (an explicit request, so the permission prompt may appear).
- "Favoriten" → `/?tab=favoriten`.
- The parameters are read once and removed from the URL.

**Privacy policy:** `/datenschutz` lists the new local storage entries (install banner dismissed or app installed).

### 3. Constraints

- **No permission prompt without a user action.** Auto-locate only with a permission already granted.
- **No location in URLs or persistent storage**: the session rule of `search-session.ts` stays (sessionStorage only).
- **Guests and signed-in users alike.** Nothing here needs an account.
- The install banner never covers content and never comes back after it is dismissed (until the snooze ends) or after installing.
- Design system, German copy, 44px touch targets, light and dark mode, keyboard access.
- `npm run typecheck`, `npm run lint` and `npm test` stay green.

### 4. Acceptance check

- [ ] With the location permission granted, opening the app in a new tab shows the nearby results without any tap.
- [ ] With the permission not yet granted, no prompt appears on load; "Standort verwenden" triggers it and then shows results.
- [ ] With the permission denied, the start screen explains how to search by place.
- [ ] A restored session (back from `/budget`) keeps its search instead of re-locating.
- [ ] Once results are shown, the headline is hidden visually but still present for screen readers.
- [ ] The install banner appears right away in Chrome on Android (with the install dialog) and in Safari on iOS (with instructions); never in the installed app; not again for 30 days after "Später".
- [ ] The "In der Nähe" and "Favoriten" shortcuts open the right view, and the URL is cleaned.
- [ ] `/datenschutz` mentions the new local storage entries.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass.

### 5. Not in this phase

- Remembering the last position across sessions.
- Push notifications (roadmap point 2, next).
- A native app or widgets.
