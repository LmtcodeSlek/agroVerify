import { useEffect, useState } from "react";
import Layout from "../Components/Layout";
import TxStatus from "../Components/TxStatus";
import { btnOutline, btnPrimary, card, colors } from "../theme";

/**
 * Allocation
 * Props:
 *  onNavigate        – (path) => void
 *  fetchSummary      – async (scope) => { approvedFarmers, bagsPerFarmer, totalBags, scope }
 *  fetchHierarchy    – async (filters) => { provinces, districts }
 *  fetchLocations    – async () => { provinces, districts } (legacy fallback)
 *  onConfirmAlloc    – async (payload) => { txHash } (blockchain call)
 */
export default function Allocation({ onNavigate, fetchSummary, fetchHierarchy, fetchLocations, onConfirmAlloc }) {
  const [locations, setLocations] = useState({ provinces: [], districts: [], towns: [] });
  const [scope, setScope] = useState({ province: "", district: "", town: "" });
  const [policy, setPolicy] = useState({ bagsPerFarmer: 3 });
  const [summary, setSummary] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState({ districts: false, towns: false });
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadError("");
        const data = fetchHierarchy ? await fetchHierarchy?.({}) : await fetchLocations?.();
        if (!alive) return;
        setLocations({
          provinces: normalizeOptions(data?.provinces || []),
          districts: normalizeOptions(data?.districts || []),
          towns: normalizeOptions(data?.towns || []),
        });
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load locations.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchHierarchy, fetchLocations]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!fetchHierarchy) return;
      if (!scope.province) {
        setLocations((l) => ({ ...l, districts: [], towns: [] }));
        return;
      }

      setLoadingGeo((v) => ({ ...v, districts: true }));
      try {
        setLoadError("");
        const data = (await fetchHierarchy?.({ province: scope.province })) || {};
        if (!alive) return;
        setLocations((l) => ({ ...l, districts: normalizeOptions(data.districts || []), towns: [] }));
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load districts.");
      } finally {
        if (alive) setLoadingGeo((v) => ({ ...v, districts: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope.province, fetchHierarchy]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!fetchHierarchy) return;
      if (!scope.province || !scope.district) {
        setLocations((l) => ({ ...l, towns: [] }));
        return;
      }

      setLoadingGeo((v) => ({ ...v, towns: true }));
      try {
        setLoadError("");
        const data = (await fetchHierarchy?.({ province: scope.province, district: scope.district })) || {};
        if (!alive) return;
        setLocations((l) => ({ ...l, towns: normalizeOptions(data.towns || []) }));
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load towns.");
      } finally {
        if (alive) setLoadingGeo((v) => ({ ...v, towns: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope.province, scope.district, fetchHierarchy]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const data = (await fetchSummary?.({ ...scope, ...policy })) || {};
      setSummary(data);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setTxStatus("pending");
    setTxHash(null);
    setTxError(null);
    try {
      const result = await onConfirmAlloc?.({ ...scope, ...policy, ...summary });
      setTxHash(result?.txHash || null);
      setTxStatus("success");
    } catch (err) {
      setTxError(err.message || "Allocation failed.");
      setTxStatus("error");
    }
  };

  const approvedFarmers = summary?.approvedFarmers || 0;
  const bagsPerFarmer = policy.bagsPerFarmer || 0;
  const totalBags = approvedFarmers * bagsPerFarmer;

  return (
    <Layout activePath="/allocation" onNavigate={onNavigate}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>Allocation</h2>
          <p style={s.subtitle}>Assign fertiliser bags to approved farmers by location scope</p>
        </div>
      </div>

      <TxStatus status={txStatus} txHash={txHash} error={txError} onDismiss={() => setTxStatus(null)} />
      {loadError ? <div style={s.errorBanner}>{loadError}</div> : null}

      <div style={s.twoCol}>
        <div style={{ ...card, padding: "20px" }}>
          <div style={s.stepRow}>
            <div style={s.stepBadge}>A</div>
            <div>
              <div style={s.stepTitle}>Scope</div>
              <div style={s.stepDesc}>Select province, district and town/ward</div>
            </div>
          </div>

          <Picker
            label="Province"
            options={locations.provinces || []}
            value={scope.province}
            onChange={(v) => {
              setScope((p) => ({ ...p, province: v, district: "", town: "" }));
              setSummary(null);
            }}
          />
          <Picker
            label="District"
            options={locations.districts || []}
            value={scope.district}
            onChange={(v) => {
              setScope((p) => ({ ...p, district: v, town: "" }));
              setSummary(null);
            }}
            disabled={!scope.province}
            loading={loadingGeo.districts}
          />
          <Picker
            label="Town/Ward"
            options={locations.towns || []}
            value={scope.town}
            onChange={(v) => {
              setScope((p) => ({ ...p, town: v }));
              setSummary(null);
            }}
            disabled={!scope.province || !scope.district}
            loading={loadingGeo.towns}
          />

          <button
            style={{ ...btnOutline, width: "100%", marginTop: "8px" }}
            onClick={handleCalculate}
            disabled={loading || !scope.province || !scope.district}
          >
            {loading ? "Calculating..." : "Calculate Allocation"}
          </button>
        </div>

        <div style={{ ...card, padding: "20px" }}>
          <div style={s.stepRow}>
            <div style={{ ...s.stepBadge, background: colors.navy }}>B</div>
            <div>
              <div style={s.stepTitle}>Policy & Confirmation</div>
              <div style={s.stepDesc}>Set bags per farmer, review totals</div>
            </div>
          </div>

          <div style={s.policyRow}>
            <label style={s.fieldLabel}>Bags per farmer</label>
            <input
              type="number"
              min={1}
              value={policy.bagsPerFarmer}
              onChange={(e) => {
                setPolicy({ bagsPerFarmer: Number(e.target.value) });
                setSummary(null);
              }}
              style={s.numInput}
            />
          </div>

          <div style={s.calcBox}>
            <div style={s.calcRow}>
              <span>Approved Farmers</span>
              <span>{approvedFarmers.toLocaleString()}</span>
            </div>
            <div style={s.calcRow}>
              <span>Bags per Farmer</span>
              <span>× {bagsPerFarmer}</span>
            </div>
            <div style={{ ...s.calcRow, ...s.calcTotal }}>
              <span>Total Bags Required</span>
              <span>{totalBags.toLocaleString()}</span>
            </div>
          </div>

          {summary && (
            <div style={s.scopeTag}>
              📍 {scope.province}
              {scope.district ? ` → ${scope.district}` : ""}
              {scope.town ? ` → ${scope.town}` : ""}
            </div>
          )}

          <button
            style={{ ...btnPrimary, width: "100%", marginTop: "12px", opacity: !summary ? 0.5 : 1 }}
            onClick={handleConfirm}
            disabled={!summary || txStatus === "pending"}
          >
            {txStatus === "pending" ? "Confirming..." : "✓ Confirm Allocation"}
          </button>
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
      : label === "Town/Ward"
        ? "District"
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
          {loading ? "- Loading... -" : disabled ? `- Select ${prerequisite || label} first -` : `- Select ${label} -`}
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

const s = {
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  title: { fontSize: "18px", fontWeight: "700", color: colors.navy, margin: 0 },
  subtitle: { fontSize: "12px", color: colors.muted, margin: "2px 0 0" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  stepRow: { display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "16px" },
  stepBadge: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: colors.green,
    color: "white",
    fontWeight: "700",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepTitle: { fontSize: "13px", fontWeight: "700", color: colors.navy },
  stepDesc: { fontSize: "11px", color: colors.muted },
  fieldLabel: { fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "4px", display: "block" },
  select: { width: "100%", padding: "7px 10px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "12px" },
  selectDisabled: { background: "#f3f4f6", color: "#6b7280" },
  policyRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" },
  numInput: { width: "70px", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "14px", fontWeight: "700", textAlign: "center" },
  calcBox: { background: colors.bg, borderRadius: "8px", padding: "12px", marginTop: "8px" },
  calcRow: { display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#444", marginBottom: "6px" },
  calcTotal: { fontWeight: "700", color: colors.navy, fontSize: "13px", borderTop: "1px solid #e0e0e0", paddingTop: "6px", marginBottom: 0 },
  scopeTag: { fontSize: "12px", color: colors.green, fontWeight: "600", marginTop: "10px" },
  errorBanner: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "12px", padding: "10px 12px", marginBottom: "12px" },
};

