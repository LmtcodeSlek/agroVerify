import { useState, useEffect, useCallback } from "react";
import Layout      from "../Components/Layout";
import StatCard    from "../Components/StatCard";
import FarmerTable from "../Components/FarmerTable";
import AppModal    from "../Components/AppModal";
import { colors, btnPrimary, btnOutline } from "../theme";

/**
 * Farmers
 * Props:
 *  onNavigate    – (path: string) => void
 *  fetchFarmers  – async () => farmer[]
 *  onApprove     – async (farmer) => void
 *  onReject      – async (farmer) => void
 *  onView        – (id) => void
 *  onRegister    – () => void
 *  onExport      – () => void
 *  isOwner       – boolean
 *  ownershipLoading – boolean
 *  ownershipError   – string | null
 *  subscribeEvent   – async (eventName, handler) => () => void
 */
export default function Farmers({
  onNavigate,
  currentUser,
  fetchFarmers,
  onApprove,
  onReject,
  onView,
  onRegister,
  onExport,
  isOwner,
  ownershipLoading,
  ownershipError,
  subscribeEvent,
  onLogout,
  ownerAddress,
  loading: externalLoading,
  registrationLocationConfig,
}) {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewFarmer, setViewFarmer] = useState(null);
  const [actionState, setActionState] = useState({});
  const [loadError, setLoadError] = useState("");
  const [registerForm, setRegisterForm] = useState({
    id: "",
    name: "",
    province: registrationLocationConfig?.province || "",
    district: registrationLocationConfig?.district || "",
    ward: "",
    village: "",
    location: "",
  });
  const [registerState, setRegisterState] = useState({ loading: false, error: "", success: "" });

  const loadFarmers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchFarmers?.();
      setFarmers(data || []);
    } catch (err) {
      setLoadError(err?.message || "Failed to load farmers.");
      setFarmers([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFarmers]);

  useEffect(() => {
    loadFarmers();
    const timer = setInterval(loadFarmers, 10000);
    return () => clearInterval(timer);
  }, [loadFarmers]);

  useEffect(() => {
    if (typeof externalLoading === "boolean") {
      setLoading(externalLoading);
    }
  }, [externalLoading]);

  useEffect(() => {
    if (!subscribeEvent) return;
    let unsubscribe = null;

    (async () => {
      try {
        unsubscribe = await subscribeEvent("FarmerVerified", (_timestamp, _wallet, farmerId) => {
          if (!farmerId) return;
          updateFarmerStatus(String(farmerId), "Approved");
        });
      } catch {
        // ignore event subscription failures
      }
    })();

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [subscribeEvent]); // eslint-disable-line

  // Derived stats
  const total    = farmers.length;
  const approved = farmers.filter(f => f.status === "Approved").length;
  const pending  = farmers.filter(f => f.status === "Pending").length;
  const rejected = farmers.filter(f => f.status === "Rejected").length;

  const approvalRate = total ? ((approved / total) * 100).toFixed(1) : "0";

  const handleView = async (id) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewFarmer(null);
    try {
      const details = await onView?.(id);
      setViewFarmer(details || null);
    } catch (err) {
      setViewError(err?.message || "Failed to load farmer details.");
    } finally {
      setViewLoading(false);
    }
  };

  const clearActionState = (id) => {
    setActionState((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const updateFarmerStatus = (idOrFarmerId, status) => {
    const target = String(idOrFarmerId);
    setFarmers((prev) => prev.map((f) => (
      String(f.id) === target || String(f.farmerId || "") === target
        ? { ...f, status }
        : f
    )));
  };

  const showModeration = String(currentUser?.role || "").trim().toLowerCase() !== "officer";
  const showRegisterForm = String(currentUser?.role || "").trim().toLowerCase() === "officer";
  const wardOptions = registrationLocationConfig?.wardOptions || [];
  const villageOptions = registrationLocationConfig?.villageOptionsByWard?.[registerForm.ward] || [];

  useEffect(() => {
    setRegisterForm((prev) => ({
      ...prev,
      province: registrationLocationConfig?.province || "",
      district: registrationLocationConfig?.district || "",
      ward: "",
      village: "",
      location: "",
    }));
  }, [registrationLocationConfig]);

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
    if (registerState.error || registerState.success) {
      setRegisterState({ loading: false, error: "", success: "" });
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setRegisterState({ loading: true, error: "", success: "" });
    try {
      await onRegister?.(registerForm);
      setRegisterForm({
        id: "",
        name: "",
        province: registrationLocationConfig?.province || "",
        district: registrationLocationConfig?.district || "",
        ward: "",
        village: "",
        location: "",
      });
      setRegisterState({ loading: false, error: "", success: "Farmer registration sent to AgriTrust." });
      await loadFarmers();
    } catch (err) {
      setRegisterState({ loading: false, error: err?.message || "Registration failed.", success: "" });
    }
  };

  const handleApprove = async (farmer) => {
    const id = farmer?.id;
    const current = farmers.find((f) => f.id === id);
    if (!current || actionState[id]?.state === "approving" || actionState[id]?.state === "rejecting") return;

    if (!isOwner) {
      setActionState((prev) => ({ ...prev, [id]: { state: "error", message: "Access Denied: Only the District Admin can approve farmers." } }));
      return;
    }

    setActionState((prev) => ({ ...prev, [id]: { state: "approving" } }));
    try {
      await onApprove?.(farmer);
      updateFarmerStatus(String(farmer?.farmerId || id), "Approved");
      setTimeout(() => clearActionState(id), 600);
    } catch (err) {
      setActionState((prev) => ({
        ...prev,
        [id]: { state: "error", message: err?.message || "Approval failed." },
      }));
    }
  };

  const handleReject = async (farmer) => {
    const id = farmer?.id;
    const current = farmers.find((f) => f.id === id);
    if (!current || actionState[id]?.state === "approving" || actionState[id]?.state === "rejecting") return;
    setActionState((prev) => ({ ...prev, [id]: { state: "rejecting" } }));
    try {
      await onReject?.(farmer);
      updateFarmerStatus(id, "Rejected");
      setTimeout(() => clearActionState(id), 600);
    } catch (err) {
      setActionState((prev) => ({
        ...prev,
        [id]: { state: "error", message: err?.message || "Rejection failed." },
      }));
    }
  };

  return (
    <Layout
      activePath="/farmers"
      onNavigate={onNavigate}
      onSearch={setSearch}
      searchPlaceholder="Search farmers..."
    >
      {/* Header */}
      {showModeration && !isOwner && (
        <div style={s.notice}>
          {ownershipLoading
            ? "Checking admin wallet permissions..."
            : ownershipError
              ? `On-chain admin check: ${ownershipError}`
              : "Connect the District Admin (contract owner) wallet in MetaMask to approve/reject farmers."}
        </div>
      )}

      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>Farmers</h2>
          <p style={s.subtitle}>
            {showModeration
              ? `Admin view. Owner wallet ${ownerAddress || "not connected"} can approve or reject pending farmers.`
              : "Officer view. Register farmers directly on-chain from this page."}
          </p>
        </div>
        <div style={s.headerActions}>
          <button style={btnOutline} onClick={loadFarmers}>Refresh</button>
          <button style={btnOutline} onClick={onExport}>Export CSV</button>
          {onLogout ? <button style={btnPrimary} onClick={onLogout}>Disconnect</button> : null}
        </div>
      </div>

      {loadError && <div style={s.errorBanner}>{loadError}</div>}

      {showRegisterForm && (
        <form onSubmit={handleRegisterSubmit} style={s.registerCard}>
          <div style={s.registerTitle}>Register Farmer</div>
          <div style={s.assignmentNote}>
            Officer assignment: {registerForm.province || "Unassigned"} / {formatDistrictName(registerForm.district || "Unassigned")}
          </div>
          <div style={s.registerGrid}>
            <input
              style={s.registerInput}
              name="id"
              value={registerForm.id}
              onChange={handleRegisterChange}
              placeholder="Farmer ID (optional)"
            />
            <input
              style={s.registerInput}
              name="name"
              value={registerForm.name}
              onChange={handleRegisterChange}
              placeholder="Farmer name"
              required
            />
            <input
              style={{ ...s.registerInput, ...s.registerInputMuted }}
              name="province"
              value={registerForm.province}
              placeholder="Province"
              readOnly
            />
            <input
              style={{ ...s.registerInput, ...s.registerInputMuted }}
              name="district"
              value={registerForm.district}
              placeholder="Kabwe District"
              readOnly
            />
            <select
              style={s.registerInput}
              name="ward"
              value={registerForm.ward}
              onChange={(event) => {
                const ward = event.target.value;
                const nextVillage = registrationLocationConfig?.villageOptionsByWard?.[ward]?.[0]?.value || "";
                setRegisterForm((prev) => ({
                  ...prev,
                  ward,
                  village: nextVillage,
                  location: "",
                }));
                if (registerState.error || registerState.success) {
                  setRegisterState({ loading: false, error: "", success: "" });
                }
              }}
              required
            >
              <option value="">Select ward</option>
              {wardOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              style={s.registerInput}
              name="village"
              value={registerForm.village}
              onChange={handleRegisterChange}
              required
              disabled={!registerForm.ward}
            >
              <option value="">Select village</option>
              {villageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button style={btnPrimary} type="submit" disabled={registerState.loading}>
              {registerState.loading ? "Submitting..." : "Register Farmer"}
            </button>
          </div>
          {registerState.error ? <div style={s.detailError}>{registerState.error}</div> : null}
          {registerState.success ? <div style={s.registerSuccess}>{registerState.success}</div> : null}
        </form>
      )}

      {/* Stats */}
      <div style={s.statsRow}>
        <StatCard label="Total Registered"  value={total.toLocaleString()}    sub={`↑ updated`} />
        <StatCard label="Approved"          value={approved.toLocaleString()} sub={`${approvalRate}% rate`} subColor={colors.info} />
        <StatCard label="Pending Review"    value={pending.toLocaleString()}  sub="Awaiting approval" subColor={colors.warning} />
        <StatCard label="Rejected"          value={rejected.toLocaleString()} sub="Requires follow-up" subColor={colors.danger} />
      </div>

      {/* Table */}
      <FarmerTable
        canModerate={Boolean(isOwner)}
        showModeration={Boolean(showModeration)}
        farmers={search
          ? farmers.filter(f =>
              f.name?.toLowerCase().includes(search.toLowerCase()) ||
              f.nrc?.toLowerCase().includes(search.toLowerCase()) ||
              String(f.farmerId || "").toLowerCase().includes(search.toLowerCase()) ||
              String(f.id || "").toLowerCase().includes(search.toLowerCase()))
          : farmers}
        loading={loading}
        onApprove={handleApprove}
        onReject={handleReject}
        onView={handleView}
        actionState={actionState}
      />

      <AppModal
        open={viewOpen}
        title="Farmer Details"
        onClose={() => setViewOpen(false)}
        content={(
          <div style={s.detailGrid}>
            {viewLoading && <div style={s.detailNote}>Loading farmer details…</div>}
            {!viewLoading && viewError && <div style={s.detailError}>{viewError}</div>}
            {!viewLoading && !viewError && (
              <>
                <DetailRow label="Name" value={`${viewFarmer?.first_name || ""} ${viewFarmer?.last_name || ""}`.trim() || "—"} />
                <DetailRow label="NRC" value={viewFarmer?.nrc || "—"} />
                <DetailRow label="Phone" value={viewFarmer?.phone || "—"} />
                <DetailRow label="Province" value={viewFarmer?.province || "—"} />
                <DetailRow label="Kabwe District" value={formatDistrictName(viewFarmer?.district) || "—"} />
                <DetailRow label="Ward" value={viewFarmer?.ward || "—"} />
                <DetailRow label="Village" value={viewFarmer?.village || "—"} />
                <DetailRow label="Status" value={viewFarmer?.status || "—"} />
                <DetailRow label="Officer ID" value={viewFarmer?.officer_id || "—"} />
                <DetailRow label="Farmer Code" value={viewFarmer?.farmer_code || "—"} />
              </>
            )}
          </div>
        )}
      />
    </Layout>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={s.detailRow}>
      <div style={s.detailLabel}>{label}</div>
      <div style={s.detailValue}>{value}</div>
    </div>
  );
}

function formatDistrictName(value) {
  const district = String(value || "").trim();
  if (!district) return "";
  return /district$/i.test(district) ? district : `${district} District`;
}

const s = {
  notice:       { background: "#fffbeb", border: `1px solid ${colors.border}`, padding: "10px 12px", borderRadius: "10px", marginBottom: "12px", fontSize: "12px", color: colors.text },
  errorBanner:  { background: "#fef2f2", border: `1px solid #fecaca`, padding: "10px 12px", borderRadius: "10px", marginBottom: "12px", fontSize: "12px", color: colors.danger },
  pageHeader:    { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  title:         { fontSize: "18px", fontWeight: "700", color: colors.navy, margin: 0 },
  subtitle:      { fontSize: "12px", color: colors.muted, margin: "2px 0 0" },
  headerActions: { display: "flex", gap: "8px" },
  statsRow:      { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "16px" },
  detailGrid:    { display: "grid", gap: "10px", marginTop: "8px" },
  detailRow:     { display: "grid", gridTemplateColumns: "140px 1fr", gap: "12px", alignItems: "center", padding: "6px 8px", background: "#f8fafc", borderRadius: "8px" },
  detailLabel:   { fontSize: "11px", fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.6px" },
  detailValue:   { fontSize: "12px", color: colors.text },
  detailNote:    { fontSize: "12px", color: colors.muted },
  detailError:   { fontSize: "12px", color: colors.danger },
  registerCard:  { background: "white", border: `1px solid ${colors.border}`, borderRadius: "10px", padding: "16px", marginBottom: "16px" },
  registerTitle: { fontSize: "14px", fontWeight: "700", color: colors.navy, marginBottom: "12px" },
  assignmentNote: { fontSize: "12px", color: colors.muted, marginBottom: "12px" },
  registerGrid:  { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px", alignItems: "center" },
  registerInput: { padding: "10px 12px", border: `1px solid ${colors.border}`, borderRadius: "8px", fontSize: "12px" },
  registerInputMuted: { background: "#f8fafc", color: colors.muted },
  registerSuccess: { fontSize: "12px", color: colors.green, marginTop: "10px" },
};
