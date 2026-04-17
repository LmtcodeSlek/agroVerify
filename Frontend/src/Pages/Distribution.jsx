import { useEffect, useMemo, useState } from "react";
import Layout from "../Components/Layout";
import TxStatus from "../Components/TxStatus";
import AppModal from "../Components/AppModal";
import { colors, badge, btnPrimary, btnOutline, card } from "../theme";

const STATUS_VARIANT = { Complete: "green", "In Progress": "blue", Scheduled: "yellow", Cancelled: "red" };

const emptyForm = () => {
  return {
    province: "",
    district: "",
    town: "",
    village: "",
    bagsPerFarmer: "3",
    durationDays: "14",
  };
};

export default function Distribution({
  onNavigate,
  fetchSchedules,
  fetchHierarchy,
  onCreateSchedule,
  onMarkDistributed,
  onViewSchedule,
  currentUser,
}) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [nrcBySchedule, setNrcBySchedule] = useState({});

  const [geo, setGeo] = useState({ provinces: [], districts: [], towns: [], villages: [] });
  const [geoLoading, setGeoLoading] = useState({ districts: false, towns: false, villages: false });
  const [loadError, setLoadError] = useState("");

  const role = norm(currentUser?.role);
  const isAdmin = role === "admin";
  const isOfficer = role === "officer";
  const userId = String(currentUser?.id || "");
  const userName = String(currentUser?.name || "");

  const loadSchedules = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      setLoadError("");
      const data = await fetchSchedules?.();
      setSchedules(data || []);
    } catch (err) {
      setSchedules([]);
      setLoadError(err?.message || "Failed to load distribution schedules.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []); // eslint-disable-line

  useEffect(() => {
    const timer = setInterval(() => {
      loadSchedules({ silent: true });
    }, 12000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!fetchHierarchy) return;
      try {
        setLoadError("");
        const data = (await fetchHierarchy?.({})) || {};
        if (!alive) return;
        setGeo((g) => ({ ...g, provinces: normalizeOptions(data.provinces || []) }));
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load distribution locations.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchHierarchy]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!fetchHierarchy) return;
      if (!form.province) {
        setGeo((g) => ({ ...g, districts: [], towns: [], villages: [] }));
        return;
      }

      setGeoLoading((v) => ({ ...v, districts: true }));
      try {
        setLoadError("");
        const data = (await fetchHierarchy?.({ province: form.province })) || {};
        if (!alive) return;
        setGeo((g) => ({
          ...g,
          districts: normalizeOptions(data.districts || []),
          towns: [],
          villages: [],
        }));
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load districts.");
      } finally {
        if (alive) setGeoLoading((v) => ({ ...v, districts: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [form.province, fetchHierarchy]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!fetchHierarchy) return;
      if (!form.province || !form.district) {
        setGeo((g) => ({ ...g, towns: [], villages: [] }));
        return;
      }

      setGeoLoading((v) => ({ ...v, towns: true }));
      try {
        setLoadError("");
        const data = (await fetchHierarchy?.({ province: form.province, district: form.district })) || {};
        if (!alive) return;
        setGeo((g) => ({
          ...g,
          towns: normalizeOptions(data.towns || []),
          villages: [],
        }));
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load towns.");
      } finally {
        if (alive) setGeoLoading((v) => ({ ...v, towns: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [form.province, form.district, fetchHierarchy]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!fetchHierarchy) return;
      if (!form.province || !form.district || !form.town) {
        setGeo((g) => ({ ...g, villages: [] }));
        return;
      }

      setGeoLoading((v) => ({ ...v, villages: true }));
      try {
        setLoadError("");
        const data = (await fetchHierarchy?.({ province: form.province, district: form.district, town: form.town })) || {};
        if (!alive) return;
        setGeo((g) => ({
          ...g,
          villages: normalizeOptions(data.villages || []),
        }));
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || "Failed to load villages.");
      } finally {
        if (alive) setGeoLoading((v) => ({ ...v, villages: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [form.province, form.district, form.town, fetchHierarchy]);

  const scopePreview = useMemo(
    () => [form.province, form.district, form.town, form.village].filter(Boolean).join(" / ") || "Select location",
    [form.province, form.district, form.town, form.village]
  );

  const visibleSchedules = useMemo(() => {
    if (!isOfficer) return schedules;
    return schedules.filter((sc) => {
      const officerId = String(sc.officerId || "");
      const officerName = String(sc.officer || "");
      if (officerId && userId && officerId === userId) return true;
      if (officerId && userId && norm(officerId) === norm(userId)) return true;
      if (officerName && userName && norm(officerName) === norm(userName)) return true;
      return false;
    });
  }, [schedules, isOfficer, userId, userName]);

  const openCreateModal = () => {
    setCreateError("");
    setForm(emptyForm());
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setCreateError("");

    if (!form.province || !form.district || !form.town) {
      setCreateError("Province, district and town/ward are required.");
      return;
    }
    if (Number(form.bagsPerFarmer || 0) <= 0) {
      setCreateError("Bags per farmer must be greater than zero.");
      return;
    }
    if (Number(form.durationDays || 0) <= 0) {
      setCreateError("Duration days must be greater than zero.");
      return;
    }

    setCreating(true);
    try {
      await onCreateSchedule?.({
        province: form.province,
        district: form.district,
        ward: form.town,
        bagsPerFarmer: Number(form.bagsPerFarmer || 0),
        durationDays: Number(form.durationDays || 0),
      });
      setCreateOpen(false);
      await loadSchedules();
      setModal({
        open: true,
        title: "Schedule Created",
        message: `Distribution window saved for ${scopePreview}\nBags per farmer: ${form.bagsPerFarmer}\nDuration: ${form.durationDays} days`,
      });
    } catch (err) {
      setCreateError(err?.message || "Failed to create schedule.");
    } finally {
      setCreating(false);
    }
  };

  const handleMark = async ({ scheduleId, scheduleOfficerId, adminOverride = false }) => {
    const nrc = String(nrcBySchedule[scheduleId] || "").trim();
    if (!nrc) {
      setTxStatus("error");
      setTxError("Enter the farmer NRC before confirming distribution.");
      return;
    }

    setTxStatus("pending");
    setTxHash(null);
    setTxError(null);
    try {
      const result = await onMarkDistributed?.({
        scheduleId,
        nrc,
        officerId: adminOverride ? scheduleOfficerId : currentUser?.id,
      });
      setTxHash(result?.txHash || null);
      setTxStatus("success");
      setNrcBySchedule((p) => ({ ...p, [scheduleId]: "" }));
      await loadSchedules();
    } catch (err) {
      setTxError(err.message || "Failed to mark as distributed.");
      setTxStatus("error");
    }
  };

  const handleView = async (id) => {
    const details = await onViewSchedule?.(id);
    if (!details) return;
    const windowMeta = getWindowMeta({
      startDate: details.start_date || details.startDate,
      endDate: details.end_date || details.endDate,
    });
    setModal({
      open: true,
      title: "Schedule Details",
      message: [
        `Schedule: ${details.id}`,
        `Location: ${details.location || [details.province, details.district, details.ward || details.town, details.village].filter(Boolean).join(" / ")}`,
        `Officer: ${details.officer || details.officer_id || "Unassigned"}`,
        `Window: ${details.start_date || details.startDate} to ${details.end_date || details.endDate}`,
        `Bags Per Farmer: ${details.bagsPerFarmer || details.bags_per_farmer || 0}`,
        `Window Status: ${windowMeta.label}`,
        `Distributed: ${details.distributed}/${details.total_farmers}`,
      ].join("\n"),
    });
  };

  return (
    <Layout activePath="/distribution" onNavigate={onNavigate}>
      <AppModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />

      {createOpen && (
        <div style={s.overlay} onClick={() => setCreateOpen(false)}>
          <div style={s.createModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.createTitle}>Create Distribution Schedule</h3>
            <div style={s.createSubtitle}>Admin sets the active window. Officer distributes by NRC in that window.</div>

            <Selector
              label="Province"
              options={geo.provinces}
              value={form.province}
              onChange={(v) => setForm((p) => ({ ...p, province: v, district: "", town: "", village: "" }))}
            />
            <Selector
              label="District"
              options={geo.districts}
              value={form.district}
              onChange={(v) => setForm((p) => ({ ...p, district: v, town: "", village: "" }))}
              disabled={!form.province}
              loading={geoLoading.districts}
            />
            <Selector
              label="Town/Ward"
              options={geo.towns}
              value={form.town}
              onChange={(v) => setForm((p) => ({ ...p, town: v, village: "" }))}
              disabled={!form.province || !form.district}
              loading={geoLoading.towns}
            />
            <div style={s.dateGrid}>
              <div>
                <label style={s.fieldLabel}>Bags Per Farmer</label>
                <input
                  type="number"
                  min="1"
                  value={form.bagsPerFarmer}
                  onChange={(e) => setForm((p) => ({ ...p, bagsPerFarmer: e.target.value }))}
                  style={s.dateInput}
                />
              </div>
              <div>
                <label style={s.fieldLabel}>Duration Days</label>
                <input
                  type="number"
                  min="1"
                  value={form.durationDays}
                  onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value }))}
                  style={s.dateInput}
                />
              </div>
            </div>

            <div style={s.scopePreview}>Scope: {scopePreview}</div>
            {createError ? <div style={s.createError}>{createError}</div> : null}

            <div style={s.createActions}>
              <button style={btnOutline} onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </button>
              <button style={btnPrimary} onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>Distribution Schedule</h2>
          <p style={s.subtitle}>
            {isOfficer
              ? "Use farmer NRC to confirm distribution during active windows."
              : "Activate windows, assign officers, and monitor officer progress."}
          </p>
        </div>
        {isAdmin && (
          <button style={btnPrimary} onClick={openCreateModal}>
            + Create Schedule
          </button>
        )}
      </div>

      <TxStatus status={txStatus} txHash={txHash} error={txError} onDismiss={() => setTxStatus(null)} />
      {loadError ? <div style={s.errorBanner}>{loadError}</div> : null}

      {loading ? (
        <div style={s.empty}>Loading schedules...</div>
      ) : visibleSchedules.length === 0 ? (
        <div style={s.empty}>{isOfficer ? "No schedules assigned to your account." : "No distribution schedules found."}</div>
      ) : (
        <div style={s.list}>
          {visibleSchedules.map((sc) => {
            const distributedCount = Number(sc.distributed || 0);
            const totalFarmersCount = Number(sc.totalFarmers || 0);
            const pct = progressPercent(distributedCount, totalFarmersCount);
            const windowMeta = getWindowMeta(sc);
            const canDistribute = windowMeta.code === "active" && sc.status !== "Complete";
            return (
              <div key={sc.id} style={{ ...card, padding: "14px", marginBottom: "10px" }}>
                <div style={s.schedHeader}>
                  <div>
                    <div style={s.schedTitle}>{sc.location}</div>
                    <div style={s.schedMeta}>
                      Officer: <strong>{sc.officer || sc.officerId || "Unassigned"}</strong> - {sc.startDate} to {sc.endDate}
                    </div>
                  </div>
                  <div style={s.badgeRow}>
                    <span style={badge(windowMeta.badge)}>{windowMeta.label}</span>
                    <span style={badge(STATUS_VARIANT[sc.status] || "gray")}>{sc.status}</span>
                  </div>
                </div>

                <div style={s.progressRow}>
                  <div style={s.progressLabel}>
                    <span>Distribution Progress</span>
                    <span>
                      {distributedCount} / {totalFarmersCount} farmers - {pct}% collected
                    </span>
                  </div>
                  <div style={s.progressTrack}>
                    <div style={{ ...s.progressFill, width: `${pct}%` }} />
                  </div>
                </div>

                <div style={s.nrcRow}>
                  <input
                    type="text"
                    placeholder="Enter farmer NRC (e.g. 123456/78/9)"
                    value={nrcBySchedule[sc.id] || ""}
                    onChange={(e) => setNrcBySchedule((p) => ({ ...p, [sc.id]: e.target.value }))}
                    style={s.nrcInput}
                    disabled={!canDistribute && !isAdmin}
                  />
                </div>

                <div style={s.schedActions}>
                  <button style={btnOutline} onClick={() => handleView(sc.id)}>
                    View Details
                  </button>

                  {isOfficer && (
                    <button style={btnPrimary} onClick={() => handleMark({ scheduleId: sc.id, scheduleOfficerId: sc.officerId })} disabled={!canDistribute || txStatus === "pending"}>
                      {canDistribute ? "Distribute by NRC" : "Window Not Active"}
                    </button>
                  )}

                  {isAdmin && sc.status !== "Complete" && (
                    <button style={btnPrimary} onClick={() => handleMark({ scheduleId: sc.id, scheduleOfficerId: sc.officerId, adminOverride: true })} disabled={txStatus === "pending"}>
                      Admin Mark Distributed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

function getWindowMeta(schedule) {
  const start = schedule?.startDate || schedule?.start_date;
  const end = schedule?.endDate || schedule?.end_date;
  if (!start || !end) return { code: "unknown", label: "Window Unknown", badge: "gray" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  if (now < startDate) return { code: "upcoming", label: "Window Upcoming", badge: "yellow" };
  if (now > endDate) return { code: "closed", label: "Window Closed", badge: "red" };
  return { code: "active", label: "Window Active", badge: "green" };
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

function Selector({ label, options, value, onChange, disabled = false, loading = false }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <label style={s.fieldLabel}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...s.select, ...(disabled ? s.selectDisabled : {}) }}
        disabled={disabled || loading}
      >
        <option value="">{loading ? "- Loading... -" : `- Select ${label} -`}</option>
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

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function progressPercent(distributed, total) {
  const safeDistributed = Number(distributed || 0);
  const safeTotal = Number(total || 0);
  if (!safeTotal || safeDistributed <= 0) return 0;
  const raw = (safeDistributed / safeTotal) * 100;
  if (raw > 0 && raw < 1) return 1;
  return Math.min(100, Math.round(raw));
}

const s = {
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  title: { fontSize: "18px", fontWeight: "700", color: colors.navy, margin: 0 },
  subtitle: { fontSize: "12px", color: colors.muted, margin: "2px 0 0" },
  list: {},
  schedHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px", gap: "8px" },
  schedTitle: { fontSize: "13px", fontWeight: "700", color: colors.navy },
  schedMeta: { fontSize: "11px", color: "#666", marginTop: "2px" },
  badgeRow: { display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" },
  progressRow: { marginBottom: "10px" },
  progressLabel: { display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#666", marginBottom: "4px" },
  progressTrack: { height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" },
  progressFill: { height: "100%", background: colors.green, borderRadius: "4px", transition: "width 0.4s" },
  nrcRow: { marginBottom: "10px" },
  nrcInput: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "12px",
    color: "#111827",
    background: "#fff",
  },
  schedActions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  empty: { padding: "40px", textAlign: "center", color: colors.muted },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  },
  createModal: {
    width: "100%",
    maxWidth: "560px",
    borderRadius: "12px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 18px 48px rgba(0,0,0,0.2)",
    padding: "16px",
  },
  createTitle: { fontSize: "16px", fontWeight: "700", color: colors.navy, margin: 0 },
  createSubtitle: { fontSize: "12px", color: colors.muted, margin: "4px 0 12px" },
  fieldLabel: { fontSize: "11px", fontWeight: "600", color: "#666", marginBottom: "4px", display: "block" },
  select: { width: "100%", padding: "7px 10px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "12px" },
  selectDisabled: { background: "#f3f4f6", color: "#6b7280" },
  dateGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "6px" },
  dateInput: { width: "100%", padding: "7px 8px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "12px" },
  scopePreview: { marginTop: "10px", fontSize: "12px", color: "#334155", background: "#f8fafc", borderRadius: "6px", padding: "8px 10px" },
  createError: { marginTop: "8px", color: "#b91c1c", fontSize: "12px" },
  createActions: { marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" },
  errorBanner: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "12px", padding: "10px 12px", marginBottom: "12px" },
};
