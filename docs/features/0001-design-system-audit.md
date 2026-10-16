# 0001 · Design system audit and redesign

|            |                                                    |
| ---------- | -------------------------------------------------- |
| **Status** | Done                                               |
| **Branch** | `design/utility-pass`                              |
| **PR**     | [#4](https://github.com/BlaiseTAPPA/Finder/pull/4) |

### 1. Goal

Audit the entire front-end visual design system and interface components of the application to identify design patterns and aesthetic clichés characteristic of "vibe-coded" / boilerplate AI-generated interfaces (e.g., generic shadcn copy-paste layouts, overuse of violet/indigo gradients, floating glow cards, uncurated iconography, lack of distinct visual hierarchy, and uniform component padding). Following the audit, produce a concrete, step-by-step redesign and refinement plan to give the application an authentic, polished, and utility-driven product identity tailored to real-time fuel navigation in Germany.

### 2. Build

- **Design System & Asset Audit:**
  - Review typography pairings, scale, font weights, and tracking (`src/styles.css`, tailwind configurations, and headings across pages).
  - Inspect color token usage (accents, background contrast, dark/light mode balance, borders, subtle shadows, and status badges).
  - Review component anatomy and layout rhythm in `src/components/` (specifically `station-card.tsx`, `search-form.tsx`, `site-header.tsx`, `results-layout.tsx`, and dialogs/drawers) for generic starter-kit templates.
  - Check iconography and decorative accents for generic decorative fluff that adds visual noise rather than situational utility.
- **Remediation & Polish Blueprint:**
  - Establish a coherent, domain-relevant design language (high-readability figures for fuel prices, unambiguous distance/brand cues, tactile contrast, and compact ergonomic spacing suited for in-car or mobile glanceability).
  - Define updated design tokens (semantic color palette, strict borders/elevation hierarchy, restrained modern typography).
  - Outline refactoring tickets component by component to replace AI-boilerplate aesthetics with purposeful craft.

### 3. Constraints

- **Design & Layout Focus Only:** Do not alter business logic, state machines, API queries, database tables, or server functions.
- **Preserve Established UX Architecture:** Keep current user journeys, accessibility hooks, form bindings, and core layouts intact; do not rewrite navigation structures.
- **Strict Scope of Investigation:** Limit the audit and proposed remedies to styling, tokens, and presentation layers (`src/styles.css`, `src/components/ui/*`, and presentation JSX in `src/components/*` and `src/pages/*`).
- **Framework Consistency:** All recommendations must adhere to Tailwind CSS and existing primitives without introducing heavy external graphic libraries or breaking bundle sizes.

### 4. Acceptance check

- [x] A structured audit report detailing specific files, components, and CSS tokens exhibiting generic "vibe-coded" visual patterns.
- [x] Clear side-by-side identification of what makes each element look like generic AI boilerplate vs. what a production-grade utility look requires.
- [x] A prioritized, actionable action plan detailing exact component updates, color/typography adjustments, and spacing guidelines.
- [x] Zero breaking changes to functional interactions, component props contracts, or search mechanics.

### 5. Not in this phase

- Backend, server functions, or database schema alterations.
- Rewriting data visualization charts (`price-trend-chart.tsx`) logic or changing data series schemas.
- Complete re-branding (e.g., new app name, full asset re-illustration, or 3D animations).
- Performance benchmarking or server-side rendering logic refactoring.

---

### Outcome

- **Delivered in [#4](https://github.com/BlaiseTAPPA/Finder/pull/4):** a "road-sign utility" design system.
  - semantic light/dark tokens and a DIN-style figure font for prices,
  - a price-first station card, with pump-style prices (1,74⁹ €),
  - 44px primitives, Clerk and toasts themed from the tokens,
  - WCAG AA contrast and visible keyboard focus.
- **Bugs found along the way, fixed in the same PR:**
  - `cn()` dropped type-scale classes,
  - `overflow-x: hidden` broke `position: sticky`,
  - Leaflet CSS overrode our styles in dark mode,
  - the sliders had no accessible name.
- **Follow-ups that came out of it:**
  - [#5](https://github.com/BlaiseTAPPA/Finder/pull/5): persisted search
  - [#6](https://github.com/BlaiseTAPPA/Finder/pull/6): mobile footer
  - [#7](https://github.com/BlaiseTAPPA/Finder/pull/7): start screen
  - [#8](https://github.com/BlaiseTAPPA/Finder/pull/8): type fixes
