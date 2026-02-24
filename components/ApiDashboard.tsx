import { useEffect, useState, useId, CSSProperties } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string;
  delta: string;
  deltaDirection: "up" | "down" | "neutral";
  deltaPositive: boolean; // true = green, false = red
  sub: string;
  iconColor: string;
  iconBg: string;
  icon: string;
}

interface StatusService {
  name: string;
  detail: string;
  status: "ok" | "warn";
  uptime: string;
}

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

interface ChartPoint {
  hour: string;
  success: number;
  error: number;
}

interface DashboardData {
  stats: StatCard[];
  services: StatusService[];
  endpoints: Endpoint[];
  chartPoints: ChartPoint[];
  statusCodeBreakdown: { label: string; pct: number; color: string }[];
  /** Plain text alert message (no HTML) */
  alert?: string;
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

  success:     "#059669",
  successDim:  "#d1fae5",
  warning:     "#d97706",
  warningDim:  "#fef3c7",
  danger:      "#dc2626",
  dangerDim:   "#fee2e2",

  shadowSm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",

  radiusSm: "6px",
  radiusMd: "10px",
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

    const url = `${apiUrl}?window=${encodeURIComponent(timeWindow)}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DashboardData>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [apiUrl, timeWindow]);

  return { data, loading, error };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: Endpoint["method"] }) {
  const styles: Record<string, CSSProperties> = {
    GET:    { background: "#d1fae5", color: "#065f46" },
    POST:   { background: t.accentLight, color: t.accent },
    DELETE: { background: t.dangerDim, color: t.danger },
  };
  return (
    <span style={{
      ...styles[method],
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 7px",
      borderRadius: "4px",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "10px",
      fontWeight: 600,
      marginRight: "8px",
    }}>
      {method}
    </span>
  );
}

function ErrorRateBadge({ rate, level }: { rate: string; level: Endpoint["errorLevel"] }) {
  const colors: Record<string, CSSProperties> = {
    ok:   { color: t.success, background: t.successDim },
    warn: { color: t.warning, background: t.warningDim },
    bad:  { color: t.danger,  background: t.dangerDim },
  };
  return (
    <span style={{
      ...colors[level],
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      fontWeight: 600,
      padding: "2px 6px",
      borderRadius: "4px",
    }}>
      {rate}
    </span>
  );
}

function StatusDot({ status }: { status: "ok" | "warn" }) {
  const color    = status === "ok" ? t.success : t.warning;
  const dimColor = status === "ok" ? t.successDim : t.warningDim;
  return (
    <span style={{
      display: "inline-block",
      width: "8px", height: "8px",
      borderRadius: "50%",
      background: color,
      boxShadow: `0 0 0 3px ${dimColor}`,
      flexShrink: 0,
    }} />
  );
}

// Minimal SVG area chart — no library dependency
function RequestChart({ points }: { points: ChartPoint[] }) {
  if (!points || points.length < 2) {
    const W2 = 560, H2 = 160;
    return <svg width="100%" height={H2} viewBox={`0 0 ${W2} ${H2}`} />;
  }
  const uid = useId().replace(/:/g, "");
  const gradId = `${uid}-area`;
  const W = 560, H = 160, padL = 20, padB = 20, padT = 10;
  const chartW = W - padL;
  const chartH = H - padB - padT;
  const maxVal = Math.max(...points.map((p) => Math.max(p.success, p.error)), 1) * 1.1;

  const px = (i: number) => padL + (i / (points.length - 1)) * chartW;
  const py = (v: number) => padT + (1 - v / maxVal) * chartH;

  const successPts = points.map((p, i) => `${px(i)},${py(p.success)}`).join(" ");
  const errorPts   = points.map((p, i) => `${px(i)},${py(p.error)}`).join(" ");

  const successArea =
    `M${px(0)},${py(points[0].success)} ` +
    points.slice(1).map((p, i) => `L${px(i + 1)},${py(p.success)}`).join(" ") +
    ` L${px(points.length - 1)},${padT + chartH} L${padL},${padT + chartH} Z`;

  const gridYFractions = [0, 0.33, 0.67, 1];
  const gridLabels = [0, 0.33, 0.67, 1].map((f) => {
    const v = Math.round(f * maxVal);
    return v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`;
  });

  const xLabelIndices = points.reduce<number[]>((acc, _, i) => {
    if (i === 0 || i === points.length - 1 || i % Math.floor(points.length / 5) === 0) acc.push(i);
    return acc;
  }, []);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <defs>
        <linearGradient {...{id: gradId}} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.12" />
          <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridYFractions.map((f, i) => {
        const y = padT + (1 - f) * chartH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W} y2={y} stroke={t.border} strokeWidth="1" />
            <text x={0} y={y + 3} fill={t.textMuted} fontSize="9">{gridLabels[i]}</text>
          </g>
        );
      })}

      <path d={successArea} {...{fill: `url(#${gradId})`}} />
      <polyline points={successPts} fill="none" stroke={t.accent} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={errorPts} fill="none" stroke={t.danger} strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round" strokeDasharray="3,2" />

      {xLabelIndices.map((i) => (
        <text key={i} x={px(i)} y={H} fill={t.textMuted} fontSize="9" textAnchor="middle">
          {points[i].hour}
        </text>
      ))}

      <line x1={px(points.length - 1)} y1={padT} x2={px(points.length - 1)} y2={padT + chartH}
            stroke={t.accent} strokeWidth="1" strokeDasharray="3,2" opacity="0.4" />
      <circle cx={px(points.length - 1)} cy={py(points[points.length - 1].success)}
              r="4" fill="white" stroke={t.accent} strokeWidth="2" />
    </svg>
  );
}

function DonutChart({ slices }: { slices: DashboardData["statusCodeBreakdown"] }) {
  const r = 46, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="14" />
      {slices.map((s, i) => {
        const dash = (s.pct / 100) * circumference;
        const gap  = circumference - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fill={t.textPrimary}
            fontSize="16" fontWeight="600" fontFamily="'JetBrains Mono', monospace">
        {slices[0]?.pct.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={t.textMuted}
            fontSize="8" fontFamily="'JetBrains Mono', monospace">
        success
      </text>
    </svg>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function Skeleton({ w, h }: { w: string | number; h: string | number }) {
  return (
    <span style={{
      display: "inline-block",
      width: w, height: h,
      background: `linear-gradient(90deg, ${t.bgElevated} 25%, ${t.bgHover} 50%, ${t.bgElevated} 75%)`,
      backgroundSize: "200% 100%",
      borderRadius: t.radiusSm,
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface ApiDashboardProps {
  /** URL returning DashboardData JSON */
  apiUrl: string;
  /** Page header title */
  title?: string;
}

export function ApiDashboard({ apiUrl, title = "API Overview" }: ApiDashboardProps) {
  const [activeWindow, setActiveWindow] = useState("24h");
  const { data, loading, error } = useDashboard(apiUrl, activeWindow);
  const [alertDismissed, setAlertDismissed] = useState(false);
  useEffect(() => { setAlertDismissed(false); }, [activeWindow]);

  const card: CSSProperties = {
    background: t.bgSurface,
    border: `1px solid ${t.border}`,
    borderRadius: t.radiusMd,
    padding: "20px",
    boxShadow: t.shadowSm,
  };

  const monoSm: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    color: t.textSecondary,
    textAlign: "right",
  };

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: t.bgBase, fontFamily: "'Inter', sans-serif", color: t.textPrimary,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer { to { background-position: -200% 0; } }
      `}</style>

      {/* ── Sidebar ── */}
      <nav style={{
        width: "224px", flexShrink: 0, background: t.bgSurface,
        borderRight: `1px solid ${t.border}`, display: "flex",
        flexDirection: "column", padding: "20px 0",
        position: "sticky", top: 0, height: "100vh", boxShadow: t.shadowSm,
      }}>
        {/* Logo */}
        <div style={{
          padding: "0 20px 20px", display: "flex", alignItems: "center", gap: "10px",
          borderBottom: `1px solid ${t.borderSubtle}`, marginBottom: "16px",
        }}>
          <div style={{
            width: 30, height: 30, background: t.accent, borderRadius: t.radiusSm,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "15px", boxShadow: "0 2px 8px rgba(79,70,229,0.18)", color: "white",
          }}>⬡</div>
          <span style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.01em" }}>Nexus API</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
            background: t.accentLight, color: t.accent, padding: "2px 6px",
            borderRadius: "4px", marginLeft: "auto", border: `1px solid ${t.accentMid}`, fontWeight: 500,
          }}>v2</span>
        </div>

        {/* Nav sections */}
        {[
          { label: "Monitor", items: [
            { icon: "▣", label: "Overview", active: true },
            { icon: "⌁", label: "Requests" },
            { icon: "⚡", label: "Logs", badge: "3" },
            { icon: "◎", label: "Alerts" },
          ]},
          { label: "Manage", items: [
            { icon: "⊞", label: "Endpoints" },
            { icon: "◈", label: "API Keys" },
            { icon: "⬡", label: "Webhooks" },
            { icon: "⊙", label: "Rate Limits" },
          ]},
          { label: "Account", items: [
            { icon: "⊕", label: "Settings" },
            { icon: "⊘", label: "Billing" },
          ]},
        ].map((section) => (
          <div key={section.label} style={{ padding: "0 10px", marginBottom: "4px" }}>
            <div style={{
              fontSize: "10px", fontWeight: 600, color: t.textMuted,
              textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 10px 6px",
            }}>
              {section.label}
            </div>
            {section.items.map((item) => (
              <a key={item.label} href="#" style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "7px 10px", borderRadius: t.radiusSm,
                fontSize: "13px", textDecoration: "none", marginBottom: "1px",
                ...("active" in item && item.active
                  ? { background: t.accentLight, color: t.accent, fontWeight: 600 }
                  : { color: t.textSecondary, fontWeight: 450 }),
              }}>
                <span style={{ width: "16px", textAlign: "center", fontSize: "13px" }}>{item.icon}</span>
                {item.label}
                {"badge" in item && item.badge && (
                  <span style={{
                    marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px", background: t.dangerDim, color: t.danger,
                    padding: "1px 6px", borderRadius: "10px", fontWeight: 500,
                  }}>
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: "auto", padding: "16px 10px", borderTop: `1px solid ${t.borderSubtle}` }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 10px", background: t.bgElevated,
            border: `1px solid ${t.border}`, borderRadius: t.radiusSm, cursor: "pointer",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", fontWeight: 700, color: "white", flexShrink: 0,
            }}>TS</div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>Taylor's Workspace</div>
              <div style={{ fontSize: "10px", color: t.textMuted, marginTop: "1px" }}>Pro · 2.1M / 5M req</div>
            </div>
            <span style={{ marginLeft: "auto", color: t.textMuted, fontSize: "10px" }}>⌃</span>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px", maxWidth: "1100px" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em" }}>{title}</h1>
            <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "3px" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · All environments
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{
              display: "flex", background: t.bgSurface, border: `1px solid ${t.border}`,
              borderRadius: t.radiusSm, overflow: "hidden", boxShadow: t.shadowSm,
            }}>
              {["1h","6h","24h","7d","30d"].map((w) => (
                <button key={w} onClick={() => setActiveWindow(w)} style={{
                  padding: "7px 12px", cursor: "pointer",
                  border: "none", borderRight: `1px solid ${t.borderSubtle}`,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                  ...(activeWindow === w
                    ? { background: t.accentLight, color: t.accent, fontWeight: 600 }
                    : { background: "transparent", color: t.textSecondary }),
                }}>
                  {w}
                </button>
              ))}
            </div>
            <button style={{
              padding: "7px 14px", borderRadius: t.radiusSm, fontSize: "13px", fontWeight: 500,
              cursor: "pointer", background: t.bgSurface, color: t.textSecondary,
              border: `1px solid ${t.border}`, boxShadow: t.shadowSm, fontFamily: "'Inter', sans-serif",
            }}>⇩ Export</button>
            <button style={{
              padding: "7px 14px", borderRadius: t.radiusSm, fontSize: "13px", fontWeight: 500,
              cursor: "pointer", background: t.accent, color: "#fff", border: "none",
              boxShadow: "0 2px 8px rgba(79,70,229,0.18)", fontFamily: "'Inter', sans-serif",
            }}>+ New Key</button>
          </div>
        </div>

        {/* Fetch error state */}
        {error && (
          <div style={{
            ...card, borderLeft: `3px solid ${t.danger}`, background: t.dangerDim,
            marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center",
          }}>
            <span>⚠</span>
            <span style={{ fontSize: "13px" }}>
              Failed to load dashboard: <strong>{error}</strong>
            </span>
          </div>
        )}

        {/* Alert banner — plain text only, no HTML */}
        {!alertDismissed && data?.alert && (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            background: t.warningDim, border: `1px solid #fcd34d`,
            borderLeft: `3px solid ${t.warning}`, borderRadius: t.radiusSm,
            padding: "10px 14px", marginBottom: "20px", fontSize: "12px",
          }}>
            <span>⚠</span>
            <span>{data.alert}</span>
            <button onClick={() => setAlertDismissed(true)} style={{
              marginLeft: "auto", background: "none", border: "none",
              color: t.textMuted, cursor: "pointer", fontSize: "16px", lineHeight: 1,
            }}>×</button>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ ...card, height: "110px" }}><Skeleton w="60%" h={10} /></div>
              ))
            : data?.stats.map((s) => (
                <div key={s.label} style={card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: t.textMuted,
                                   textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {s.label}
                    </span>
                    <div style={{ width: 30, height: 30, borderRadius: t.radiusSm, display: "flex",
                                  alignItems: "center", justifyContent: "center",
                                  background: s.iconBg, color: s.iconColor, fontSize: "13px" }}>
                      {s.icon}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "28px",
                                fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "8px" }}>
                    {s.value}
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 600,
                    padding: "2px 6px", borderRadius: "4px",
                    ...(s.deltaDirection === "neutral"
                      ? { background: "#f3f4f6", color: t.textMuted }
                      : s.deltaPositive
                        ? { background: t.successDim, color: t.success }
                        : { background: t.dangerDim, color: t.danger }),
                  }}>{s.delta}</span>
                  <span style={{ fontSize: "11px", color: t.textMuted, marginLeft: "4px" }}>{s.sub}</span>
                </div>
              ))
          }
        </div>

        {/* Status services */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ flex: 1, ...card, height: "62px" }}><Skeleton w="80%" h={10} /></div>
              ))
            : data?.services.map((svc) => (
                <div key={svc.name} style={{ flex: 1, ...card, display: "flex", alignItems: "center", gap: "10px" }}>
                  <StatusDot status={svc.status} />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600 }}>{svc.name}</div>
                    <div style={{ color: t.textMuted, fontSize: "11px" }}>{svc.detail}</div>
                  </div>
                  <span style={{
                    marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px", fontWeight: 600, padding: "3px 8px", borderRadius: "5px",
                    ...(svc.status === "ok"
                      ? { color: t.success, background: t.successDim }
                      : { color: t.warning, background: t.warningDim }),
                  }}>{svc.uptime}</span>
                </div>
              ))
          }
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>Request Volume</div>
                <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>
                  Requests per hour · last {activeWindow}
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                {[{ color: t.accent, label: "2xx" }, { color: t.danger, label: "4xx/5xx" }].map((l) => (
                  <div key={l.label} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    fontSize: "11px", color: t.textSecondary, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
            {loading
              ? <Skeleton w="100%" h={160} />
              : data?.chartPoints && data.chartPoints.length >= 2
              ? <RequestChart points={data.chartPoints} />
              : <div style={{ height: 160, display: "flex", alignItems: "center",
                              justifyContent: "center", color: t.textMuted, fontSize: 12 }}>
                  No data available
                </div>
            }
          </div>

          <div style={card}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Status Codes</div>
              <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>
                Last {activeWindow} distribution
              </div>
            </div>
            {loading
              ? <div style={{ display: "flex", justifyContent: "center" }}><Skeleton w={120} h={120} /></div>
              : data?.statusCodeBreakdown && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                  <DonutChart slices={data.statusCodeBreakdown} />
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {data.statusCodeBreakdown.map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                        <span style={{ color: t.textSecondary, minWidth: "28px",
                                       fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
                          {s.label}
                        </span>
                        <div style={{ flex: 1, height: "4px", background: t.bgElevated,
                                      border: `1px solid ${t.borderSubtle}`, borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: "2px" }} />
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
                                       color: t.textMuted, minWidth: "36px", textAlign: "right" }}>
                          {s.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          </div>
        </div>

        {/* Endpoints table */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Top Endpoints</div>
              <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>
                By request volume · last {activeWindow}
              </div>
            </div>
            <button style={{
              padding: "7px 12px", background: t.bgSurface, border: `1px solid ${t.border}`,
              borderRadius: t.radiusSm, fontSize: "11px", color: t.textSecondary,
              cursor: "pointer", boxShadow: t.shadowSm, fontFamily: "'Inter', sans-serif",
            }}>View all →</button>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 100px 90px 90px 90px",
            gap: "16px", alignItems: "center",
            padding: "0 12px 8px", borderBottom: `1px solid ${t.border}`,
            fontSize: "10px", fontWeight: 600, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            <span>Endpoint</span>
            <span style={{ textAlign: "right" }}>Requests</span>
            <span style={{ textAlign: "right" }}>P50</span>
            <span style={{ textAlign: "right" }}>P95</span>
            <span style={{ textAlign: "right" }}>Error %</span>
          </div>

          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "12px" }}><Skeleton w="70%" h={10} /></div>
              ))
            : data?.endpoints.map((ep) => (
                <div key={`${ep.method}-${ep.path}`} style={{
                  display: "grid", gridTemplateColumns: "1fr 100px 90px 90px 90px",
                  gap: "16px", alignItems: "center", padding: "10px 12px", borderRadius: t.radiusSm,
                }}>
                  <div>
                    <div>
                      <MethodBadge method={ep.method} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace",
                                     fontSize: "12px", color: t.textCode, fontWeight: 500 }}>
                        {ep.path}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>{ep.name}</div>
                  </div>
                  <div style={monoSm}>{ep.requests}</div>
                  <div style={monoSm}>{ep.p50}</div>
                  <div style={monoSm}>{ep.p95}</div>
                  <div style={{ textAlign: "right" }}>
                    <ErrorRateBadge rate={ep.errorRate} level={ep.errorLevel} />
                  </div>
                </div>
              ))
          }
        </div>
      </main>
    </div>
  );
}

// ── Usage ──────────────────────────────────────────────────────────────────
//
//   import { ApiDashboard } from "./ApiDashboard";
//
//   export default function App() {
//     return <ApiDashboard apiUrl="/api/dashboard" title="API Overview" />;
//   }
//
// ── Expected JSON shape ────────────────────────────────────────────────────
//
//   {
//     "alert": "Rate limit warning: POST /v2/embeddings is at 84% of quota",
//     "stats": [
//       { "label": "Total Requests", "value": "2.14M", "delta": "↑ 12.4%",
//         "deltaDirection": "up", "deltaPositive": true, "sub": "vs yesterday",
//         "icon": "⌁", "iconBg": "#eef2ff", "iconColor": "#4f46e5" }
//     ],
//     "services": [
//       { "name": "API Gateway", "detail": "All regions operational",
//         "status": "ok", "uptime": "99.98%" }
//     ],
//     "chartPoints": [
//       { "hour": "00:00", "success": 41200, "error": 310 }
//     ],
//     "statusCodeBreakdown": [
//       { "label": "2xx", "pct": 94.2, "color": "#059669" },
//       { "label": "4xx", "pct": 4.5,  "color": "#4f46e5" },
//       { "label": "5xx", "pct": 1.3,  "color": "#dc2626" }
//     ],
//     "endpoints": [
//       { "method": "POST", "path": "/v2/chat/completions", "name": "Chat completions",
//         "requests": "841,204", "p50": "138ms", "p95": "412ms",
//         "errorRate": "0.3%", "errorLevel": "ok" }
//     ]
//   }
