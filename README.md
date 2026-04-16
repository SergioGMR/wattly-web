<p align="center">
  <img src="wattly-banner.webp" alt="Wattly — Ahorra en tu factura de luz" width="600" />
</p>

<h1 align="center">Wattly</h1>

<p align="center">
  <strong>Precio de la electricidad en España, hora a hora.</strong><br />
  Consultá el PVPC en tiempo real, visualizá tendencias y descubrí el mejor momento para usar tus electrodomésticos.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Astro-SSR-ff5d01?logo=astro&logoColor=white" alt="Astro SSR" />
  <img src="https://img.shields.io/badge/Preact-Islands-673ab8?logo=preact&logoColor=white" alt="Preact Islands" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Tests-Vitest_+_Playwright-6e9f18?logo=vitest&logoColor=white" alt="Tests" />
</p>

---

## Qué es Wattly

Wattly es una webapp que muestra el **precio de la electricidad (PVPC)** en España actualizado cada hora. Calcula automáticamente las mejores ventanas horarias para usar electrodomésticos y te ayuda a ahorrar en la factura de luz.

### Funcionalidades

- **Precio actual** con indicador visual (bajo / medio / alto)
- **Gráfico de barras** con precios de las 24 horas del día
- **Precios de hoy y mañana** (disponible ~20:00 hora España)
- **Resumen del día** — mínimo, máximo y promedio
- **Electrodomésticos preset** — lavadora, lavavajillas, horno con mejor hora calculada
- **Electrodomésticos custom** — añadí los tuyos y persistí la config en localStorage
- **Dark mode** con toggle light / dark / system (dark por defecto)
- **PWA** — funciona offline con Service Worker
- **SEO** — JSON-LD, Open Graph, meta tags, sitemap, canonical URLs

---

## Tech Stack

| Capa        | Tecnología                                                          |
| :---------- | :------------------------------------------------------------------ |
| Framework   | [Astro](https://astro.build) SSR                                    |
| UI Islands  | [Preact](https://preactjs.com) (hydrate on demand)                  |
| Estilos     | [Tailwind CSS v4](https://tailwindcss.com) (CSS-first config)       |
| Charts      | [Chart.js](https://www.chartjs.org)                                 |
| Deploy      | [Vercel](https://vercel.com) (edge cache 1h + SWR 5min)             |
| Tests       | [Vitest](https://vitest.dev) + [Playwright](https://playwright.dev) |
| Lint/Format | ESLint + Prettier + Husky pre-commit                                |

---

## Arquitectura

```
src/
├── pages/
│   └── index.astro              # SSR page — fetch prices, set cache headers
├── components/                   # Static Astro components (server-rendered)
│   ├── Layout.astro              # HTML shell, SEO, fonts, theme script
│   ├── PriceHero.astro           # Current price display with glow effect
│   ├── PriceHighlights.astro     # Min / max / avg cards
│   └── ApplianceTips.astro       # Preset appliance recommendations
├── islands/                      # Preact islands (client-hydrated)
│   ├── DayToggle.tsx             # Today/tomorrow tab navigation
│   ├── PriceChart.tsx            # Chart.js bar chart
│   ├── ApplianceConfigurator.tsx # Custom appliance manager
│   ├── ThemeToggle.tsx           # Light/dark/system toggle
│   └── OfflineBanner.tsx         # Offline notification
├── lib/                          # Shared business logic
│   ├── api.ts                    # fetchTodayPrices / fetchTomorrowPrices
│   ├── appliances.ts             # Sliding window algorithm (O(24))
│   ├── format.ts                 # Price/hour/date formatters (es locale)
│   └── types.ts                  # TypeScript interfaces
└── styles/
    └── globals.css               # Tailwind v4 @theme, glass system, grid pattern
```

### Data Flow

```
[Red Eléctrica API] → api.ts → index.astro (SSR) → Astro components (static)
                                                   → Preact islands (hydrated)
```

Los precios se obtienen server-side. La página se cachea en el edge 1 hora con `stale-while-revalidate: 300s`. Los islands se hidratan solo cuando son necesarios (`client:load` / `client:visible`).

---

## Design System

Estética **Gradient Glow + Glassmorphism** — inspirada en Vercel y midu.dev:

- **Dark-first** — navy background con grid pattern azul y glow radial
- **Glassmorphism** — todas las cards con `backdrop-filter: blur` y bordes translúcidos
- **Tipografía** — Inter (Google Fonts) con fallback a system
- **Colores semánticos** — verde (precio bajo), amber (medio), rojo (alto), blue (accent)
- **Light mode** — glass adaptado a fondos claros, totalmente funcional

---

## Desarrollo

### Prerequisitos

- Node.js >= 22.12.0
- pnpm

### Instalación

```bash
pnpm install
```

### Comandos

| Comando              | Descripción                          |
| :------------------- | :----------------------------------- |
| `pnpm dev`           | Dev server en `localhost:4321`       |
| `pnpm build`         | Build de producción                  |
| `pnpm preview`       | Preview del build local              |
| `pnpm lint`          | ESLint                               |
| `pnpm lint:fix`      | ESLint con auto-fix                  |
| `pnpm format`        | Prettier write                       |
| `pnpm format:check`  | Prettier check                       |
| `pnpm test`          | Vitest en watch mode                 |
| `pnpm test:unit`     | Vitest run once                      |
| `pnpm test:coverage` | Coverage report (`src/lib/**`)       |
| `pnpm test:e2e`      | Playwright (requiere `pnpm preview`) |

### Variables de entorno

| Variable         | Default                             | Descripción                   |
| :--------------- | :---------------------------------- | :---------------------------- |
| `PUBLIC_API_URL` | `https://precio-lux-api.vercel.app` | Base URL de la API de precios |

---

## Tests

```
tests/
├── unit/           # Business logic (api, appliances, format)
└── component/      # Preact islands (@testing-library/preact)
e2e/                # Playwright (chromium-desktop + mobile-safari)
```

**53 tests** cubriendo lógica de negocio, componentes y flujos E2E.

---

## Deploy

Desplegado en **Vercel** con SSR adapter. Push a `main` triggerea deploy automático.

```bash
vercel            # preview deployment
vercel --prod     # production deployment
```

---

## Licencia

MIT

---

<p align="center">
  <img src="wattly-icon.webp" alt="Wattly" width="48" />
  <br />
  <sub>Hecho con Astro, Preact y mucho café.</sub>
</p>
