import { useEffect, useMemo, useState } from "react";
import Layout from "../Components/Layout";
import AppModal from "../Components/AppModal";
import CreateOfficerModal from "../Components/CreateOfficerModal";
import StatCard from "../Components/StatCard";
import { colors, badge, btnPrimary, btnOutline, card } from "../theme";
import {
  AllocationIcon,
  FarmersIcon,
  LocationIcon,
  OfficersIcon,
  PendingIcon,
  SettingsIcon,
  SuccessIcon,
} from "../Components/icons";
import { fetchRecentFarmerRegistrationTxs } from "../lib/agriTrust";
import { useWalletContext } from "../context/WalletContext";

const STATUS_VARIANT = { Active: "green", Suspended: "red", Inactive: "gray" };
const OVERVIEW_TONES = {
  blue: { background: "#dbeafe", color: "#1d4ed8" },
  amber: { background: "#fef3c7", color: "#b45309" },
  slate: { background: "#e2e8f0", color: "#334155" },
};

export default function Officers({
  onNavigate,
  fetchOfficers,
  onAddOfficer,
  onViewOfficer,
  onDeactivate,
  onReactivate,
}) {
  const { account, user } = useWalletContext();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState({ open: false, title: "", message: "" });
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewOfficer, setViewOfficer] = useState(null);
  const [recentTxs, setRecentTxs] = useState([]);
  const [commandError, setCommandError] = useState("");

  const connectedWallet = account || user?.wallet || user?.id || "";

  const loadOfficers = async () => {
    setLoading(true);
    try {
      const data = await fetchOfficers?.();
      setOfficers(data || []);
      setCommandError("");
    } catch (err) {
      setOfficers([]);
      setCommandError(err?.message || "Unable to read officer records from the blockchain.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []); // eslint-disable-line

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!connectedWallet) return;
      try {
        const txs = await fetchRecentFarmerRegistrationTxs(connectedWallet, 5);
        if (!alive) return;
        setRecentTxs(txs || []);
      } catch (err) {
        if (!alive) return;
        setRecentTxs([]);
        setCommandError(err?.message || "Unable to query officer activity.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [connectedWallet]);

  const blockchainConfirmedRecords = useMemo(
    () => officers.reduce((sum, officer) => sum + Number(officer?.approved || 0), 0),
    [officers]
  );
  const active = officers.filter((o) => o.status === "Active").length;
  const inactive = officers.filter((o) => o.status !== "Active").length;
  const districtsCovered = useMemo(() => {
    const covered = new Set(
      officers
        .map((officer) => [officer?.province, officer?.district].filter(Boolean).join(" / "))
        .filter(Boolean)
    );
    return covered.size;
  }, [officers]);
  const pendingReviews = useMemo(
    () => officers.reduce((sum, officer) => sum + Number(officer?.pending || 0), 0),
    [officers]
  );
  const latestActivityLabel = recentTxs[0]?.name
    ? `${recentTxs[0].name} registration recorded`
    : recentTxs[0]?.farmerId
      ? `Farmer ${recentTxs[0].farmerId} activity recorded`
      : "No recent officer activity";

  const handleViewOfficer = async (id) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewOfficer(null);
    try {
      const details = await onViewOfficer?.(id);
      setViewOfficer(details || null);
    } catch (err) {
      setViewError(err?.message || "Failed to load officer details.");
    } finally {
      setViewLoading(false);
    }
  };

  const applyStatusUpdate = (id, status) => {
    setOfficers((prev) => prev.map((o) => (o.id === id ? { ...o, status, isActive: status === "Active" } : o)));
    setViewOfficer((prev) => (prev?.id === id ? { ...prev, status, isActive: status === "Active" } : prev));
  };

  const handleDeactivate = async (id) => {
    try {
      const result = await onDeactivate?.(id);
      applyStatusUpdate(id, "Inactive");
      setNotice({
        open: true,
        title: "Officer Deactivated",
        message: `Officer wallet ${id}\nTx: ${result?.txHash || "submitted"}`,
      });
    } catch (err) {
      setNotice({
        open: true,
        title: "Deactivate Failed",
        message: err?.message || "Failed to deactivate officer.",
      });
    }
  };

  const handleReactivate = async (id) => {
    try {
      const result = await onReactivate?.(id);
      applyStatusUpdate(id, "Active");
      setNotice({
        open: true,
        title: "Officer Reactivated",
        message: `Officer wallet ${id}\nTx: ${result?.txHash || "submitted"}`,
      });
    } catch (err) {
      setNotice({
        open: true,
        title: "Reactivate Failed",
        message: err?.message || "Failed to reactivate officer.",
      });
    }
  };

  return (
    <Layout activePath="/officers" onNavigate={onNavigate} searchPlaceholder="Search officer records...">
      <style>{`
        @keyframes officerPulse {
          0% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(34,197,94,0.45); }
          70% { transform: scale(1); box-shadow: 0 0 0 14px rgba(34,197,94,0); }
          100% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>

      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>Officer Operations Centre</h2>
          <p style={s.subtitle}>Monitor district field officers, authorization status, coverage, and recent registration activity from one operational view.</p>
        </div>
        <button style={btnPrimary} onClick={() => setCreateOpen(true)}>+ Authorize Officer</button>
      </div>

      {commandError ? <div style={s.errorBanner}>{commandError}</div> : null}

      <div style={s.commandGrid}>
        <div style={s.mainColumn}>
          <div style={s.walletCard}>
            <div style={s.walletHero}>
              <div style={s.heroBadge}>
                <OfficersIcon size={18} />
              </div>
              <div>
                <div style={s.walletLabel}>Ministry Session</div>
                <div style={s.walletAddress}>{user?.role || "Officer"} Control Desk</div>
                <div style={s.walletSub}>Connected officer workspace for district operations, approvals follow-up, and field registration tracking.</div>
              </div>
            </div>
            <div style={s.walletMetrics}>
              <div style={s.walletMetric}>
                <span style={s.walletMetricLabel}>Connected Identity</span>
                <span style={s.walletMetricValue}>{formatWallet(connectedWallet) || "No wallet connected"}</span>
              </div>
              <div style={s.walletMetric}>
                <span style={s.walletMetricLabel}>Latest Activity</span>
                <span style={s.walletMetricValue}>{latestActivityLabel}</span>
              </div>
            </div>
          </div>

          <div style={s.statsRow}>
            <div style={s.confirmedCard}>
              <div style={s.confirmedHeader}>
                <span style={s.pulseIcon}><SuccessIcon size={14} /></span>
                <span style={s.confirmedLabel}>Verified Records</span>
              </div>
              <div style={s.confirmedValue}>{blockchainConfirmedRecords.toLocaleString()}</div>
              <div style={s.confirmedSub}>Farmer records confirmed through authorized officer activity.</div>
            </div>
            <StatCard icon={<OfficersIcon size={20} />} label="Active Officers" value={active.toLocaleString()} sub="Officers ready for field service" />
            <StatCard icon={<AllocationIcon size={20} />} label="Inactive Officers" value={inactive.toLocaleString()} sub="Accounts awaiting reactivation" subColor={colors.warning} />
          </div>

          <div style={s.overviewRow}>
            <OverviewPanel
              icon={<LocationIcon size={18} />}
              title="Kabwe District Coverage"
              value={districtsCovered.toLocaleString()}
              note="Operational Kabwe District areas represented in the current register"
              tone="blue"
            />
            <OverviewPanel
              icon={<PendingIcon size={18} />}
              title="Pending Reviews"
              value={pendingReviews.toLocaleString()}
              note="Farmer records still awaiting district-level action"
              tone="amber"
            />
            <OverviewPanel
              icon={<SettingsIcon size={18} />}
              title="Control Status"
              value={connectedWallet ? "Connected" : "Offline"}
              note="Officer workspace linked to the current authorized session"
              tone="slate"
            />
          </div>

          {loading ? (
            <div style={s.empty}>Loading officer records...</div>
          ) : (
            <div style={s.grid}>
              {officers.map((o) => {
                const variant = STATUS_VARIANT[o.status] || "gray";
                return (
                  <div key={o.id} style={s.officerCard}>
                    <div style={s.cardTop}>
                      <div style={s.officerHeading}>
                        <div style={s.officerIconWrap}>
                          <OfficersIcon size={18} />
                        </div>
                        <div style={s.officerName}>{o.name}</div>
                        <div style={s.officerRole}>{formatWallet(o.wallet)}</div>
                      </div>
                      <span style={badge(variant)}>{o.status}</span>
                    </div>

                    <div style={s.assignmentStrip}>
                      <span style={s.assignmentChip}>
                        <LocationIcon size={14} />
                        {formatAssignment(o)}
                      </span>
                    </div>

                    <div style={s.commandStats}>
                      <OfficerStat icon={<FarmersIcon size={15} />} val={o.farmers} lbl="Registrations" />
                      <OfficerStat icon={<SuccessIcon size={15} />} val={o.approved} lbl="Confirmed" />
                      <OfficerStat icon={<PendingIcon size={15} />} val={o.pending} lbl="Pending" />
                    </div>

                    <div style={s.chainMeta}>
                      <div>Authorized: {formatDate(o.createdAt)}</div>
                      <div>Last update: {formatDate(o.updatedAt)}</div>
                    </div>

                    <div style={s.cardActions}>
                      <button style={btnOutline} onClick={() => handleViewOfficer(o.id)}>View</button>
                      {o.status === "Active"
                        ? <button style={{ ...btnOutline, color: colors.danger, borderColor: colors.danger }} onClick={() => handleDeactivate(o.id)}>Deactivate</button>
                        : <button style={{ ...btnOutline, color: colors.green, borderColor: colors.green }} onClick={() => handleReactivate(o.id)}>Reactivate</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside style={s.sidebar}>
          <div style={s.sidebarTitle}>Recent Field Activity</div>
          <div style={s.sidebarSub}>Latest farmer registration events captured for the connected officer session.</div>

          {recentTxs.length === 0 ? (
            <div style={s.emptySidebar}>No recent farmer registration activity was found for this officer session yet.</div>
          ) : (
            recentTxs.map((tx) => (
              <div key={tx.hash} style={s.txItem}>
                <div style={s.txTop}>
                  <span style={s.txIcon}><FarmersIcon size={14} /></span>
                  <div style={s.txHash}>{truncateHash(tx.hash)}</div>
                </div>
                <div style={s.txMeta}>{tx.farmerId || "Farmer"} {tx.name ? `• ${tx.name}` : ""}</div>
              </div>
            ))
          )}
        </aside>
      </div>

      <CreateOfficerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          const result = await onAddOfficer?.(payload);
          await loadOfficers();
          setNotice({
            open: true,
            title: "Officer Authorized",
            message: `Wallet: ${payload.walletAddress}\nTx: ${result?.txHash || "submitted"}`,
          });
        }}
      />

      <AppModal
        open={viewOpen}
        title="Officer Details"
        onClose={() => setViewOpen(false)}
        content={(
          <div style={s.detailGrid}>
            {viewLoading && <div style={s.detailNote}>Loading officer details...</div>}
            {!viewLoading && viewError && <div style={s.detailError}>{viewError}</div>}
            {!viewLoading && !viewError && (
              <>
                <DetailRow label="Officer Wallet" value={viewOfficer?.wallet || viewOfficer?.id || "-"} />
                <DetailRow label="Officer Name" value={viewOfficer?.name || "Authorized Officer"} />
                <DetailRow label="Role" value={viewOfficer?.role || "Officer"} />
                <DetailRow label="Status" value={viewOfficer?.status || "-"} />
                <DetailRow label="Assigned Kabwe District Area" value={formatAssignment(viewOfficer)} />
                <DetailRow label="Created" value={formatDate(viewOfficer?.createdAt)} />
                <DetailRow label="Updated" value={formatDate(viewOfficer?.updatedAt)} />
                <DetailRow label="Farmer Registrations" value={viewOfficer?.farmers ?? "-"} />
                <DetailRow label="Confirmed Records" value={viewOfficer?.approved ?? "-"} />
                <DetailRow label="Pending" value={viewOfficer?.pending ?? "-"} />
              </>
            )}
          </div>
        )}
      />

      <AppModal
        open={notice.open}
        title={notice.title}
        message={notice.message}
        onClose={() => setNotice((n) => ({ ...n, open: false }))}
      />
    </Layout>
  );
}

function OverviewPanel({ icon, title, value, note, tone }) {
  return (
    <div style={s.overviewCard}>
      <div style={s.overviewTop}>
        <span style={{ ...s.overviewIcon, ...(OVERVIEW_TONES[tone] || OVERVIEW_TONES.slate) }}>{icon}</span>
        <span style={s.overviewTitle}>{title}</span>
      </div>
      <div style={s.overviewValue}>{value}</div>
      <div style={s.overviewNote}>{note}</div>
    </div>
  );
}

function OfficerStat({ icon, val, lbl }) {
  return (
    <div style={s.officerStatCard}>
      <div style={s.officerStatIcon}>{icon}</div>
      <div style={s.officerStatValue}>{val ?? "-"}</div>
      <div style={s.officerStatLabel}>{lbl}</div>
    </div>
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

function formatWallet(value) {
  const wallet = String(value || "").trim();
  if (!wallet) return "";
  return wallet.length > 18 ? `${wallet.slice(0, 10)}...${wallet.slice(-8)}` : wallet;
}

function truncateHash(hash) {
  const value = String(hash || "");
  if (!value) return "-";
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function formatDate(timestamp) {
  const value = Number(timestamp || 0);
  if (!value) return "-";
  return new Date(value * 1000).toLocaleString();
}

function formatAssignment(officer) {
  const parts = [officer?.province, officer?.district, officer?.ward].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Area assignment pending";
}

const s = {
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  title: { fontSize: "20px", fontWeight: "700", color: colors.navy, margin: 0 },
  subtitle: { fontSize: "12px", color: colors.muted, margin: "2px 0 0", maxWidth: "640px" },
  errorBanner: { background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "10px", color: "#9a3412", padding: "10px 12px", marginBottom: "14px", fontSize: "12px" },
  commandGrid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px", alignItems: "start" },
  mainColumn: { minWidth: 0 },
  walletCard: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    color: colors.text,
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 14px 30px rgba(15,23,42,0.06)",
  },
  walletHero: { display: "flex", gap: "14px", alignItems: "flex-start" },
  heroBadge: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ecfdf5",
    color: "#166534",
    border: "1px solid #bbf7d0",
    flexShrink: 0,
  },
  walletLabel: { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#166534", marginBottom: "6px" },
  walletAddress: { fontSize: "22px", fontWeight: "700", color: colors.navy, fontFamily: "monospace" },
  walletSub: { fontSize: "12px", color: colors.muted, marginTop: "4px", maxWidth: "560px", lineHeight: 1.55 },
  walletMetrics: { display: "grid", gap: "10px", minWidth: "230px" },
  walletMetric: { background: "#f8fafc", borderRadius: "14px", padding: "12px 14px", border: "1px solid #e2e8f0" },
  walletMetricLabel: { display: "block", fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" },
  walletMetricValue: { fontSize: "15px", fontWeight: "700", color: colors.navy, lineHeight: 1.4 },
  statsRow: { display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: "12px", marginBottom: "16px" },
  overviewRow: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "16px" },
  overviewCard: {
    ...card,
    padding: "15px 16px",
    borderRadius: "14px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
  },
  overviewTop: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" },
  overviewIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  overviewTitle: { fontSize: "12px", fontWeight: "700", color: colors.navy },
  overviewValue: { fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" },
  overviewNote: { fontSize: "11px", color: colors.muted, lineHeight: 1.5 },
  confirmedCard: {
    background: "linear-gradient(145deg, #052e16 0%, #14532d 60%, #166534 100%)",
    borderRadius: "14px",
    padding: "16px",
    color: "white",
    border: "1px solid rgba(74,222,128,0.28)",
    boxShadow: "0 16px 36px rgba(22,163,74,0.18)",
  },
  confirmedHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  pulseIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#22c55e",
    color: "white",
    animation: "officerPulse 1.8s ease-in-out infinite",
  },
  confirmedLabel: { fontSize: "12px", fontWeight: "700", letterSpacing: "0.03em" },
  confirmedValue: { fontSize: "32px", fontWeight: "800", marginBottom: "4px" },
  confirmedSub: { fontSize: "11px", color: "#dcfce7" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" },
  officerCard: {
    ...card,
    padding: "16px",
    borderRadius: "14px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    boxShadow: "0 14px 30px rgba(15,23,42,0.06)",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "14px" },
  officerHeading: { display: "grid", gap: "2px" },
  officerIconWrap: {
    width: "34px",
    height: "34px",
    borderRadius: "12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dcfce7",
    color: "#166534",
    marginBottom: "8px",
  },
  officerName: { fontSize: "14px", fontWeight: "700", color: colors.navy, marginBottom: "2px" },
  officerRole: { fontSize: "11px", color: colors.muted, fontFamily: "monospace" },
  assignmentStrip: { marginBottom: "12px" },
  assignmentChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "11px",
    fontWeight: "600",
  },
  commandStats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" },
  officerStatCard: { textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "10px 8px" },
  officerStatIcon: { color: "#166534", display: "inline-flex", marginBottom: "6px" },
  officerStatValue: { fontSize: "18px", fontWeight: "700", color: "#166534" },
  officerStatLabel: { fontSize: "10px", color: "#94a3b8" },
  chainMeta: { fontSize: "11px", color: "#64748b", display: "grid", gap: "4px", marginBottom: "12px" },
  cardActions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  sidebar: {
    ...card,
    padding: "16px",
    borderRadius: "14px",
    position: "sticky",
    top: "92px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  sidebarTitle: { fontSize: "14px", fontWeight: "700", color: colors.navy, marginBottom: "4px" },
  sidebarSub: { fontSize: "11px", color: colors.muted, lineHeight: 1.5, marginBottom: "12px" },
  txItem: { padding: "10px 0", borderBottom: "1px solid #eef2f7" },
  txTop: { display: "flex", alignItems: "center", gap: "8px" },
  txIcon: {
    width: "26px",
    height: "26px",
    borderRadius: "8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dcfce7",
    color: "#166534",
    flexShrink: 0,
  },
  txHash: { fontSize: "12px", fontWeight: "700", color: colors.navy, fontFamily: "monospace" },
  txMeta: { fontSize: "10px", color: colors.muted, marginTop: "4px" },
  emptySidebar: { fontSize: "12px", color: colors.muted, background: "#f8fafc", borderRadius: "10px", padding: "12px" },
  empty: { padding: "40px", textAlign: "center", color: colors.muted },
  detailGrid: { display: "grid", gap: "10px", marginTop: "8px" },
  detailRow: { display: "grid", gridTemplateColumns: "140px 1fr", gap: "12px", alignItems: "center", padding: "6px 8px", background: "#f8fafc", borderRadius: "8px" },
  detailLabel: { fontSize: "11px", fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.6px" },
  detailValue: { fontSize: "12px", color: colors.text, wordBreak: "break-word" },
  detailNote: { fontSize: "12px", color: colors.muted },
  detailError: { fontSize: "12px", color: colors.danger },
};
