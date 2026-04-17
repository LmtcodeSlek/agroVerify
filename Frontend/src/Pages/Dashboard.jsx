import { useEffect, useMemo, useState } from "react";
import Layout from "../Components/Layout";
import StatCard from "../Components/StatCard";
import AppModal from "../Components/AppModal";
import { colors, card, btnPrimary } from "../theme";
import { AllocationIcon, FarmersIcon, LocationIcon, OfficersIcon } from "../Components/icons";
import { fetchFarmers } from "../lib/agriTrust";

export default function Dashboard({ onNavigate, onApplyAllocation }) {
  const [farmers, setFarmers] = useState([]);
  const [stats, setStats] = useState({ totalFarmers: 0, bagsAllocated: 0, activeOfficers: 0 });
  const [locations, setLocations] = useState({ provinces: [], districts: [], towns: [], villages: [] });
  const [selected, setSelected] = useState({ province: "", district: "", town: "", village: "" });
  const [policy, setPolicy] = useState({ bagsPerFarmer: 3, startDate: "", endDate: "", dateRestriction: false });
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const rows = await fetchFarmers();
        if (!alive) return;
        setFarmers(rows || []);
        setLoadError("");
      } catch (err) {
        if (!alive) return;
        setFarmers([]);
        setLoadError(
          String(err?.message || "").includes("Blockchain Node Offline")
            ? "Blockchain Node Offline. Start your local Hardhat node to load on-chain farmer records."
            : err?.message || "Unable to load blockchain farmer records."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const hierarchy = useMemo(() => buildHierarchy(farmers), [farmers]);

  useEffect(() => {
    setLocations({
      provinces: hierarchy.provinces,
      districts: hierarchy.districtsByProvince[selected.province] || [],
      towns: hierarchy.townsByDistrict[makeKey(selected.province, selected.district)] || [],
      villages: hierarchy.villagesByTown[makeKey(selected.province, selected.district, selected.town)] || [],
    });
  }, [hierarchy, selected.province, selected.district, selected.town]);

  useEffect(() => {
    const totalFarmers = farmers.length;
    const approvedFarmers = farmers.filter((row) => String(row?.status || "").toLowerCase() === "approved").length;
    const activeOfficerWallets = new Set(
      farmers
        .map((row) => String(row?.registeredBy || "").trim().toLowerCase())
        .filter(Boolean)
    );

    setStats({
      totalFarmers,
      bagsAllocated: approvedFarmers * Number(policy.bagsPerFarmer || 0),
      activeOfficers: activeOfficerWallets.size,
    });
  }, [farmers, policy.bagsPerFarmer]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const result = await onApplyAllocation?.({ ...selected, ...policy });
      if (result?.txHash) {
        setModal({
          open: true,
          title: "Allocation Applied",
          message: `Allocation policy confirmed.\nTx: ${result.txHash}`,
        });
      } else {
        setModal({
          open: true,
          title: "Allocation Prepared",
          message: "Dashboard is now using blockchain farmer records. Allocation submission can be wired next.",
        });
      }
    } catch (err) {
      setModal({
        open: true,
        title: "Allocation Failed",
        message: err?.message || "Failed to apply allocation policy.",
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Layout activePath="/dashboard" onNavigate={onNavigate} searchPlaceholder="Search on-chain farmers...">
      <AppModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
      {loadError ? <div style={s.offlineBanner}>{loadError}</div> : null}
      <div style={s.statsRow}>
        <StatCard icon={<FarmersIcon size={22} />} label="On-Chain Farmers" value={loading ? "..." : stats.totalFarmers?.toLocaleString()} sub="Fetched from contract.getAllFarmers()" />
        <StatCard icon={<AllocationIcon size={22} />} label="Projected Bags" value={loading ? "..." : stats.bagsAllocated?.toLocaleString()} sub="Derived from approved farmer records" subColor={colors.info} />
        <StatCard icon={<OfficersIcon size={22} />} label="Observed Officer Wallets" value={loading ? "..." : stats.activeOfficers?.toLocaleString()} sub="Wallets seen registering farmers" />
      </div>

      <div style={s.twoCol}>
        <div style={{ ...card, padding: "20px" }}>
          <h3 style={s.cardTitle}>
            <LocationIcon size={16} />
            <span>On-Chain Location Map</span>
          </h3>
          <Selector
            label="Province"
            options={locations.provinces || []}
            value={selected.province}
            onChange={(v) => setSelected((p) => ({ ...p, province: v, district: "", town: "", village: "" }))}
          />
          <Selector
            label="District"
            options={locations.districts || []}
            value={selected.district}
            onChange={(v) => setSelected((p) => ({ ...p, district: v, town: "", village: "" }))}
            disabled={!selected.province}
          />
          <Selector
            label="Town/Ward"
            options={locations.towns || []}
            value={selected.town}
            onChange={(v) => setSelected((p) => ({ ...p, town: v, village: "" }))}
            disabled={!selected.province || !selected.district}
          />
          <Selector
            label="Village"
            options={locations.villages || []}
            value={selected.village}
            onChange={(v) => setSelected((p) => ({ ...p, village: v }))}
            disabled={!selected.province || !selected.district || !selected.town}
          />
          <div style={s.chainNote}>Location lists are derived locally from the farmer records already stored on chain.</div>
        </div>

        <div style={{ ...card, padding: "20px" }}>
          <h3 style={s.cardTitle}>
            <AllocationIcon size={16} />
            <span>Blockchain Allocation Console</span>
          </h3>

          <div style={s.stepRow}>
            <div style={s.stepBadge}>A</div>
            <div style={{ flex: 1 }}>
              <div style={s.stepLabel}>Step A: Scope</div>
              <div style={s.scopeValue}>
                {selected.province ? `${selected.province}${selected.district ? ` - ${selected.district}` : ""}${selected.town ? ` - ${selected.town}` : ""}` : "Select a location from the on-chain map"}
              </div>
            </div>
          </div>

          <div style={s.stepRow}>
            <div style={{ ...s.stepBadge, background: "#1a2744" }}>B</div>
            <div style={{ flex: 1 }}>
              <div style={s.stepLabel}>Step B: Policy</div>
              <div style={s.policyRow}>
                <label style={s.policyLabel}>Bags per farmer:</label>
                <input
                  type="number"
                  min={1}
                  value={policy.bagsPerFarmer}
                  onChange={(e) => setPolicy((p) => ({ ...p, bagsPerFarmer: Number(e.target.value) }))}
                  style={s.numInput}
                />
              </div>

              <div style={s.toggleRow}>
                <span style={{ ...s.xBtn, background: policy.dateRestriction ? colors.green : "#ef4444" }} onClick={() => setPolicy((p) => ({ ...p, dateRestriction: !p.dateRestriction }))}>
                  {policy.dateRestriction ? "Yes" : "No"}
                </span>
                <span style={s.policyLabel}>Date Restriction</span>
              </div>

              {policy.dateRestriction && (
                <div style={s.dateRow}>
                  <div>
                    <div style={s.policyLabel}>Start Date:</div>
                    <input type="date" value={policy.startDate} onChange={(e) => setPolicy((p) => ({ ...p, startDate: e.target.value }))} style={s.dateInput} />
                  </div>
                  <div>
                    <div style={s.policyLabel}>End Date:</div>
                    <input type="date" value={policy.endDate} onChange={(e) => setPolicy((p) => ({ ...p, endDate: e.target.value }))} style={s.dateInput} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button style={{ ...btnPrimary, width: "100%", marginTop: "16px" }} onClick={handleApply} disabled={applying}>
            {applying ? "Applying..." : "Apply Allocation Policy"}
          </button>
        </div>
      </div>
    </Layout>
  );
}

function buildHierarchy(farmers) {
  const provinces = new Set();
  const districtsByProvince = {};
  const townsByDistrict = {};
  const villagesByTown = {};

  for (const farmer of farmers || []) {
    const [province = "", district = "", town = "", village = ""] = String(farmer?.location || "")
      .split(/[/,|-]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (!province) continue;
    provinces.add(province);

    if (!districtsByProvince[province]) districtsByProvince[province] = [];
    if (district && !districtsByProvince[province].some((row) => row.value === district)) {
      districtsByProvince[province].push({ value: district, label: district });
    }

    const districtKey = makeKey(province, district);
    if (!townsByDistrict[districtKey]) townsByDistrict[districtKey] = [];
    if (town && !townsByDistrict[districtKey].some((row) => row.value === town)) {
      townsByDistrict[districtKey].push({ value: town, label: town });
    }

    const townKey = makeKey(province, district, town);
    if (!villagesByTown[townKey]) villagesByTown[townKey] = [];
    if (village && !villagesByTown[townKey].some((row) => row.value === village)) {
      villagesByTown[townKey].push({ value: village, label: village });
    }
  }

  return {
    provinces: Array.from(provinces).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).map((value) => ({ value, label: value })),
    districtsByProvince,
    townsByDistrict,
    villagesByTown,
  };
}

function makeKey(...parts) {
  return parts.filter(Boolean).join("::");
}

function Selector({ label, options, value, onChange, disabled = false, loading = false }) {
  const prerequisite =
    label === "District"
      ? "Province"
      : label === "Town/Ward"
        ? "District"
        : label === "Village"
          ? "Town/Ward"
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
          {loading ? "- Loading... -" : disabled ? `- Select ${prerequisite} first -` : `- Select ${label} -`}
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
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "16px" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  cardTitle: { fontSize: "13px", fontWeight: "700", color: colors.navy, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" },
  fieldLabel: { fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "4px", display: "block" },
  select: { width: "100%", padding: "7px 10px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "12px", color: "#333" },
  selectDisabled: { background: "#f3f4f6", color: "#6b7280" },
  stepRow: { display: "flex", gap: "12px", marginBottom: "16px", alignItems: "flex-start" },
  stepBadge: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: colors.green,
    color: "white",
    fontWeight: "700",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepLabel: { fontSize: "12px", fontWeight: "700", color: colors.navy, marginBottom: "8px" },
  scopeValue: { fontSize: "12px", color: "#555", background: colors.bg, padding: "8px 12px", borderRadius: "6px" },
  policyRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" },
  policyLabel: { fontSize: "12px", color: "#555" },
  numInput: { width: "60px", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "13px", fontWeight: "700", textAlign: "center" },
  toggleRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" },
  xBtn: {
    minWidth: "34px",
    height: "20px",
    borderRadius: "4px",
    color: "white",
    fontSize: "10px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    padding: "0 6px",
  },
  dateRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" },
  dateInput: { width: "100%", padding: "7px 8px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "12px" },
  offlineBanner: { background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "8px", color: "#9a3412", fontSize: "12px", padding: "10px 12px", marginBottom: "12px" },
  chainNote: { fontSize: "11px", color: colors.muted, marginTop: "8px" },
};
