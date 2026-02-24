# API Dashboard

A design exploration and React component library for API usage monitoring dashboards.

## What's in here

### Designs (`/designs`)

Three HTML mockups — open any in a browser to preview.

| File | Description |
|---|---|
| `design-draft.html` | Dark mode — developer tool aesthetic, indigo accent |
| `design-draft-v2.html` | Light mode — warm slate, shadow-based depth |
| `design-draft-v3.html` | Light mode, table-first — inline sparklines per endpoint |

### Components (`/components`)

| File | Description |
|---|---|
| `ApiDashboard.tsx` | Light mode dashboard with SVG area chart and endpoint table |
| `ApiDashboardV3.tsx` | Table-first with inline sparklines, expandable latency histogram, pagination |

## Usage

```tsx
import { ApiDashboard } from "./components/ApiDashboard";
import { ApiDashboardV3 } from "./components/ApiDashboardV3";

// Area chart variant
<ApiDashboard apiUrl="/api/dashboard" title="API Overview" />

// Sparkline table variant
<ApiDashboardV3 apiUrl="/api/dashboard" pageSize={10} />
```

Both components fetch from `apiUrl?window=<timeWindow>` and re-fetch when the time window selector changes.

## API response shape

```json
{
  "alert": "Optional plain-text alert message",
  "totalEndpoints": 18,
  "stats": [
    {
      "label": "Total Requests", "value": "2.14M",
      "delta": "↑ 12.4%", "deltaDirection": "up", "deltaPositive": true,
      "sub": "vs yesterday", "icon": "⌁", "iconBg": "#eef2ff", "iconColor": "#4f46e5"
    }
  ],
  "services": [
    { "name": "API Gateway", "detail": "All regions operational", "status": "ok", "uptime": "99.98%" }
  ],
  "statusBreakdown": [
    { "label": "2xx", "pct": 94.2, "color": "#059669" },
    { "label": "4xx", "pct": 4.5,  "color": "#4f46e5" },
    { "label": "5xx", "pct": 1.3,  "color": "#dc2626" }
  ],
  "chartPoints": [
    { "hour": "00:00", "success": 41200, "error": 310 }
  ],
  "endpoints": [
    {
      "method": "POST", "path": "/v2/chat/completions", "name": "Chat completions",
      "requests": "841,204", "p50": "138ms", "p95": "412ms",
      "errorRate": "0.3%", "errorLevel": "ok",
      "trend": "↑ 14%", "trendDir": "up",
      "sparkline": [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      "histogram": [
        { "label": "0–50ms",    "count": 412180, "pct": 0.49 },
        { "label": "50–100ms",  "count": 841204, "pct": 1.0  },
        { "label": "100–200ms", "count": 310420, "pct": 0.37 },
        { "label": "200–500ms", "count": 98310,  "pct": 0.12 },
        { "label": ">500ms",    "count": 22300,  "pct": 0.03 }
      ]
    }
  ]
}
```

`sparkline` values are 0–1 normalized relative to the endpoint's own peak.
`histogram.pct` is 0–1 relative to the tallest bucket.

## Design system

Both components use inline styles with a shared token set — no CSS framework or runtime dependency required. Fonts load from Google Fonts (Inter + JetBrains Mono).

| Token | Value |
|---|---|
| Accent | `#4f46e5` (indigo) |
| Success | `#059669` |
| Warning | `#d97706` |
| Danger | `#dc2626` |
| Base background | `#f4f5f7` |
| Surface | `#ffffff` |
