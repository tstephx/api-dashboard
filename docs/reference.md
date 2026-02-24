# @tstephx/api-dashboard — Reference

React components for building API usage monitoring dashboards. Zero runtime dependencies beyond React — all charts are hand-rolled SVG, all styling is inline.

## Installation

```bash
npm install @tstephx/api-dashboard
```

React 18+ is required as a peer dependency.

---

## Components

### `ApiDashboard`

A full-page light mode dashboard with stat cards, a request volume area chart, a donut chart for status code breakdown, a service health panel, and an endpoint table.

**When to use:** You want a complete, opinionated dashboard out of the box. Drop it in and point it at your API.

```tsx
import { ApiDashboard } from "@tstephx/api-dashboard";

<ApiDashboard
  apiUrl="/api/dashboard"
  title="My API"
/>
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiUrl` | `string` | — | URL that returns `DashboardData` JSON. A `?window=` query param is appended automatically when the user switches time ranges (e.g. `?window=7d`). |
| `title` | `string` | `"API Overview"` | Heading shown in the sidebar. |

**Features**
- Time window selector: 1h, 24h, 7d, 30d
- Request volume area chart with dynamic Y-axis
- Status code donut chart
- Service health grid (ok / warn)
- Endpoint table with method badge, p50/p95 latency, error rate
- Dismissable alert banner (plain text)
- Skeleton loading state

---

### `ApiDashboardV3`

A table-first variant of the dashboard. The endpoint table is the hero — each row shows an inline SVG sparkline of request trend, color-coded by error level. Rows are expandable to reveal a latency histogram.

**When to use:** You have many endpoints and want to compare trends at a glance. Better for power users who scan rows rather than charts.

```tsx
import { ApiDashboardV3 } from "@tstephx/api-dashboard";

<ApiDashboardV3
  apiUrl="/api/dashboard"
  title="My API"
  pageSize={10}
/>
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiUrl` | `string` | — | Same as `ApiDashboard` — `?window=` is appended on time range change. |
| `title` | `string` | `"API Overview"` | Dashboard heading. |
| `pageSize` | `number` | `7` | Number of endpoint rows per page. |

**Features**
- Everything in `ApiDashboard`, plus:
- Inline sparklines per endpoint (color: green → yellow → red by error level)
- Expandable row with latency histogram (p50 / p95 markers)
- Client-side pagination with page reset on window change

---

## API Response Shape

Both components fetch from `apiUrl` and expect this JSON structure:

```ts
interface DashboardData {
  stats: StatCard[];
  services: StatusService[];
  endpoints: Endpoint[];         // V3 requires extra fields — see below
  chartPoints: ChartPoint[];
  statusCodeBreakdown: { label: string; pct: number; color: string }[];
  alert?: string;                // plain text only, no HTML
}

interface StatCard {
  label: string;
  value: string;
  delta: string;
  deltaDirection: "up" | "down" | "neutral";
  deltaPositive: boolean;        // true = green, false = red
  sub: string;
  iconColor: string;
  iconBg: string;
  icon: string;                  // emoji or single character
}

interface StatusService {
  name: string;
  detail: string;
  status: "ok" | "warn";
  uptime: string;
}

// Used by ApiDashboard
interface Endpoint {
  method: "GET" | "POST" | "DELETE";
  path: string;
  name: string;
  requests: string;
  p50: string;
  p95: string;
  errorRate: string;
  errorLevel: "ok" | "warn" | "bad";
}

// Used by ApiDashboardV3 — superset of Endpoint
interface EndpointV3 extends Endpoint {
  sparkline: number[];           // normalized 0–1 values, one per time bucket
  trend: string;                 // e.g. "↑ 14%"
  trendDir: "up" | "down" | "neutral";
  histogram: {
    label: string;               // e.g. "0–50ms"
    count: number;
    pct: number;                 // 0–1, relative to tallest bucket
  }[];
}

interface ChartPoint {
  hour: string;                  // x-axis label, e.g. "14:00"
  success: number;
  error: number;
}
```

### Time window query param

When the user switches time ranges, the component appends `?window=<value>` to `apiUrl`. Your endpoint should handle:

| Value | Meaning |
|-------|---------|
| `1h`  | Last hour |
| `24h` | Last 24 hours (default) |
| `7d`  | Last 7 days |
| `30d` | Last 30 days |

---

## Choosing Between Components

| | `ApiDashboard` | `ApiDashboardV3` |
|---|---|---|
| Primary focus | Charts + overview | Endpoint table |
| Sparklines | No | Yes |
| Latency histogram | No | Yes (expandable row) |
| Pagination | No | Yes |
| Extra API fields | No | `sparkline`, `trend`, `histogram` |
| Best for | Executive dashboards | Engineering teams |

---

## Storybook

Browse live component demos at **https://tstephx.github.io/api-dashboard/**

Enter your own `apiUrl` in the Controls panel to see live data.
