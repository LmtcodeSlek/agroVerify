import { useState, useEffect } from "react";
import Layout from "../Components/Layout";
import AppModal from "../Components/AppModal";
import CreateOfficerModal from "../Components/CreateOfficerModal";
import TxStatus from "../Components/TxStatus";
import { colors, badge, btnPrimary, btnOutline, card } from "../theme";
import { AllocationIcon, GlobeIcon, ReportIcon, SettingsIcon, ShieldIcon, UsersIcon } from "../Components/icons";
import { useWalletContext } from "../context/WalletContext";
import useContract from "../hooks/useContract";

const TABS = [
  { key: "users", label: "User Management", icon: UsersIcon },
  { key: "policy", label: "System Policy", icon: AllocationIcon },
  { key: "security", label: "Security", icon: ShieldIcon },
  { key: "regions", label: "Regions", icon: GlobeIcon },
  { key: "reports", label: "Reports", icon: ReportIcon },
];

const USER_VARIANT = { Admin: "blue", Officer: "gray" };
const STATUS_VARIANT = { Active: "green", Suspended: "red", Inactive: "gray" };

export default function Settings({
  onNavigate,
  fetchSettings,
  onSaveSettings,
  onCreateOfficer,
  onDeactivateUser,
  onReactivateUser,
  onResetPasswords,
}) {
  const { account, chainId, hasProvider, connectWallet, isConnecting } = useWalletContext();
  const { sendTx, txStatus, txHash, txError, resetTx, defaultWriteMethod, defaultWriteArgs, isContractConfigured, contractAddress } = useContract();

  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [policy, setPolicy] = useState({ bagsPerFarmer: 3, deadline: "", requireApproval: true, auditLogging: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    (async () => {
      try {
        const data = (await fetchSettings?.()) || {};
        if (data.users) setUsers(data.users);
        if (data.policy) setPolicy((p) => ({ ...p, ...data.policy }));
      } catch (err) {
        setNotice({
          open: true,
          title: "Settings Unavailable",
          message: err?.message || "Failed to load settings.",
        });
      }
    })();
  }, []); // eslint-disable-line

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSaveSettings?.({ policy, users });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSendContractTx = async () => {
    await sendTx(defaultWriteMethod, defaultWriteArgs);
  };

  const shortAccount = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not connected";

  return (
    <Layout activePath="/settings" onNavigate={onNavigate}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>
            <SettingsIcon size={18} />
            <span>System Settings</span>
          </h2>
          <p style={s.subtitle}>Policies - Users - Security</p>
        </div>
        <button style={btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      <div style={s.grid}>
        <div style={{ ...card, overflow: "hidden", alignSelf: "start" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} style={{ ...s.tabItem, ...(activeTab === t.key ? s.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
                <span style={s.tabIcon}>
                  <Icon size={14} />
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ ...card, padding: "20px" }}>
          <MetaMaskPanel
            hasProvider={hasProvider}
            account={account}
            shortAccount={shortAccount}
            chainId={chainId}
            connectWallet={connectWallet}
            isConnecting={isConnecting}
            onSendTx={handleSendContractTx}
            isContractConfigured={isContractConfigured}
            contractAddress={contractAddress}
            writeMethod={defaultWriteMethod}
            txStatus={txStatus}
            txHash={txHash}
            txError={txError}
            onDismissTx={resetTx}
          />

          {activeTab === "users" && (
            <UsersPanel
              users={users}
              onOpenCreate={() => setCreateOpen(true)}
              onDeactivate={onDeactivateUser}
              onReactivate={onReactivateUser}
              onResetPasswords={onResetPasswords}
            />
          )}
          {activeTab === "policy" && <PolicyPanel policy={policy} onChange={setPolicy} />}
          {activeTab !== "users" && activeTab !== "policy" && <div style={s.comingSoon}>This section is coming soon.</div>}
        </div>
      </div>

      <CreateOfficerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          await onCreateOfficer?.(payload);
          try {
            const data = (await fetchSettings?.()) || {};
            if (data.users) setUsers(data.users);
          } catch {
            // Keep the success notice below even if the follow-up refresh fails.
          }
          setNotice({
            open: true,
            title: "Officer Authorized",
            message: `Wallet: ${payload.walletAddress}\nAuthorization stored on chain.`,
          });
        }}
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

function UsersPanel({ users, onOpenCreate, onDeactivate, onReactivate, onResetPasswords }) {
  return (
    <>
      <div style={s.panelTitle}>User Management</div>
      <div style={s.panelSub}>Create, deactivate, and assign officers to districts</div>

      <div style={{ ...card, marginBottom: "16px", overflow: "hidden" }}>
        <table style={s.table}>
          <thead>
            <tr style={{ background: colors.bg }}>
              {["Name", "Role", "District", "Status", "Action"].map((h) => (
                <th key={h} style={s.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={s.emptyCell}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td style={{ ...s.td, fontWeight: "600" }}>{u.name}</td>
                  <td style={s.td}>
                    <span style={badge(USER_VARIANT[u.role] || "gray")}>{u.role}</span>
                  </td>
                  <td style={s.td}>{u.district || "All Districts"}</td>
                  <td style={s.td}>
                    <span style={badge(STATUS_VARIANT[u.status] || "gray")}>{u.status}</span>
                  </td>
                  <td style={s.td}>
                    {u.status === "Active" ? (
                      <button style={{ ...s.actionBtn, color: colors.danger }} onClick={() => onDeactivate?.(u.id)}>
                        Deactivate
                      </button>
                    ) : (
                      <button style={{ ...s.actionBtn, color: colors.green }} onClick={() => onReactivate?.(u.id)}>
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button style={btnPrimary} onClick={onOpenCreate}>
          + Create Officer Account
        </button>
        <button style={btnOutline} onClick={onResetPasswords}>
          Reset Passwords
        </button>
      </div>
    </>
  );
}

function PolicyPanel({ policy, onChange }) {
  const set = (key, val) => onChange((p) => ({ ...p, [key]: val }));
  return (
    <>
      <div style={s.panelTitle}>System Policy Defaults</div>
      <div style={s.panelSub}>Global rules applied unless overridden per allocation</div>

      <SettingsRow label="Default Bags per Farmer" sub="Applied if not overridden in allocation">
        <input type="number" value={policy.bagsPerFarmer} onChange={(e) => set("bagsPerFarmer", Number(e.target.value))} style={s.numInput} />
      </SettingsRow>
      <SettingsRow label="Registration Deadline" sub="No new registrations after this date">
        <input type="date" value={policy.deadline} onChange={(e) => set("deadline", e.target.value)} style={s.dateInput} />
      </SettingsRow>
      <SettingsRow label="Require Approval Before Allocation" sub="Pending farmers are excluded from allocations">
        <Toggle on={policy.requireApproval} onToggle={() => set("requireApproval", !policy.requireApproval)} />
      </SettingsRow>
      <SettingsRow label="Enable Audit Logging" sub="Log all system actions (recommended: ON)">
        <Toggle on={policy.auditLogging} onToggle={() => set("auditLogging", !policy.auditLogging)} />
      </SettingsRow>
    </>
  );
}

function SettingsRow({ label, sub, children }) {
  return (
    <div style={s.settingsRow}>
      <div>
        <div style={s.settingsLabel}>{label}</div>
        {sub && <div style={s.settingsSub}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <div style={{ width: "38px", height: "20px", background: on ? colors.green : "#d1d5db", borderRadius: "10px", position: "relative", cursor: "pointer", flexShrink: 0 }} onClick={onToggle}>
      <div style={{ position: "absolute", width: "16px", height: "16px", background: "white", borderRadius: "50%", top: "2px", left: on ? "auto" : "2px", right: on ? "2px" : "auto", transition: "all 0.2s" }} />
    </div>
  );
}

function MetaMaskPanel({
  hasProvider,
  account,
  shortAccount,
  chainId,
  connectWallet,
  isConnecting,
  onSendTx,
  isContractConfigured,
  contractAddress,
  writeMethod,
  txStatus,
  txHash,
  txError,
  onDismissTx,
}) {
  return (
    <div style={{ ...s.metaMaskPanel, marginBottom: "18px" }}>
      <div style={s.metaMaskTitle}>MetaMask Contract Actions</div>
      <div style={s.metaMaskSub}>
        Connect wallet, then send a signer-based contract transaction. MetaMask popup appears on every transaction.
      </div>

      {!hasProvider && (
        <div style={s.metaMaskWarning}>MetaMask not detected in this browser. Install extension and refresh.</div>
      )}

      <div style={s.metaMaskStats}>
        <div style={s.metaMaskStatRow}>
          <span style={s.metaMaskLabel}>Wallet</span>
          <span style={s.metaMaskValue}>{shortAccount}</span>
        </div>
        <div style={s.metaMaskStatRow}>
          <span style={s.metaMaskLabel}>Chain ID</span>
          <span style={s.metaMaskValue}>{chainId || "-"}</span>
        </div>
        <div style={s.metaMaskStatRow}>
          <span style={s.metaMaskLabel}>Contract</span>
          <span style={s.metaMaskMono}>{contractAddress || "Set REACT_APP_CONTRACT_ADDRESS"}</span>
        </div>
        <div style={s.metaMaskStatRow}>
          <span style={s.metaMaskLabel}>Write Method</span>
          <span style={s.metaMaskMono}>{writeMethod || "Set REACT_APP_CONTRACT_WRITE_METHOD"}</span>
        </div>
      </div>

      <div style={s.metaMaskActions}>
        <button style={btnOutline} onClick={connectWallet} disabled={!hasProvider || isConnecting}>
          {isConnecting ? "Connecting..." : account ? "Reconnect Wallet" : "Connect MetaMask"}
        </button>
        <button style={btnPrimary} onClick={onSendTx} disabled={!account || !isContractConfigured || txStatus === "pending"}>
          {txStatus === "pending" ? "Waiting Confirmation..." : "Send Transaction"}
        </button>
      </div>

      <TxStatus status={txStatus} txHash={txHash} error={txError} onDismiss={onDismissTx} />
    </div>
  );
}

const s = {
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  title: { fontSize: "18px", fontWeight: "700", color: colors.navy, margin: 0, display: "flex", alignItems: "center", gap: "8px" },
  subtitle: { fontSize: "12px", color: colors.muted, margin: "2px 0 0" },
  grid: { display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px" },
  tabItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "11px 16px",
    fontSize: "12px",
    color: "#555",
    cursor: "pointer",
    borderBottom: "1px solid #f5f5f5",
    background: "none",
    border: "none",
    textAlign: "left",
    borderLeft: "3px solid transparent",
  },
  tabIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center" },
  tabActive: { background: colors.greenLight, color: colors.green, fontWeight: "600", borderLeft: `3px solid ${colors.green}` },
  panelTitle: { fontSize: "14px", fontWeight: "700", color: colors.navy, marginBottom: "4px" },
  panelSub: { fontSize: "11px", color: colors.muted, marginBottom: "20px" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: colors.muted, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${colors.border}` },
  td: { padding: "10px 14px", fontSize: "12px", color: colors.text, borderBottom: "1px solid #f5f5f5" },
  emptyCell: { padding: "20px", textAlign: "center", color: colors.muted, fontSize: "13px" },
  actionBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "3px 6px", borderRadius: "4px" },
  settingsRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f5f5f5" },
  settingsLabel: { fontSize: "12px", fontWeight: "600", color: "#333" },
  settingsSub: { fontSize: "11px", color: colors.muted, marginTop: "1px" },
  numInput: { width: "70px", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "13px", textAlign: "center" },
  dateInput: { padding: "6px 10px", border: "1px solid #e0e0e0", borderRadius: "6px", fontSize: "12px", width: "140px" },
  comingSoon: { padding: "40px", textAlign: "center", color: colors.muted, fontSize: "13px" },
  metaMaskPanel: { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px", background: "#f8fafc" },
  metaMaskTitle: { fontSize: "13px", fontWeight: "700", color: colors.navy, marginBottom: "3px" },
  metaMaskSub: { fontSize: "11px", color: colors.muted, marginBottom: "10px" },
  metaMaskWarning: { fontSize: "11px", color: colors.danger, background: "#fef2f2", border: "1px solid #fecaca", padding: "8px", borderRadius: "6px", marginBottom: "10px" },
  metaMaskStats: { border: "1px solid #e5e7eb", borderRadius: "8px", background: "white", marginBottom: "10px" },
  metaMaskStatRow: { display: "flex", justifyContent: "space-between", gap: "10px", padding: "8px 10px", borderBottom: "1px solid #f3f4f6" },
  metaMaskLabel: { fontSize: "11px", color: colors.muted },
  metaMaskValue: { fontSize: "12px", fontWeight: "600", color: colors.navy },
  metaMaskMono: { fontSize: "11px", fontFamily: "monospace", color: colors.text, maxWidth: "62%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  metaMaskActions: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" },
};
