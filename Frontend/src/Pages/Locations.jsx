import { useState, useEffect } from "react";
import Layout from "../Components/Layout";
import { colors, btnPrimary, card } from "../theme";
import { FilterIcon, LocationIcon, SuccessIcon } from "../Components/icons";

export default function Locations({ onNavigate, fetchHierarchy }) {
  const [hierarchy, setHierarchy] = useState({ provinces: [], districts: [], towns: [], villages: [] });
  const [selected, setSelected] = useState({ province: "", district: "", town: "", village: "" });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState({ districts: false, towns: false, villages: false, summary: false });
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const data = (await fetchHierarchy?.({})) || {};
        setHierarchy((h) => ({ ...h, provinces: normalizeOptions(data.provinces || []) }));
      } catch (err) {
        setError(err?.message || "Failed to load location hierarchy.");
      }
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selected.province) {
        setHierarchy((h) => ({ ...h, districts: [], towns: [], villages: [] }));
        return;
      }

      setLoading((l) => ({ ...l, districts: true }));
      try {
        setError("");
        const data = (await fetchHierarchy?.({ province: selected.province })) || {};
        if (!alive) return;
        setHierarchy((h) => ({ ...h, districts: normalizeOptions(data.districts || []), towns: [], villages: [] }));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load districts.");
      } finally {
        if (alive) setLoading((l) => ({ ...l, districts: false }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [selected.province, fetchHierarchy]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selected.province || !selected.district) {
        setHierarchy((h) => ({ ...h, towns: [], villages: [] }));
        return;
      }

      setLoading((l) => ({ ...l, towns: true }));
      try {
        setError("");
        const data = (await fetchHierarchy?.({ province: selected.province, district: selected.district })) || {};
        if (!alive) return;
        setHierarchy((h) => ({ ...h, towns: normalizeOptions(data.towns || []), villages: [] }));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load towns.");
      } finally {
        if (alive) setLoading((l) => ({ ...l, towns: false }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [selected.province, selected.district, fetchHierarchy]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selected.province || !selected.district || !selected.town) {
        setHierarchy((h) => ({ ...h, villages: [] }));
        return;
      }

      setLoading((l) => ({ ...l, villages: true }));
      try {
        setError("");
        const data = (await fetchHierarchy?.({ province: selected.province, district: selected.district, town: selected.town })) || {};
        if (!alive) return;
        setHierarchy((h) => ({ ...h, villages: normalizeOptions(data.villages || []) }));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load villages.");
      } finally {
        if (alive) setLoading((l) => ({ ...l, villages: false }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [selected.province, selected.district, selected.town, fetchHierarchy]);

  const handleApply = async () => {
    setLoading((l) => ({ ...l, summary: true }));
    try {
      setError("");
      const data = (await fetchHierarchy?.(selected)) || {};
      setHierarchy((h) => {
        const next = { ...h };
        if (!selected.province) next.provinces = h.provinces;
        if (selected.province && Array.isArray(data.districts)) next.districts = normalizeOptions(data.districts);
        if (selected.district && Array.isArray(data.towns)) next.towns = normalizeOptions(data.towns);
        if (selected.town && Array.isArray(data.villages)) next.villages = normalizeOptions(data.villages);
        return next;
      });
      setSummary(data.summary || null);
    } catch (err) {
      setError(err?.message || "Failed to load the location summary.");
    } finally {
      setLoading((l) => ({ ...l, summary: false }));
    }
  };

  const breadcrumb = [selected.province, selected.district, selected.town, selected.village].filter(Boolean).join(" -> ") || "No location selected";

  return (
    <Layout activePath="/locations" onNavigate={onNavigate}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>
            <LocationIcon size={18} />
            <span>Location Management</span>
          </h2>
          <p style={s.subtitle}>Geographic Hierarchy - Pre-seeded National Data</p>
        </div>
      </div>

      <div style={s.twoCol}>
        <div style={{ ...card, padding: "16px" }}>
          <h4 style={s.panelTitle}>
            <FilterIcon size={14} />
            <span>Filter by Location</span>
          </h4>
          <div style={s.notice}>Data is pre-seeded. Admins cannot create villages manually.</div>
          {error ? <div style={s.error}>{error}</div> : null}

          <Picker
            label="Province"
            options={hierarchy.provinces}
            value={selected.province}
            onChange={(v) => setSelected({ province: v, district: "", town: "", village: "" })}
          />
          <Picker
            label="District"
            options={hierarchy.districts}
            value={selected.district}
            onChange={(v) => setSelected((p) => ({ ...p, district: v, town: "", village: "" }))}
            disabled={!selected.province}
            loading={loading.districts}
          />
          <Picker
            label="Town / Ward"
            options={hierarchy.towns}
            value={selected.town}
            onChange={(v) => setSelected((p) => ({ ...p, town: v, village: "" }))}
            disabled={!selected.province || !selected.district}
            loading={loading.towns}
          />
          <Picker
            label="Village"
            options={hierarchy.villages}
            value={selected.village}
            onChange={(v) => setSelected((p) => ({ ...p, village: v }))}
            disabled={!selected.province || !selected.district || !selected.town}
            loading={loading.villages}
          />

          <button style={{ ...btnPrimary, width: "100%", marginTop: "8px" }} onClick={handleApply} disabled={loading.summary}>
            {loading.summary ? "Loading..." : "Apply Filter"}
          </button>
        </div>

        <div style={{ ...card, padding: "16px" }}>
          <div style={s.summaryTitle}>{breadcrumb}</div>
          <div style={s.summaryPath}>Zambia - Geographic Selection</div>

          {summary ? (
            <>
              <div style={s.summaryGrid}>
                <SummaryItem label="Registered Farmers" value={summary.registered} />
                <SummaryItem label="Approved" value={summary.approved} color={colors.green} />
                <SummaryItem label="Pending" value={summary.pending} color={colors.warning} />
                <SummaryItem label="Allocated Bags" value={summary.bags} color={colors.info} />
              </div>

              <ProgressBar label="Approval Rate" pct={summary.approvalRate} color={colors.green} />
              <ProgressBar label="Allocation Coverage" pct={summary.coverageRate} color={colors.info} />
              <ProgressBar label="Distribution Complete" pct={summary.distributionRate} color={colors.warning} />

              {summary.allocationComplete && (
                <div style={s.successBox}>
                  <div style={s.successTitle}>
                    <SuccessIcon size={12} />
                    <span>Allocation Complete</span>
                  </div>
                  <div style={s.successSub}>
                    {summary.bags} bags approved for {summary.approved} farmers - {summary.bagsPerFarmer} bags each
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={s.emptyMsg}>Apply a filter to see location summary.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function normalizeOptions(options) {
  const seen = new Set();
  const out = [];
  for (const o of options || []) {
    const value = typeof o === "object" && o ? (o.value ?? o.label ?? "") : o;
    const label = typeof o === "object" && o ? (o.label ?? o.value ?? "") : o;
    const v = String(value || "").trim();
    const l = String(label || "").trim();
    if (!v || !l) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ value: v, label: l });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return out;
}

function Picker({ label, options, value, onChange, disabled = false, loading = false }) {
  const prerequisite =
    label === "District"
      ? "Province"
      : label === "Town / Ward"
        ? "District"
        : label === "Village"
          ? "Town / Ward"
          : null;

  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={s.fieldLabel}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...s.select, ...(disabled ? s.selectDisabled : {}) }}
        disabled={disabled || loading}
      >
        <option value="">
          {loading ? "- Loading... -" : disabled ? `- Select ${prerequisite || label} first -` : `- All ${label}s -`}
        </option>
        {!loading &&
          options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>
              {o.label ?? o}
            </option>
          ))}
      </select>
    </div>
  );
}

function SummaryItem({ label, value, color }) {
  return (
    <div style={s.summaryItem}>
      <div style={s.summaryItemLabel}>{label}</div>
      <div style={{ ...s.summaryItemValue, color: color || colors.navy }}>{value ?? "-"}</div>
    </div>
  );
}

function ProgressBar({ label, pct = 0, color }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={s.progressLabel}>
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const s = {
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  title: { fontSize: "18px", fontWeight: "700", color: colors.navy, margin: 0, display: "flex", alignItems: "center", gap: "8px" },
  subtitle: { fontSize: "12px", color: colors.muted, margin: "2px 0 0" },
  twoCol: { display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px" },
  panelTitle: { fontSize: "13px", fontWeight: "700", color: colors.navy, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" },
  notice: { fontSize: "10px", color: "#92400e", background: "#fef9c3", padding: "6px 8px", borderRadius: "6px", marginBottom: "12px" },
  error: { fontSize: "11px", color: "#b91c1c", background: "#fef2f2", padding: "8px 10px", borderRadius: "6px", marginBottom: "12px", border: "1px solid #fecaca" },
  fieldLabel: { fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "4px", display: "block" },
  select: { width: "100%", padding: "7px 10px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "12px" },
  selectDisabled: { background: "#f3f4f6", color: "#6b7280" },
  summaryTitle: { fontSize: "13px", fontWeight: "700", color: colors.navy, marginBottom: "2px" },
  summaryPath: { fontSize: "11px", color: colors.muted, marginBottom: "16px" },
  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" },
  summaryItem: { background: colors.bg, borderRadius: "8px", padding: "12px" },
  summaryItemLabel: { fontSize: "10px", color: colors.muted, marginBottom: "4px" },
  summaryItemValue: { fontSize: "20px", fontWeight: "700" },
  progressLabel: { display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#666", marginBottom: "4px" },
  progressTrack: { height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: "4px", transition: "width 0.4s" },
  successBox: { marginTop: "12px", padding: "10px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" },
  successTitle: { fontSize: "11px", fontWeight: "600", color: "#166534", marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px" },
  successSub: { fontSize: "10px", color: "#4ade80" },
  emptyMsg: { fontSize: "13px", color: colors.muted, textAlign: "center", padding: "40px 0" },
};
