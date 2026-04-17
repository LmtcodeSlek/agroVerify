/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function assertIncludes(haystack, needle, filePath) {
  if (!haystack.includes(needle)) {
    throw new Error(`Patch failed for ${filePath}: missing expected marker: ${needle}`);
  }
}

function replaceOnce(source, searchValue, replaceValue, filePath) {
  const index = source.indexOf(searchValue);
  if (index === -1) {
    throw new Error(`Patch failed for ${filePath}: could not find block to replace.`);
  }
  const next = source.replace(searchValue, replaceValue);
  if (next === source) {
    throw new Error(`Patch failed for ${filePath}: replacement did not change content.`);
  }
  return next;
}

function replaceOnceRegex(source, regex, replaceValue, filePath) {
  if (!(regex instanceof RegExp)) {
    throw new Error(`Patch failed for ${filePath}: replaceOnceRegex requires a RegExp.`);
  }
  const next = source.replace(regex, replaceValue);
  if (next === source) {
    throw new Error(`Patch failed for ${filePath}: regex replacement did not change content.`);
  }
  return next;
}

function patchFile(filePath, patchFn) {
  const abs = path.resolve(filePath);
  const before = read(abs);
  const after = patchFn(before, abs);
  if (after === before) {
    console.log("No changes:", abs);
    return;
  }
  write(abs, after);
  console.log("Patched:", abs);
}

const ADMIN_PORTAL_ROOT = path.resolve(__dirname, "..", "..", "frontend", "admin-portal");

function adminPortalPath(...parts) {
  return path.join(ADMIN_PORTAL_ROOT, ...parts);
}

function main() {
  // 1) Update hooks/useContract.js (replace entire file)
  patchFile(adminPortalPath("src", "hooks", "useContract.js"), (_before, filePath) => {
    const next = `import { useState, useCallback, useMemo, useEffect } from "react";
import { ethers } from "ethers";
import useWallet from "./useWallet";

const FALLBACK_ABI = [
  "function owner() view returns (address)",
  "function registerFarmer(string farmerId, bytes32 dataHash)",
  "function verifyFarmer(string farmerId)",
  "function allocateFertilizer(string farmerId, uint256 quantity)",
  "function confirmDistribution(string farmerId)",
  "function isOfficerActive(address wallet) view returns (bool)",
  "event FarmerVerified(uint256 timestamp, address wallet, string farmerId)",
];

const APPROVE_METHOD = (process.env.REACT_APP_APPROVE_FARMER_WRITE_METHOD || "verifyFarmer").trim();
const OWNER_ONLY_MESSAGE = "Access Denied: Only the District Admin (contract owner) can approve farmers.";

function parseArgs(raw) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
}

function toLowerAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function extractErrorMessage(err) {
  return (
    err?.reason ||
    err?.data?.message ||
    err?.shortMessage ||
    err?.message ||
    "Transaction failed."
  );
}

/**
 * useContract
 * Build an ethers Contract using MetaMask signer from BrowserProvider.
 */
export function useContract() {
  const { account, hasProvider, connect } = useWallet();
  const [txStatus, setTxStatus] = useState(null); // null | "pending" | "success" | "error"
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);

  const [ownerAddress, setOwnerAddress] = useState(null);
  const [signerAddress, setSignerAddress] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [ownershipLoading, setOwnershipLoading] = useState(false);
  const [ownershipError, setOwnershipError] = useState(null);

  const address = process.env.REACT_APP_CONTRACT_ADDRESS || "";
  const abiJson = process.env.REACT_APP_CONTRACT_ABI || "";
  const defaultWriteMethod = process.env.REACT_APP_CONTRACT_WRITE_METHOD || "";
  const defaultWriteArgs = parseArgs(process.env.REACT_APP_CONTRACT_WRITE_ARGS || "");
  const chainId = Number(process.env.REACT_APP_CHAIN_ID || 31337);
  const chainIdHex = \`0x\${chainId.toString(16)}\`;
  const rpcUrl = process.env.REACT_APP_RPC_URL || "http://127.0.0.1:8545";

  const abi = useMemo(() => {
    if (!abiJson) return FALLBACK_ABI;
    try {
      return JSON.parse(abiJson);
    } catch {
      return FALLBACK_ABI;
    }
  }, [abiJson]);

  const ensureChain = useCallback(async () => {
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    if (String(currentChainId).toLowerCase() === chainIdHex.toLowerCase()) {
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError) {
      if (switchError?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainIdHex,
            chainName: "Hardhat Local",
            rpcUrls: [rpcUrl],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          }],
        });
      } else {
        throw switchError;
      }
    }
  }, [chainIdHex, rpcUrl]);

  const getProvider = useCallback(() => {
    if (!hasProvider) throw new Error("MetaMask not installed.");
    return new ethers.BrowserProvider(window.ethereum);
  }, [hasProvider]);

  const getReadContract = useCallback(async () => {
    if (!hasProvider) throw new Error("MetaMask not installed.");
    if (!address) throw new Error("Missing REACT_APP_CONTRACT_ADDRESS.");
    if (!abi?.length) throw new Error("Missing/invalid REACT_APP_CONTRACT_ABI.");
    await ensureChain();
    const provider = getProvider();
    return new ethers.Contract(address, abi, provider);
  }, [abi, address, ensureChain, getProvider, hasProvider]);

  const getContract = useCallback(async () => {
    if (!hasProvider) throw new Error("MetaMask not installed.");
    if (!address) throw new Error("Missing REACT_APP_CONTRACT_ADDRESS.");
    if (!abi?.length) throw new Error("Missing/invalid REACT_APP_CONTRACT_ABI.");

    if (!account) {
      await connect();
    }

    await ensureChain();

    const provider = getProvider();
    const signer = await provider.getSigner();
    const bytecode = await provider.getCode(address);
    if (!bytecode || bytecode === "0x") {
      throw new Error(\`No contract found at \${address} on chain \${chainId}.\`);
    }
    return new ethers.Contract(address, abi, signer);
  }, [abi, account, address, chainId, connect, ensureChain, getProvider, hasProvider]);

  const refreshOwnership = useCallback(async () => {
    if (!hasProvider || !address || !abi?.length || !account) {
      setOwnerAddress(null);
      setSignerAddress(null);
      setIsOwner(false);
      setOwnershipError(null);
      setOwnershipLoading(false);
      return null;
    }

    setOwnershipLoading(true);
    setOwnershipError(null);
    try {
      await ensureChain();
      const provider = getProvider();
      const signer = await provider.getSigner();
      const currentSigner = await signer.getAddress();
      const contract = await getReadContract();
      const currentOwner = await contract.owner();

      const ownerLower = toLowerAddress(currentOwner);
      const signerLower = toLowerAddress(currentSigner);
      const matches = Boolean(ownerLower && signerLower && ownerLower === signerLower);

      setOwnerAddress(currentOwner);
      setSignerAddress(currentSigner);
      setIsOwner(matches);
      return { ownerAddress: currentOwner, signerAddress: currentSigner, isOwner: matches };
    } catch (err) {
      setOwnerAddress(null);
      setSignerAddress(null);
      setIsOwner(false);
      setOwnershipError(extractErrorMessage(err));
      return null;
    } finally {
      setOwnershipLoading(false);
    }
  }, [abi, account, address, ensureChain, getProvider, getReadContract, hasProvider]);

  useEffect(() => {
    refreshOwnership();
  }, [refreshOwnership]);

  const subscribeEvent = useCallback(
    async (eventName, handler) => {
      const contract = await getReadContract();
      contract.on(eventName, handler);
      return () => contract.off(eventName, handler);
    },
    [getReadContract]
  );

  const callRead = useCallback(
    async (method, ...args) => {
      const contract = await getReadContract();
      return contract[method](...args);
    },
    [getReadContract]
  );

  const sendTx = useCallback(
    async (method = defaultWriteMethod, args = defaultWriteArgs) => {
      if (!method) {
        throw new Error("No contract write method provided.");
      }

      setTxStatus("pending");
      setTxHash(null);
      setTxError(null);

      try {
        const contract = await getContract();
        const normalizedArgs = Array.isArray(args) ? args : [args];

        // This call triggers the MetaMask transaction confirmation popup.
        const tx = await contract[method](...normalizedArgs);
        const receipt = await tx.wait();

        setTxHash(receipt?.hash || tx.hash || null);
        setTxStatus("success");
        return { tx, receipt, txHash: receipt?.hash || tx.hash || null };
      } catch (err) {
        const raw = extractErrorMessage(err);
        const rawLower = String(raw || "").toLowerCase();
        const methodLower = String(method || "").trim().toLowerCase();
        const approveLower = String(APPROVE_METHOD || "").trim().toLowerCase();

        let message = raw;
        if (rawLower.includes("owner only") || rawLower.includes("agritrust: owner only")) {
          message = OWNER_ONLY_MESSAGE;
        } else if (
          (err?.code === "CALL_EXCEPTION" || rawLower.includes("missing revert data")) &&
          methodLower &&
          approveLower &&
          methodLower === approveLower &&
          !isOwner
        ) {
          message = OWNER_ONLY_MESSAGE;
        }

        setTxError(message);
        setTxStatus("error");
        throw new Error(message);
      }
    },
    [defaultWriteArgs, defaultWriteMethod, getContract, isOwner]
  );

  const resetTx = useCallback(() => {
    setTxStatus(null);
    setTxHash(null);
    setTxError(null);
  }, []);

  return {
    callRead,
    sendTx,
    subscribeEvent,
    txStatus,
    txHash,
    txError,
    resetTx,
    contractAddress: address,
    defaultWriteMethod,
    defaultWriteArgs,
    isContractConfigured: Boolean(hasProvider && address && abi),

    // Ownership helpers (for hiding admin-only actions).
    isOwner,
    ownerAddress,
    signerAddress,
    ownershipLoading,
    ownershipError,
    refreshOwnership,
  };
}

export default useContract;
`;

    // Safety: ensure we still have key exports.
    assertIncludes(next, "export function useContract()", filePath);
    assertIncludes(next, "subscribeEvent", filePath);
    assertIncludes(next, "isOwner", filePath);
    return next;
  });

  // 2) Update Components/FarmerTable.jsx (targeted edits)
  patchFile(adminPortalPath("src", "Components", "FarmerTable.jsx"), (before, filePath) => {
    assertIncludes(before, "export default function FarmerTable", filePath);

    let next = before;

    if (!next.includes("canModerate")) {
      next = replaceOnce(
        next,
        "export default function FarmerTable({ farmers = [], onApprove, onReject, onView, loading, actionState = {} }) {",
        "export default function FarmerTable({ farmers = [], onApprove, onReject, onView, loading, actionState = {}, canModerate = false, showModeration = true }) {",
        filePath
      );
    }
    if (next.includes("canModerate = false") && !/export default function FarmerTable\(\{[^\n]*showModeration/.test(next)) {
      next = replaceOnceRegex(
        next,
        /export default function FarmerTable\(\{([\s\S]*?)canModerate\s*=\s*false\s*\}\)\s*\{/m,
        "export default function FarmerTable({$1canModerate = false, showModeration = true }) {",
        filePath
      );
    }

    if (!next.includes("f.farmerId?.toLowerCase().includes(search.toLowerCase())")) {
      next = replaceOnce(
        next,
        "      f.id?.toLowerCase().includes(search.toLowerCase());",
        "      f.id?.toLowerCase().includes(search.toLowerCase()) ||\n      f.farmerId?.toLowerCase().includes(search.toLowerCase());",
        filePath
      );
    }

    if (!next.includes("{f.farmerId || f.id}")) {
      next = replaceOnce(
        next,
        "<td style={s.td}><span style={s.mono}>{f.id}</span></td>",
        "<td style={s.td}><span style={s.mono}>{f.farmerId || f.id}</span></td>",
        filePath
      );
    }

    // Render Approve/Reject only for non-officers; disable when not owner.
    if (next.includes("{f.status === \"Pending\" && canModerate && (")) {
      next = replaceOnce(
        next,
        "{f.status === \"Pending\" && canModerate && (",
        "{f.status === \"Pending\" && showModeration && (",
        filePath
      );
    } else if (next.includes("{f.status === \"Pending\" && (")) {
      next = replaceOnce(
        next,
        "{f.status === \"Pending\" && (",
        "{f.status === \"Pending\" && showModeration && (",
        filePath
      );
    }

    // Add an "Owner only" hint when pending but not allowed.
    assertIncludes(next, "f.status === \"Pending\"", filePath);
    if (next.includes("!canModerate") && !next.includes("Owner wallet required")) {
      next = replaceOnce(
        next,
        "{actionState[f.id]?.state === \"approving\" && (",
        "{f.status === \"Pending\" && showModeration && !canModerate && (\n                      <span style={s.actionNote}>Owner wallet required</span>\n                    )}\n                    {actionState[f.id]?.state === \"approving\" && (",
        filePath
      );
    } else if (!next.includes("Owner wallet required")) {
      // If the hint block doesn't exist yet, insert it.
      next = replaceOnce(
        next,
        "{actionState[f.id]?.state === \"approving\" && (",
        "{f.status === \"Pending\" && showModeration && !canModerate && (\n                      <span style={s.actionNote}>Owner wallet required</span>\n                    )}\n                    {actionState[f.id]?.state === \"approving\" && (",
        filePath
      );
    }

    // Approve/Reject should pass the full farmer object (contains both backend id + on-chain farmerId).
    if (next.includes("onClick={() => onApprove?.(f.id)}")) {
      next = replaceOnce(
        next,
        "onClick={() => onApprove?.(f.id)}",
        "onClick={() => onApprove?.(f)}",
        filePath
      );
    }
    if (next.includes("onClick={() => onReject?.(f.id)}")) {
      next = replaceOnce(
        next,
        "onClick={() => onReject?.(f.id)}",
        "onClick={() => onReject?.(f)}",
        filePath
      );
    }

    // Disable moderation actions when not owner.
    if (!next.includes("disabled={!canModerate")) {
      next = next.replace(
        /disabled=\{actionState\[f\.id\]\?\.state === "approving" \|\| actionState\[f\.id\]\?\.state === "rejecting"\}/g,
        "disabled={!canModerate || actionState[f.id]?.state === \"approving\" || actionState[f.id]?.state === \"rejecting\"}"
      );
    }
    if (next.includes("onClick={() => onApprove?.(f)}") && !next.includes("if (!canModerate) return")) {
      next = next.replace(
        /onClick=\{\(\) => onApprove\?\.\\(f\\)\}/g,
        "onClick={() => { if (!canModerate) return; onApprove?.(f); }}"
      );
    }
    if (next.includes("onClick={() => onReject?.(f)}") && !next.includes("onReject?.(f);")) {
      next = next.replace(
        /onClick=\{\(\) => onReject\?\.\\(f\\)\}/g,
        "onClick={() => { if (!canModerate) return; onReject?.(f); }}"
      );
    }

    return next;
  });

  // 3) Update Pages/Farmers.jsx (replace entire file; avoids CRLF matching issues)
  patchFile(adminPortalPath("src", "Pages", "Farmers.jsx"), (_before, filePath) => {
    const next = `import { useState, useEffect } from "react";
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
}) {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewFarmer, setViewFarmer] = useState(null);
  const [actionState, setActionState] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchFarmers?.();
        setFarmers(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

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
              ? \`On-chain admin check: \${ownershipError}\`
              : "Connect the District Admin (contract owner) wallet in MetaMask to approve/reject farmers."}
        </div>
      )}

      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>Farmers</h2>
          <p style={s.subtitle}>Manage all registered farmers in the system</p>
        </div>
        <div style={s.headerActions}>
          <button style={btnOutline} onClick={onExport}>Export CSV</button>
          <button style={btnPrimary} onClick={onRegister}>+ Register Farmer</button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        <StatCard label="Total Registered"  value={total.toLocaleString()}    sub={\`↑ updated\`} />
        <StatCard label="Approved"          value={approved.toLocaleString()} sub={\`\${approvalRate}% rate\`} subColor={colors.info} />
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
                <DetailRow label="Name" value={\`\${viewFarmer?.first_name || ""} \${viewFarmer?.last_name || ""}\`.trim() || "—"} />
                <DetailRow label="NRC" value={viewFarmer?.nrc || "—"} />
                <DetailRow label="Phone" value={viewFarmer?.phone || "—"} />
                <DetailRow label="Province" value={viewFarmer?.province || "—"} />
                <DetailRow label="District" value={viewFarmer?.district || "—"} />
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

const s = {
  notice:       { background: "#fffbeb", border: \`1px solid \${colors.border}\`, padding: "10px 12px", borderRadius: "10px", marginBottom: "12px", fontSize: "12px", color: colors.text },
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
};
`;

    assertIncludes(next, "subscribeEvent", filePath);
    assertIncludes(next, "canModerate", filePath);
    return next;
  });

  // 4) Update src/App.js (targeted edits)
  patchFile(adminPortalPath("src", "App.js"), (before, filePath) => {
    assertIncludes(before, "function mapFarmer(f)", filePath);

    let next = before;

    // useContract destructure
    if (!next.includes("ownershipLoading")) {
      next = replaceOnce(
        next,
        "  const { sendTx, isContractConfigured } = useContract();",
        "  const { sendTx, isContractConfigured, isOwner, ownershipLoading, ownershipError, subscribeEvent } = useContract();",
        filePath
      );
    }

    // mapFarmer add farmerId
    if (!next.includes("farmerId: String(")) {
      next = replaceOnceRegex(
        next,
        /function mapFarmer\(f\)\s*\{[\s\S]*?\n\}/m,
        `function mapFarmer(f) {
  return {
    id: f.id,
    farmerId: String(f.farmer_code || f.farmerId || f.farmer_id || f.id || ""),
    name: \`\${f.first_name} \${f.last_name}\`.trim(),
    nrc: f.nrc,
    village: f.village,
    officer: f.officer_id,
    status: title(f.status),
  };
}`,
        filePath
      );
    }

    // inject ownership props into pageProps
    assertIncludes(next, "const pageProps = {", filePath);
    if (!next.includes("subscribeEvent,")) {
      next = replaceOnceRegex(
        next,
        /(\r?\n\s+currentUser:\s+user,\s*)/m,
        "$1    isOwner,\n    ownershipLoading,\n    ownershipError,\n    subscribeEvent,\n",
        filePath
      );
    }
    // Normalize indentation (previous insertion could eat indentation before fetchStats).
    if (next.includes("currentUser: user") && next.includes("subscribeEvent")) {
      next = next.replace(
        /currentUser:\s*user,\s*[\s\S]*?fetchStats:/m,
        "currentUser: user,\n    isOwner,\n    ownershipLoading,\n    ownershipError,\n    subscribeEvent,\n\n    fetchStats:"
      );
    }

    // onApprove accept farmer object and pass correct farmerId to chain
    if (next.includes("onApprove: async (id) =>")) {
      assertIncludes(next, "onApprove: async (id) => {", filePath);
      next = replaceOnceRegex(
        next,
        /\s+onApprove:\s+async\s*\(id\)\s*=>\s*\{[\s\S]*?\r?\n\s*\},/m,
        "    onApprove: async (input) => {\n      const payload = typeof input === \"object\" && input !== null ? input : { id: input, farmerId: input };\n      const backendId = payload.id;\n      const farmerId = payload.farmerId || payload.id;\n      const chain = await sendMetaMaskWrite(process.env.REACT_APP_APPROVE_FARMER_WRITE_METHOD, [String(farmerId)]);\n      const res = await api.approveFarmer({\n        farmer_id: backendId,\n        approved_by: user.id,\n        notes: \"\",\n        tx_hash: chain.txHash,\n        block_number: chain.blockNumber,\n      });\n      return { txHash: chain.txHash || res.tx_hash || null };\n    },",
        filePath
      );
    }

    // onReject accept farmer object (backend only)
    assertIncludes(next, "onReject:", filePath);
    if (!next.includes("payload = typeof input === \"object\"") && next.includes("onReject: async (id) => api.rejectFarmer")) {
      next = replaceOnce(
        next,
        "    onReject: async (id) => api.rejectFarmer({ farmer_id: id, rejected_by: user.id, reason: \"Manual review failed\" }),",
        "    onReject: async (input) => {\n      const payload = typeof input === \"object\" && input !== null ? input : { id: input };\n      return api.rejectFarmer({ farmer_id: payload.id, rejected_by: user.id, reason: \"Manual review failed\" });\n    },",
        filePath
      );
    }

    // Ensure subscribeEvent exists in hook and doesn't collide with api.confirmDistribution function name.
    next = next.replace(/},\s+onApprove:/m, "},\n    onApprove:");
    return next;
  });
}

main();
