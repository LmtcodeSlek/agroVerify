import { useState, useEffect } from "react";
import Layout from "../Components/Layout";
import { colors, btnOutline, card } from "../theme";

/**
 * Audit
 * Props:
 *  onNavigate   – (path) => void
 *  fetchLogs    – async (filters) => log[]
 *  onExport     – () => void
 */
const ICON_CONFIG = {
  allocation:    { bg: "#dcfce7", icon: "📦" },
  approval:      { bg: "#dbeafe", icon: "✓"  },
  schedule:      { bg: "#fef9c3", icon: "📅" },
  registration:  { bg: "#dcfce7", icon: "🧑‍🌾" },
  login:         { bg: "#ede9fe", icon: "🔐" },
  rejection:     { bg: "#fee2e2", icon: "🚫" },
  distribution:  { bg: "#dcfce7", icon: "🚚" },
  default:       { bg: "#f3f4f6", icon: "📋" },
};

export default function Audit({ onNavigate, fetchLogs, onExportAudit, onExport }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: "", user: "", date: "" });
  const [loadError, setLoadError] = useState("");

  const loadLogs = async (f = filters) => {
    setLoading(true);
    try {
      setLoadError("");
      const data = await fetchLogs?.(f);
      setLogs(data || []);
    } catch (err) {
      setLogs([]);
      setLoadError(err?.message || "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []); // eslint-disable-line

  const handleFilterChange = (key, val) => {
    const next = { ...filters, [key]: val };
    setFilters(next);
    loadLogs(next);
  };

  return (
    <Layout
      activePath="/audit"
      onNavigate={onNavigate}
      onSearch={q => handleFilterChange("search", q)}
      searchPlaceholder="Filter by user, action..."
    >
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>Audit Log</h2>
          <p style={s.subtitle}>Full system activity · Tamper-proof · Who · When · What</p>
        </div>
        <button style={btnOutline} onClick={() => (onExportAudit || onExport)?.(filters)}>Export Log</button>
      </div>

      {loadError ? <div style={s.errorBanner}>{loadError}</div> : null}

      {/* Filters */}
      <div style={s.filterRow}>
        <select value={filters.action} onChange={e => handleFilterChange("action", e.target.value)} style={s.select}>
          <option value="">All Actions</option>
          {["allocation", "approval", "registration", "login", "rejection", "distribution", "schedule"].map(a => (
            <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
          ))}
        </select>
        <select value={filters.user} onChange={e => handleFilterChange("user", e.target.value)} style={s.select}>
          <option value="">All Users</option>
        </select>
        <input
          type="date"
          value={filters.date}
          onChange={e => handleFilterChange("date", e.target.value)}
          style={s.select}
        />
      </div>

      {/* Log list */}
      <div style={{ ...card, overflow: "hidden" }}>
        {loading ? (
          <div style={s.empty}>Loading audit log…</div>
        ) : logs.length === 0 ? (
          <div style={s.empty}>No log entries found.</div>
        ) : logs.map((entry, i) => {
          const cfg = ICON_CONFIG[entry.type] || ICON_CONFIG.default;
          return (
            <div key={entry.id ?? i} style={s.logEntry}>
              <div style={{ ...s.logIcon, background: cfg.bg }}>{cfg.icon}</div>
              <div style={s.logBody}>
                <div style={s.logAction}>{entry.action}</div>
                <div style={s.logDetail} dangerouslySetInnerHTML={{ __html: entry.detail }} />
                {entry.meta && <div style={s.logMeta}>{entry.meta}</div>}
              </div>
              <div style={s.logTime}>
                {entry.date}<br />{entry.time}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

const s = {
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" },
  title:      { fontSize: "18px", fontWeight: "700", color: colors.navy, margin: 0 },
  subtitle:   { fontSize: "12px", color: colors.muted, margin: "2px 0 0" },
  filterRow:  { display: "flex", gap: "8px", marginBottom: "12px" },
  select:     { padding: "6px 10px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "11px", color: "#444", background: "white" },
  logEntry:   { display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #f5f5f5" },
  logIcon:    { width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0, marginTop: "2px" },
  logBody:    { flex: 1 },
  logAction:  { fontSize: "12px", fontWeight: "600", color: colors.navy, marginBottom: "2px" },
  logDetail:  { fontSize: "11px", color: "#666" },
  logMeta:    { fontSize: "10px", color: "#aaa", marginTop: "2px" },
  logTime:    { fontSize: "10px", color: "#aaa", whiteSpace: "nowrap", fontFamily: "monospace", textAlign: "right" },
  empty:      { padding: "40px", textAlign: "center", color: colors.muted, fontSize: "13px" },
  errorBanner:{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "12px", padding: "10px 12px", marginBottom: "12px" },
};
