import { useEffect, useState, useId, CSSProperties } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type DeltaDir = "up" | "down" | "neutral";
type ServiceStatus = "ok" | "warn";
type ErrorLevel = "ok" | "warn" | "bad";
type HttpMethod = "GET" | "POST" | "DELETE" | "PATCH" | "PUT";

interface StatCard {
  label: string;
  value: string;
  delta: string;
  deltaDir: DeltaDir;
  deltaPositive: boolean;
  sub: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

interface Service {
  name: string;
  detail: string;
  status: ServiceStatus;
  uptime: string;
}

interface Endpoint {
  method: HttpMethod;
  path: string;
  name: string;
  requests: string;
  p50: string;
  p95: string;
  errorRate: string;
  errorLevel: ErrorLevel;
  /** Normalized 0–1 values, one per time bucket (e.g. 12 points for 24h) */
  sparkline: number[];
  /** e.g. "↑ 14%" */
  trend: string;
  trendDir: DeltaDir;
  /**
   * Latency histogram buckets for the expand panel.
   * Each bucket: { label: "0–50ms", count: 412, pct: 0.42 }
   * pct is 0–1 relative to the tallest bucket.
   */
  histogram: { label: string; count: number; pct: number }[];
}

interface StatusBreakdown {
  label: string;
  pct: number;
  color: string;
}

interface DashboardData {
  /** Plain text only */
  alert?: string;
  stats: StatCard[];
  services: Service[];
  endpoints: Endpoint[];
  statusBreakdown: StatusBreakdown[];
  totalEndpoints: number;
}

// ── Design tokens ──────────────────────────────────────────────────────────

const t = {
  bgBase:      "#f4f5f7",
  bgSurface:   "#ffffff",
  bgElevated:  "#f8f9fb",
  bgHover:     "#f0f1f5",
  border:      "#e2e5ec",
  borderSubtle:"#eceef3",

  textPrimary:   "#111827",
  textSecondary: "#4b5563",
  textMuted:     "#9ca3af",
  textCode:      "#4f46e5",

  accent:      "#4f46e5",
  accentLight: "#eef2ff",
  accentMid:   "#c7d2fe",

  success:    "#059669",
  successDim: "#d1fae5",
  warning:    "#d97706",
  warningDim: "#fef3c7",
  danger:     "#dc2626",
  dangerDim:  "#fee2e2",

  shadowSm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
  rSm: "6px",
  rMd: "10px",
} as const;

// ── Fetch hook ─────────────────────────────────────────────────────────────

function useDashboard(apiUrl: string, timeWindow: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${apiUrl}?window=${encodeURIComponent(timeWindow)}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DashboardData>; })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiUrl, timeWindow]);

  return { data, loading, error };
}

// ── Sparkline ──────────────────────────────────────────────────────────────

const sparkColor: Record<ErrorLevel, string> = {
  ok:   t.accent,
  warn: t.warning,
  bad:  t.danger,
};

function Sparkline({ values, level }: { values: number[]; level: ErrorLevel }) {
  const W = 72, H = 28, pad = 2;
  const color = sparkColor[level];

  if (values.length < 2) return <svg width={W} height={H} />;

  const xs = values.map((_, i) => pad + (i / (values.length - 1)) * (W - pad * 2));
  const ys = values.map((v) => pad + (1 - v) * (H - pad * 2 - 4));

  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const area = `M${xs[0]},${ys[0]} ` +
    xs.slice(1).map((x, i) => `L${x},${ys[i + 1]}`).join(" ") +
    ` L${xs[xs.length - 1]},${H} L${xs[0]},${H} Z`;

  const uid = useId().replace(/:/g, "");
  const gradId = `${uid}-sg`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
    </svg>
  );
}

// ── Donut ──────────────────────────────────────────────────────────────────

function Donut({ slices }: { slices: StatusBreakdown[] }) {
  const r = 28, cx = 36, cy = 36, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      {slices.map((s, i) => {
        const dash = (s.pct / 100) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill={t.textPrimary}
            fontSize="11" fontWeight="600" fontFamily="'JetBrains Mono',monospace">
        {slices[0]?.pct.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 7} textAnchor="middle" fill={t.textMuted}
            fontSize="7" fontFamily="'JetBrains Mono',monospace">
        success
      </text>
    </svg>
  );
}

// ── Latency Histogram ──────────────────────────────────────────────────────

function LatencyHistogram({ ep }: { ep: Endpoint }) {
  return (
    <div style={{
      gridColumn: "1 / -1",
      borderTop: `1px solid ${t.borderSubtle}`,
      background: t.bgElevated,
      padding: "16px 20px 20px",
    }}>
      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>

        {/* Histogram bars */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: t.textSecondary,
                        marginBottom: 12, textTransform: "uppercase",
                        letterSpacing: "0.06em", fontSize: "10px" }}>
            Latency distribution · {ep.name}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 72 }}>
            {ep.histogram.map((b) => (
              <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column",
                                          alignItems: "center", gap: 4, height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div style={{
                    width: "100%",
                    height: `${Math.max(b.pct * 100, 2)}%`,
                    background: b.pct > 0.7
                      ? t.danger
                      : b.pct > 0.4
                        ? t.accent
                        : t.accentMid,
                    borderRadius: "3px 3px 0 0",
                    transition: "height 0.2s",
                    position: "relative",
                  }}>
                    {b.pct > 0.15 && (
                      <span style={{
                        position: "absolute", top: -18, left: "50%",
                        transform: "translateX(-50%)",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9, color: t.textMuted, whiteSpace: "nowrap",
                      }}>
                        {b.count.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, color: t.textMuted,
                  whiteSpace: "nowrap",
                }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
          {/* X-axis baseline */}
          <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 2 }} />
        </div>

        {/* Percentile summary */}
        <div style={{ flexShrink: 0, width: 200 }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: t.textSecondary,
                        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Percentiles
          </div>
          {[
            { label: "P50", value: ep.p50, color: t.success },
            { label: "P95", value: ep.p95, color: t.warning },
          ].map((p) => (
            <div key={p.label} style={{ display: "flex", alignItems: "center",
                                        justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%",
                              background: p.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace",
                               fontSize: 11, color: t.textMuted }}>{p.label}</span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace",
                             fontSize: 12, fontWeight: 500, color: t.textPrimary }}>
                {p.value}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ── Small atoms ────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: HttpMethod }) {
  const s: Record<HttpMethod, CSSProperties> = {
    GET:    { background: "#d1fae5", color: "#065f46" },
    POST:   { background: t.accentLight, color: t.accent },
    DELETE: { background: t.dangerDim, color: t.danger },
    PATCH:  { background: t.warningDim, color: t.warning },
    PUT:    { background: "#ede9fe", color: "#7c3aed" },
  };
  return (
    <span style={{
      ...s[method],
      display: "inline-flex", alignItems: "center",
      padding: "2px 6px", borderRadius: "4px",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "9px", fontWeight: 600, marginRight: "7px", flexShrink: 0,
    }}>
      {method}
    </span>
  );
}

function ErrorBadge({ rate, level }: { rate: string; level: ErrorLevel }) {
  const s: Record<ErrorLevel, CSSProperties> = {
    ok:   { background: t.successDim, color: t.success },
    warn: { background: t.warningDim, color: t.warning },
    bad:  { background: t.dangerDim,  color: t.danger },
  };
  return (
    <span style={{
      ...s[level],
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "10px", fontWeight: 600,
      padding: "2px 6px", borderRadius: "4px",
    }}>
      {rate}
    </span>
  );
}

function ServiceDot({ status }: { status: ServiceStatus }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: status === "ok" ? t.success : t.warning,
      boxShadow: `0 0 0 3px ${status === "ok" ? t.successDim : t.warningDim}`,
    }} />
  );
}

function Skeleton({ w, h }: { w: string | number; h: string | number }) {
  return (
    <span style={{
      display: "inline-block", width: w, height: h,
      background: `linear-gradient(90deg,${t.bgElevated} 25%,${t.bgHover} 50%,${t.bgElevated} 75%)`,
      backgroundSize: "200% 100%", borderRadius: t.rSm,
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface ApiDashboardV3Props {
  apiUrl: string;
  title?: string;
  pageSize?: number;
}

export function ApiDashboardV3({
  apiUrl,
  title = "API Overview",
  pageSize = 7,
}: ApiDashboardV3Props) {
  const [activeWindow, setActiveWindow] = useState("24h");
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const toggleExpand = (path: string) =>
    setExpandedPath((prev) => (prev === path ? null : path));

  const { data, loading, error } = useDashboard(apiUrl, activeWindow);

  // Reset to page 1 when data refreshes
  useEffect(() => { setPage(1); setAlertDismissed(false); }, [activeWindow]);

  const endpoints = data?.endpoints ?? [];
  const totalPages = Math.max(1, Math.ceil(endpoints.length / pageSize));
  const visibleEndpoints = endpoints.slice((page - 1) * pageSize, page * pageSize);

  const card: CSSProperties = {
    background: t.bgSurface,
    border: `1px solid ${t.border}`,
    borderRadius: t.rMd,
    boxShadow: t.shadowSm,
  };

  const monoR: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px", color: t.textSecondary, textAlign: "right",
    padding: "12px 6px",
  };

  // Column grid: endpoint | sparkline | requests | p50 | p95 | error | trend
  const colGrid = "1fr 88px 90px 72px 80px 72px 60px";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bgBase,
                  fontFamily: "'Inter', sans-serif", color: t.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes shimmer { to { background-position: -200% 0; } }
      `}</style>

      {/* ── Sidebar ── */}
      <nav style={{ width: 220, flexShrink: 0, background: t.bgSurface,
                    borderRight: `1px solid ${t.border}`, display: "flex",
                    flexDirection: "column", padding: "20px 0",
                    position: "sticky", top: 0, height: "100vh", boxShadow: t.shadowSm }}>

        <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "center", gap: 10,
                      borderBottom: `1px solid ${t.borderSubtle}`, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, background: t.accent, borderRadius: t.rSm,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, color: "white", boxShadow: "0 2px 8px rgba(79,70,229,0.2)" }}>
            ⬡
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Nexus API</span>
          <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                         background: t.accentLight, color: t.accent, padding: "2px 5px",
                         borderRadius: 4, border: `1px solid ${t.accentMid}` }}>v2</span>
        </div>

        {[
          { label: "Monitor", items: [
            { icon: "▣", text: "Overview", active: true },
            { icon: "⌁", text: "Requests" },
            { icon: "⚡", text: "Logs", badge: "3" },
            { icon: "◎", text: "Alerts" },
          ]},
          { label: "Manage", items: [
            { icon: "⊞", text: "Endpoints" },
            { icon: "◈", text: "API Keys" },
            { icon: "⬡", text: "Webhooks" },
            { icon: "⊙", text: "Rate Limits" },
          ]},
          { label: "Account", items: [
            { icon: "⊕", text: "Settings" },
            { icon: "⊘", text: "Billing" },
          ]},
        ].map((section) => (
          <div key={section.label} style={{ padding: "0 10px", marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted,
                          textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 10px 5px" }}>
              {section.label}
            </div>
            {section.items.map((item) => (
              <a key={item.text} href="#" style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "7px 10px", borderRadius: t.rSm, fontSize: 13,
                textDecoration: "none", marginBottom: 1,
                ...("active" in item && item.active
                  ? { background: t.accentLight, color: t.accent, fontWeight: 600 }
                  : { color: t.textSecondary }),
              }}>
                <span style={{ fontSize: 12, width: 15, textAlign: "center" }}>{item.icon}</span>
                {item.text}
                {"badge" in item && item.badge && (
                  <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace",
                                 fontSize: 10, background: t.dangerDim, color: t.danger,
                                 padding: "1px 6px", borderRadius: 10, fontWeight: 500 }}>
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        ))}

        <div style={{ marginTop: "auto", padding: "16px 10px", borderTop: `1px solid ${t.borderSubtle}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px",
                        background: t.bgElevated, border: `1px solid ${t.border}`,
                        borderRadius: t.rSm, cursor: "pointer" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%",
                          background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 700, color: "white", flexShrink: 0 }}>
              TS
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Taylor's Workspace</div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>Pro · 2.1M / 5M req</div>
            </div>
            <span style={{ marginLeft: "auto", color: t.textMuted, fontSize: 10 }}>⌃</span>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "28px 36px", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em" }}>{title}</h1>
            <p style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · All environments
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", background: t.bgSurface, border: `1px solid ${t.border}`,
                          borderRadius: t.rSm, overflow: "hidden", boxShadow: t.shadowSm }}>
              {["1h","6h","24h","7d","30d"].map((w) => (
                <button key={w} onClick={() => setActiveWindow(w)} style={{
                  padding: "6px 11px", cursor: "pointer", border: "none",
                  borderRight: `1px solid ${t.borderSubtle}`,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  ...(activeWindow === w
                    ? { background: t.accentLight, color: t.accent, fontWeight: 600 }
                    : { background: "transparent", color: t.textSecondary }),
                }}>{w}</button>
              ))}
            </div>
            {[{ label: "⇩ Export", primary: false }, { label: "+ New Key", primary: true }].map((b) => (
              <button key={b.label} style={{
                padding: "6px 13px", borderRadius: t.rSm, fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "'Inter', sans-serif", border: "none",
                ...(b.primary
                  ? { background: t.accent, color: "white", boxShadow: "0 2px 8px rgba(79,70,229,0.2)" }
                  : { background: t.bgSurface, color: t.textSecondary,
                      border: `1px solid ${t.border}`, boxShadow: t.shadowSm }),
              }}>{b.label}</button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ ...card, padding: "12px 16px", marginBottom: 20,
                        borderLeft: `3px solid ${t.danger}`, background: t.dangerDim,
                        display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
            ⚠ Failed to load: <strong>{error}</strong>
          </div>
        )}

        {/* Alert */}
        {!alertDismissed && data?.alert && (
          <div style={{ display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 14px", background: t.warningDim,
                        border: `1px solid #fcd34d`, borderLeft: `3px solid ${t.warning}`,
                        borderRadius: t.rSm, marginBottom: 20, fontSize: 12 }}>
            <span>⚠</span>
            <span>{data.alert}</span>
            <button onClick={() => setAlertDismissed(true)}
                    style={{ marginLeft: "auto", background: "none", border: "none",
                             color: t.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ ...card, padding: 16, height: 106 }}><Skeleton w="55%" h={10} /></div>
              ))
            : data?.stats.map((s) => (
                <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted,
                                   textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {s.label}
                    </span>
                    <div style={{ width: 28, height: 28, borderRadius: t.rSm, display: "flex",
                                  alignItems: "center", justifyContent: "center",
                                  background: s.iconBg, color: s.iconColor, fontSize: 12 }}>
                      {s.icon}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 500,
                                letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>
                    {s.value}
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                    padding: "2px 6px", borderRadius: 4,
                    ...(s.deltaDir === "neutral"
                      ? { background: "#f3f4f6", color: t.textMuted }
                      : s.deltaPositive
                        ? { background: t.successDim, color: t.success }
                        : { background: t.dangerDim, color: t.danger }),
                  }}>{s.delta}</span>
                  <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 5 }}>{s.sub}</span>
                </div>
              ))
          }
        </div>

        {/* Status + Donut */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ ...card, padding: "14px 16px", height: 62 }}><Skeleton w="70%" h={10} /></div>
                ))
              : data?.services.map((svc) => (
                  <div key={svc.name} style={{ ...card, padding: "14px 16px",
                                               display: "flex", alignItems: "center", gap: 10 }}>
                    <ServiceDot status={svc.status} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{svc.name}</div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{svc.detail}</div>
                    </div>
                    <span style={{
                      marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11, fontWeight: 600, padding: "3px 7px", borderRadius: 5,
                      ...(svc.status === "ok"
                        ? { background: t.successDim, color: t.success }
                        : { background: t.warningDim, color: t.warning }),
                    }}>{svc.uptime}</span>
                  </div>
                ))
            }
          </div>

          {/* Donut card */}
          <div style={{ ...card, padding: "16px 18px", width: 220 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Status Codes</div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 14 }}>Last {activeWindow}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {loading
                ? <Skeleton w={72} h={72} />
                : data?.statusBreakdown && <Donut slices={data.statusBreakdown} />
              }
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {(data?.statusBreakdown ?? []).map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ color: t.textSecondary, minWidth: 24,
                                   fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace",
                                   color: t.textMuted }}>{s.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Endpoint table ── */}
        <div style={{ ...card, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 20px", borderBottom: `1px solid ${t.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Endpoints</div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                {loading ? "Loading…" : `${data?.totalEndpoints ?? 0} active · sorted by request volume`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 12px", background: t.bgElevated,
                            border: `1px solid ${t.border}`, borderRadius: t.rSm,
                            fontSize: 12, color: t.textMuted, width: 180 }}>
                <span>🔍</span><span>Filter endpoints…</span>
              </div>
              {["↕ Sort", "⊞ Columns"].map((label) => (
                <button key={label} style={{
                  padding: "6px 12px", background: t.bgSurface, border: `1px solid ${t.border}`,
                  borderRadius: t.rSm, fontSize: 12, color: t.textSecondary, cursor: "pointer",
                  boxShadow: t.shadowSm, fontFamily: "'Inter', sans-serif",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: colGrid,
            padding: "8px 20px", background: t.bgElevated,
            borderBottom: `1px solid ${t.border}`,
            fontSize: 10, fontWeight: 600, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            {["Endpoint", `${activeWindow} trend`, "Requests", "P50", "P95", "Errors", "Δ req"].map((h, i) => (
              <span key={h} style={{ padding: "0 6px", textAlign: i >= 2 ? "right" : "left" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "14px 26px", borderBottom: `1px solid ${t.borderSubtle}` }}>
                  <Skeleton w="60%" h={10} />
                </div>
              ))
            : visibleEndpoints.map((ep) => {
                const isExpanded = expandedPath === ep.path;
                return (
                  <div key={`${ep.method}-${ep.path}`} style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                    {/* Clickable row */}
                    <div
                      onClick={() => toggleExpand(ep.path)}
                      style={{
                        display: "grid", gridTemplateColumns: colGrid,
                        cursor: "pointer",
                        background: isExpanded ? t.accentLight : "transparent",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpanded) e.currentTarget.style.background = t.bgHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Endpoint info — chevron indicates expand */}
                      <div style={{ padding: "12px 6px 12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9, color: t.textMuted, marginRight: 6,
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            transition: "transform 0.15s", display: "inline-block",
                            flexShrink: 0,
                          }}>▶</span>
                          <MethodBadge method={ep.method} />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace",
                                         fontSize: 11, fontWeight: 500, color: t.textCode }}>
                            {ep.path}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2, paddingLeft: 20 }}>
                          {ep.name}
                        </div>
                      </div>

                      {/* Sparkline */}
                      <div style={{ padding: "12px 6px", display: "flex", alignItems: "center" }}>
                        <Sparkline values={ep.sparkline} level={ep.errorLevel} />
                      </div>

                      {/* Numeric cols */}
                      <div style={monoR}>{ep.requests}</div>
                      <div style={monoR}>{ep.p50}</div>
                      <div style={monoR}>{ep.p95}</div>

                      {/* Error badge */}
                      <div style={{ padding: "12px 6px", textAlign: "right" }}>
                        <ErrorBadge rate={ep.errorRate} level={ep.errorLevel} />
                      </div>

                      {/* Trend */}
                      <div style={{
                        padding: "12px 20px 12px 6px", textAlign: "right",
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                        ...(ep.trendDir === "up"
                          ? { color: t.success }
                          : ep.trendDir === "down"
                            ? { color: t.danger }
                            : { color: t.textMuted }),
                      }}>
                        {ep.trend}
                      </div>
                    </div>

                    {/* Expand panel — latency histogram */}
                    {isExpanded && <LatencyHistogram ep={ep} />}
                  </div>
                );
              })
          }

          {/* Pagination footer */}
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}`,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        fontSize: 11, color: t.textMuted, background: t.bgElevated }}>
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, endpoints.length)}–
              {Math.min(page * pageSize, endpoints.length)} of {endpoints.length} endpoints
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        padding: "3px 9px", border: `1px solid ${t.border}`, borderRadius: 4,
                        background: t.bgSurface, fontSize: 11, cursor: page === 1 ? "default" : "pointer",
                        color: page === 1 ? t.textMuted : t.textSecondary,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} style={{
                  padding: "3px 9px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${t.border}`,
                  ...(p === page
                    ? { background: t.accentLight, color: t.accent, borderColor: t.accentMid, fontWeight: 600 }
                    : { background: t.bgSurface, color: t.textSecondary }),
                }}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{
                        padding: "3px 9px", border: `1px solid ${t.border}`, borderRadius: 4,
                        background: t.bgSurface, fontSize: 11,
                        cursor: page === totalPages ? "default" : "pointer",
                        color: page === totalPages ? t.textMuted : t.textSecondary,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>→</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Usage ──────────────────────────────────────────────────────────────────
//
//   <ApiDashboardV3 apiUrl="/api/dashboard" pageSize={10} />
//
// ── Expected JSON shape ────────────────────────────────────────────────────
//
//   {
//     "alert": "Rate limit warning: POST /v2/embeddings at 84% quota",
//     "totalEndpoints": 18,
//     "stats": [ ... ],          // same shape as ApiDashboard.tsx
//     "services": [ ... ],       // same shape as ApiDashboard.tsx
//     "statusBreakdown": [ ... ],// same shape as ApiDashboard.tsx
//     "endpoints": [
//       {
//         "method": "POST",
//         "path": "/v2/chat/completions",
//         "name": "Chat completions",
//         "requests": "841,204",
//         "p50": "138ms", "p95": "412ms",
//         "errorRate": "0.3%", "errorLevel": "ok",
//         "trend": "↑ 14%", "trendDir": "up",
//         "sparkline": [0.4, 0.45, 0.5, 0.48, 0.6, 0.62, 0.7, 0.68, 0.8, 0.82, 0.9, 1.0],
//         "histogram": [
//           { "label": "0–50ms",   "count": 412180, "pct": 0.49 },
//           { "label": "50–100ms", "count": 841204, "pct": 1.0  },
//           { "label": "100–200ms","count": 310420, "pct": 0.37 },
//           { "label": "200–500ms","count": 98310,  "pct": 0.12 },
//           { "label": "500ms–1s", "count": 18200,  "pct": 0.02 },
//           { "label": ">1s",      "count": 4100,   "pct": 0.005}
//         ]
//       }
//     ]
//   }
//
// sparkline: 0–1 normalized values relative to the endpoint's own peak.
// histogram.pct: 0–1 relative to the tallest bucket (for bar height scaling).
