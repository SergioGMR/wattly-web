# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # dev server at localhost:4321
pnpm lint             # ESLint
pnpm lint:fix         # ESLint with auto-fix
pnpm format:check     # Prettier check
pnpm format           # Prettier write
pnpm astro check      # TypeScript type-check (Astro-aware)
pnpm test:unit        # Vitest (unit + component) — run once
pnpm test             # Vitest in watch mode
pnpm test:coverage    # Coverage report (src/lib/** only)
pnpm test:e2e         # Playwright (requires built app via pnpm preview)
```

Run a single test file:

```bash
pnpm vitest run tests/unit/appliances.test.ts
```

## Architecture

**Astro SSR + Preact islands + Tailwind v4, deployed on Vercel.**

### Data flow

All price fetching is server-side in `src/pages/index.astro`. It calls `src/lib/api.ts` which hits an external API (`PUBLIC_API_URL`, defaults to `https://precio-lux-api.vercel.app`). Appliance window calculations (`src/lib/appliances.ts`) also happen server-side and the results are passed as props to static components. The page sets `Cache-Control: s-maxage=3600, stale-while-revalidate=300` for edge caching.

### Islands (Preact, `src/islands/`)

Interactive components use Astro's island architecture — they hydrate client-side only when needed:

- `DayToggle` — `client:load` — tab UI for today/tomorrow prices; renders `PriceChart` (Chart.js)
- `ApplianceConfigurator` — `client:visible` — user-defined appliances persisted in `localStorage` under key `wattly:custom-appliances`; recalculates best window on the client using the same `calcApplianceWindow` from `src/lib/appliances.ts`

### Static components (Astro, `src/components/`)

Pure server-rendered: `Layout`, `PriceHero`, `PriceHighlights`, `ApplianceTips`.

### Business logic (`src/lib/`)

- `types.ts` — all shared interfaces (`PriceData`, `HourlyPrice`, `Appliance`, `ApplianceWindow`, etc.)
- `api.ts` — `fetchTodayPrices()` / `fetchTomorrowPrices()`. 404 on tomorrow returns `null` (expected before ~20:00 Spain time).
- `appliances.ts` — `findBestWindow()` sliding-window algorithm (O(24)), `calcApplianceWindow()` wrapper. `PRESET_APPLIANCES` are the 3 built-in ones.
- `format.ts` — `formatPrice`, `formatHour`, `formatHourIndex`, `formatDate` — all Spanish locale.

### Tests

- `tests/unit/` — Vitest, `happy-dom`, path alias `@` → `/src`
- `tests/component/` — Vitest + `@testing-library/preact`
- `e2e/` — Playwright, two projects: `chromium-desktop` (1280×720) and `mobile-safari` (iPhone SE); requires `pnpm preview` running on port 4321

Coverage is collected only for `src/lib/**`.

## Key constraints

- `PUBLIC_API_URL` env var overrides the external API base URL — needed for local mocking in tests.
- Tomorrow prices return `null` (not an error) — always handle that case.
- `ApplianceConfigurator` uses `localStorage` — component tests must account for this (mock or use happy-dom's implementation).
- Husky pre-commit runs lint-staged: ESLint + Prettier on staged files.
