# SalesLens

**Retail analytics dashboard — no backend, no login, no black-box ML.**  
Turn a raw UCI Online Retail CSV into segments, cohort retention, revenue leakage, anomaly detection, and churn risk scores — entirely in the browser.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Apache ECharts (`echarts-for-react`) |
| Routing | React Router v6 |
| State | Zustand |
| Package manager | npm |

---

## Getting Started

```bash
# Install dependencies
npm install --prefix frontend

# Start development server
npm run dev --prefix frontend
# → http://localhost:3000
```

### Build for production

```bash
npm run build --prefix frontend
```

---

## Project Structure

```
saleslens/
├── frontend/
│   ├── public/
│   │   └── sl-logo.png          # App logo
│   └── src/
│       ├── app/
│       │   ├── layout/          # AppShell, Sidebar, Topbar
│       │   ├── nav.ts           # Navigation items
│       │   ├── providers.tsx    # React context providers
│       │   └── router.tsx       # Route definitions
│       ├── components/
│       │   ├── tables/          # DataTable (search, sort, paginate)
│       │   └── ui/              # InsightBanner, RiskBadge, ChartCard, CustomerDrawer, …
│       ├── features/
│       │   ├── overview/        # KPI grid + sparklines
│       │   ├── segments/        # RFM scatter, heatmap, sliders, table
│       │   ├── cohorts/         # Retention heatmap + curves
│       │   ├── returns/         # Return-rate by product/segment/month
│       │   ├── products/        # Top-10 bar, quadrant scatter, table
│       │   ├── anomalies/       # Daily z-score chart + flagged table
│       │   ├── risk/            # Weight Lab, histogram, top-50 table
│       │   ├── simulator/       # What-if revenue calculator
│       │   ├── journey/         # Lorenz curve, gap histogram, customer table
│       │   ├── pipeline/        # Cleaning funnel + quality checks
│       │   ├── methodology/     # 8-card accordion with formulas
│       │   └── mllab/           # Coming-soon ML feature cards
│       ├── hooks/               # useDataset, useFilters, …
│       ├── lib/
│       │   ├── colours.ts       # Design tokens for segments & risk bands
│       │   ├── formatters.ts    # GBP, percent, int formatters
│       │   ├── mock-data.ts     # Deterministic UCI-based mock dataset
│       │   └── types.ts         # Shared TypeScript interfaces
│       └── styles/
│           ├── globals.css      # Tailwind v4 directives + animations
│           └── tokens.css       # Light/dark CSS variables
└── package.json                 # Root scripts (proxies to frontend)
```

---

## Features

| Page | What it does |
|------|-------------|
| **Overview** | 5 KPI cards (customers, repeat rate, churn, retention, net revenue) + monthly revenue/returns bar chart |
| **Segments** | RFM scoring — 6 segment cards, scatter map, 5×5 heatmap, weighted sliders |
| **Cohorts** | 13×13 retention heatmap, customer vs revenue toggle, retention curves |
| **Returns** | Return rate by product / segment / month; dashed portfolio-average reference line |
| **Products** | Stacked net vs returned bar chart, return-rate × attach-rate scatter |
| **Anomalies** | Rolling 30-day z-score; spike/drop flagging with affected-customer chips |
| **Risk Score** | Composite 0–100 score; Weight Lab sliders with 4 presets; top-50 table |
| **Simulator** | Campaign revenue estimator — segment picker + 3 sliders + live GBP result |
| **Journey** | Orders histogram, gap distribution, Lorenz revenue curve, acquired-per-month |
| **Pipeline** | 7-step cleaning funnel, 9 quality checks, job history |
| **Methodology** | Accordion cards — formula + worked example for every metric |
| **ML Lab** | Locked preview cards (CLV prediction, churn propensity, market-basket) |

---

## Data Source

Demo data is derived from the **UCI Online Retail dataset** (Dec 2010 – Dec 2011):

- 4,334 unique customers · 399,659 clean rows
- £8.27 M net revenue · 5.12% return rate · 65.3% repeat-purchase rate

All mock data is generated deterministically (LCG seed) — no external API calls.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev --prefix frontend` | Start Vite dev server |
| `npm run build --prefix frontend` | TypeScript check + production build |
| `npm run preview --prefix frontend` | Preview production build locally |

---

## License

MIT
