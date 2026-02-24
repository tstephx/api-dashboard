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

---

## Use Cases

### General

**Internal API health page**
Drop `ApiDashboard` into any internal Next.js or Vite app to give your team a live view of request volume, error rates, and latency — no third-party dashboarding tool needed.

**Public status page for an API product**
Render `ApiDashboard` on a public-facing route (e.g. `status.yourdomain.com`) to show customers that your API is healthy. Point `apiUrl` at a read-only endpoint that aggregates your observability data.

**CI/CD post-deploy health check UI**
After a deployment, redirect engineers to a dashboard view that auto-loads with `?window=1h` — spotting regressions in p95 latency or error rate immediately after a release.

**Multi-tenant SaaS — per-customer usage view**
Mount the dashboard on a customer-scoped route (`/customers/:id/usage`). Pass a token-authenticated `apiUrl` so each customer sees only their own traffic.

**Engineering on-call runbook companion**
Embed `ApiDashboardV3` in an internal runbook tool so on-call engineers can see sparklines and expand latency histograms for any endpoint without leaving the incident page.

---

### Projects in `~/Dev/`

**`book-mcp-server` — MCP server monitoring**
The book MCP server exposes tools over HTTP. Use `ApiDashboardV3` to monitor which tools are called most, latency per tool, and error rates. Each MCP tool maps to an endpoint row — the sparkline shows call frequency over the last 24h. Expand a row to see latency histogram when a tool starts timing out.

```tsx
<ApiDashboardV3
  apiUrl="http://localhost:8000/admin/dashboard"
  title="Book MCP Server"
  pageSize={15}
/>
```

**`book-ingestion-python` — batch pipeline observability**
The ingestion pipeline processes books through multiple stages (fetch → parse → embed → store). Use `ApiDashboard` to track throughput per stage as a "request volume" chart, p95 processing time per stage as latency, and failed ingestions as error rate.

```tsx
<ApiDashboard
  apiUrl="http://localhost:8001/pipeline/stats"
  title="Book Ingestion Pipeline"
/>
```

**`my-mcp-portfolio` — portfolio MCP tool usage**
You have 56–65 tools in the portfolio MCP server. `ApiDashboardV3` is a natural fit — one row per tool, sparkline showing how often each is called, expandable histogram for response time distribution. Helps identify which tools are slow or unused.

```tsx
<ApiDashboardV3
  apiUrl="http://localhost:9000/metrics/dashboard"
  title="Portfolio MCP"
  pageSize={20}
/>
```

**`whatbox` / `whatbox-live` — remote server task monitoring**
Whatbox is a shared hosting environment running download/seed tasks. Use `ApiDashboard` to surface task queue metrics — jobs queued, jobs completed, error rate on failed downloads — as if they were API endpoints.

```tsx
<ApiDashboard
  apiUrl="https://cucumber.whatbox.ca/api/dashboard"
  title="Whatbox Task Monitor"
/>
```

**`scripts/` — CLI tool invocation tracking**
If you wrap personal scripts as HTTP calls (e.g. via a local FastAPI shim), use `ApiDashboardV3` to see which scripts run most, how long they take, and when they fail. Good for scripts that run on a schedule.

**`_Lab` research projects — LLM call monitoring**
Research projects typically make heavy use of the Claude API. Use `ApiDashboard` to track token usage over time (as a volume chart), latency per model call, and error/retry rates — all without exporting to an external tool.

```tsx
<ApiDashboard
  apiUrl="http://localhost:7000/llm/stats"
  title="LLM Call Monitor"
/>
```

**`motley-fool-scraper` — scraper health dashboard**
Web scrapers hit many endpoints. Use `ApiDashboardV3` with one row per target URL — sparkline shows crawl frequency, error rate shows how often requests are blocked or return non-200s, histogram shows response time distribution per target.

**`portfolio-analysis` — financial data API monitoring**
If this project hits external financial data APIs (market data, earnings, etc.), use `ApiDashboard` to track call volume against rate limits, p95 response time from external providers, and error rates from paid APIs where failures cost money.

---

## Storybook

Browse live component demos at **https://tstephx.github.io/api-dashboard/**

Enter your own `apiUrl` in the Controls panel to see live data.
