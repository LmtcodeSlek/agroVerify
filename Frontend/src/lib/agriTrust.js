import { ethers } from "ethers";
import artifact from "../contracts/AgriTrust.json";
import { buildLocationString, resolveLocationSelection } from "./locations";

const ADMIN_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const STATUS_LABELS = ["Pending", "Approved", "Rejected"];
const RPC_URL = process.env.REACT_APP_RPC_URL || "http://127.0.0.1:8545";

function getContractAddress() {
  const address = process.env.REACT_APP_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("Missing REACT_APP_CONTRACT_ADDRESS.");
  }
  return address;
}

function getAbi() {
  return artifact.abi || [];
}

function isMissingMethodError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "CALL_EXCEPTION" ||
    message.includes("missing revert data") ||
    message.includes("could not decode result data")
  );
}

function buildRedeployMessage(methodName) {
  return (
    `The deployed contract at ${getContractAddress()} does not support ${methodName}. `
    + "Redeploy the upgraded AgriTrust.sol, then update REACT_APP_CONTRACT_ADDRESS if the new deployment address changes."
  );
}

function buildNodeOfflineError() {
  return new Error(`Blockchain Node Offline. Start the local Hardhat node at ${RPC_URL} and try again.`);
}

function isNodeOfflineError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("connect") ||
    message.includes("connection refused") ||
    message.includes("failed to fetch") ||
    message.includes("missing response") ||
    message.includes("network error") ||
    message.includes("socket") ||
    message.includes("econnrefused")
  );
}

function withNodeOfflineMessage(error) {
  if (isNodeOfflineError(error)) {
    throw buildNodeOfflineError();
  }
  throw error;
}

export async function getBrowserProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is required.");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export function getRpcProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export async function connectWallet() {
  const provider = await getBrowserProvider();
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

async function getReadContract() {
  try {
    const provider = getRpcProvider();
    return new ethers.Contract(getContractAddress(), getAbi(), provider);
  } catch (error) {
    withNodeOfflineMessage(error);
  }
}

async function getWriteContract() {
  const signer = await connectWallet();
  return new ethers.Contract(getContractAddress(), getAbi(), signer);
}

export async function resolveWalletRole(walletAddress) {
  const normalized = String(walletAddress || "").toLowerCase();
  if (!normalized) {
    return { role: null, isAdmin: false, isOfficer: false };
  }

  if (normalized === ADMIN_ADDRESS) {
    return { role: "Admin", isAdmin: true, isOfficer: false };
  }

  const contract = await getReadContract();
  let isOfficer;
  try {
    isOfficer = await contract.isOfficerActive(walletAddress);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("isOfficerActive(address)"));
    }
    withNodeOfflineMessage(error);
  }
  return {
    role: isOfficer ? "Officer" : null,
    isAdmin: false,
    isOfficer,
  };
}

export async function getOwnerAddress() {
  const contract = await getReadContract();
  try {
    return await contract.owner();
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("owner()"));
    }
    withNodeOfflineMessage(error);
  }
}

export async function registerFarmer(id, name, location) {
  const contract = await getWriteContract();
  let tx;
  try {
    tx = await contract.registerFarmer(id, name, location);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("registerFarmer(string,string,string)"));
    }
    throw error;
  }
  await tx.wait();
  return tx.hash;
}

export async function approveFarmer(id) {
  const contract = await getWriteContract();
  let tx;
  try {
    tx = await contract.verifyFarmer(id);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("verifyFarmer(string)"));
    }
    throw error;
  }
  await tx.wait();
  return tx.hash;
}

export async function rejectFarmer(id) {
  const contract = await getWriteContract();
  let tx;
  try {
    tx = await contract.rejectFarmer(id);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("rejectFarmer(string)"));
    }
    throw error;
  }
  await tx.wait();
  return tx.hash;
}

export async function fetchFarmers() {
  const contract = await getReadContract();
  let farmers;
  try {
    farmers = await contract.getAllFarmers();
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("getAllFarmers()"));
    }
    withNodeOfflineMessage(error);
  }
  return farmers.map((farmer, index) => {
    const resolvedLocation = resolveLocationSelection({
      province: farmer.province,
      district: farmer.district,
      ward: farmer.ward,
      village: farmer.village,
      location: farmer.location,
    });

    return {
    id: farmer.id,
    farmerId: farmer.id,
    name: farmer.name,
    location: buildLocationString(resolvedLocation) || farmer.location,
    village: resolvedLocation.village || farmer.village || farmer.location,
    province: resolvedLocation.province || "",
    district: resolvedLocation.district || "",
    ward: resolvedLocation.ward || "",
    officer: farmer.registeredBy,
    status: STATUS_LABELS[Number(farmer.status)] || "Pending",
    registeredBy: farmer.registeredBy,
    registeredAt: Number(farmer.registeredAt || 0),
    reviewedAt: Number(farmer.reviewedAt || 0),
    eligibleDate: Number(farmer.eligibleDate || 0),
    hasCollected: Boolean(farmer.hasCollected),
    collectedAt: Number(farmer.collectedAt || 0),
    exists: farmer.exists,
    rowKey: `${farmer.id}-${index}`,
    };
  });
}

export async function fetchOfficers() {
  const contract = await getReadContract();
  let officerCount;
  try {
    officerCount = await contract.getOfficerCount();
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("getOfficerCount()"));
    }
    withNodeOfflineMessage(error);
  }

  const total = Number(officerCount || 0);
  const wallets = await Promise.all(
    Array.from({ length: total }, async (_, index) => {
      try {
        return await contract.getOfficerWalletAt(index);
      } catch (error) {
        if (isMissingMethodError(error)) {
          throw new Error(buildRedeployMessage("getOfficerWalletAt(uint256)"));
        }
        withNodeOfflineMessage(error);
      }
    })
  );

  const farmers = await fetchFarmers().catch(() => []);
  const officers = await Promise.all(
    wallets.map(async (wallet) => {
      try {
        const data = await contract.getOfficer(wallet);
        const walletAddress = String(data?.[0] || wallet || "");
        const name = String(data?.[1] || "").trim() || "Authorized Officer";
        const isActive = Boolean(data?.[2]);
        const exists = Boolean(data?.[3]);
        const createdAt = Number(data?.[4] || 0);
        const updatedAt = Number(data?.[5] || 0);
        let province = "";
        let district = "";
        let ward = "";

        if (typeof contract.getOfficerDetails === "function") {
          try {
            const details = await contract.getOfficerDetails(wallet);
            province = String(details?.[2] || "").trim();
            district = String(details?.[3] || "").trim();
            ward = String(details?.[4] || "").trim();
          } catch (error) {
            if (!isMissingMethodError(error)) {
              withNodeOfflineMessage(error);
            }
          }
        }

        const farmerRows = farmers.filter((row) => String(row?.registeredBy || "").toLowerCase() === walletAddress.toLowerCase());
        const approved = farmerRows.filter((row) => String(row?.status || "").toLowerCase() === "approved").length;
        const pending = farmerRows.filter((row) => String(row?.status || "").toLowerCase() === "pending").length;

        return {
          id: walletAddress,
          wallet: walletAddress,
          name,
          role: "Officer",
          status: exists ? (isActive ? "Active" : "Inactive") : "Inactive",
          farmers: farmerRows.length,
          approved,
          pending,
          province,
          district: district || "On-Chain Authorization",
          ward: ward || "Blockchain Node",
          createdAt,
          updatedAt,
          exists,
          isActive,
        };
      } catch (error) {
        if (isMissingMethodError(error)) {
          throw new Error(buildRedeployMessage("getOfficer(address)"));
        }
        withNodeOfflineMessage(error);
      }
    })
  );

  return officers;
}

export async function getOfficer(walletAddress) {
  const officers = await fetchOfficers();
  return officers.find((officer) => String(officer.wallet).toLowerCase() === String(walletAddress || "").toLowerCase()) || null;
}

export async function authorizeOfficer(walletAddress, name = "Authorized Officer") {
  if (!ethers.isAddress(walletAddress)) {
    throw new Error("Enter a valid Ethereum wallet address.");
  }

  const contract = await getWriteContract();
  let tx;
  try {
    tx = await contract.createOfficer(walletAddress, name);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("createOfficer(address,string)"));
    }
    throw error;
  }
  await tx.wait();
  return { txHash: tx.hash, walletAddress };
}

export async function activateOfficer(walletAddress) {
  const contract = await getWriteContract();
  let tx;
  try {
    tx = await contract.activateOfficer(walletAddress);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("activateOfficer(address)"));
    }
    throw error;
  }
  await tx.wait();
  return { txHash: tx.hash, walletAddress };
}

export async function deactivateOfficer(walletAddress) {
  const contract = await getWriteContract();
  let tx;
  try {
    tx = await contract.deactivateOfficer(walletAddress);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("deactivateOfficer(address)"));
    }
    throw error;
  }
  await tx.wait();
  return { txHash: tx.hash, walletAddress };
}

function sameText(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function timestampToDateInput(timestamp) {
  if (!timestamp) return "";
  return new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);
}

function buildScheduleStatus({ isActive, startTime, endTime, distributed, totalFarmers }) {
  if (!isActive) return "Cancelled";
  if (totalFarmers > 0 && distributed >= totalFarmers) return "Complete";
  const now = Math.floor(Date.now() / 1000);
  if (now < startTime) return "Scheduled";
  if (now > endTime) return "Cancelled";
  return distributed > 0 ? "In Progress" : "Scheduled";
}

function auditTypeFromAction(action) {
  const normalized = String(action || "").trim().toUpperCase();
  if (normalized.includes("REGISTER")) return "registration";
  if (normalized.includes("VERIFIED") || normalized.includes("APPROVED")) return "approval";
  if (normalized.includes("REJECT")) return "rejection";
  if (normalized.includes("OFFICER")) return "login";
  if (normalized.includes("ALLOC")) return "allocation";
  if (normalized.includes("SCHEDULE")) return "schedule";
  if (normalized.includes("DISTRIBUTION") || normalized.includes("COLLECT")) return "distribution";
  return "default";
}

function auditTitleFromAction(action) {
  const label = String(action || "AUDIT_EVENT").replace(/_/g, " ").trim();
  return label
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatAuditDateParts(timestamp) {
  if (!timestamp) {
    return { date: "", time: "" };
  }
  const dt = new Date(Number(timestamp) * 1000);
  return {
    date: dt.toISOString().slice(0, 10),
    time: dt.toISOString().slice(11, 19) + " UTC",
  };
}

function buildAuditDetail(action, farmerId, actorLabel) {
  const normalized = String(action || "").trim().toUpperCase();
  const farmerText = farmerId ? ` for farmer <strong>${farmerId}</strong>` : "";
  if (normalized.includes("OFFICER")) {
    return `Action executed by <strong>${actorLabel}</strong>${farmerText}.`;
  }
  if (farmerId) {
    return `Action recorded on-chain${farmerText} by <strong>${actorLabel}</strong>.`;
  }
  return `Action recorded on-chain by <strong>${actorLabel}</strong>.`;
}

function matchesAuditFilters(entry, filters = {}) {
  const action = String(filters.action || "").trim().toLowerCase();
  const user = String(filters.user || "").trim().toLowerCase();
  const date = String(filters.date || "").trim();
  const search = String(filters.search || "").trim().toLowerCase();

  if (action && String(entry?.type || "").toLowerCase() !== action) return false;
  if (user) {
    const actor = String(entry?.user_id || "").toLowerCase();
    const actorName = String(entry?.user_name || "").toLowerCase();
    if (actor !== user && actorName !== user) return false;
  }
  if (date && String(entry?.date || "") !== date) return false;
  if (search) {
    const haystack = [
      entry?.action,
      entry?.detail,
      entry?.meta,
      entry?.user_id,
      entry?.user_name,
    ].join(" ").toLowerCase();
    if (!haystack.includes(search)) return false;
  }
  return true;
}

export async function fetchAuditLogs(filters = {}) {
  const contract = await getReadContract();
  let total;
  try {
    total = await contract.getAuditCount();
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("getAuditCount()"));
    }
    withNodeOfflineMessage(error);
  }

  const totalEntries = Number(total || 0);
  if (!totalEntries) return [];

  const officers = await fetchOfficers().catch(() => []);
  const officerNameByWallet = new Map(
    officers.map((officer) => [String(officer.wallet || "").toLowerCase(), officer.name || "Authorized Officer"])
  );

  const entries = await Promise.all(
    Array.from({ length: totalEntries }, async (_, listIndex) => {
      const index = totalEntries - 1 - listIndex;
      try {
        const [action, farmerId, actor, timestamp] = await contract.getAuditEntry(index);
        const actorAddress = String(actor || "");
        const actorLabel =
          actorAddress.toLowerCase() === ADMIN_ADDRESS
            ? "District Admin"
            : officerNameByWallet.get(actorAddress.toLowerCase()) || actorAddress;
        const { date, time } = formatAuditDateParts(timestamp);
        return {
          id: `chain-audit-${index}`,
          type: auditTypeFromAction(action),
          action: auditTitleFromAction(action),
          detail: buildAuditDetail(action, farmerId, actorLabel),
          meta: `On-chain actor: ${actorLabel} (${actorAddress})`,
          user_id: actorAddress,
          user_name: actorLabel,
          date,
          time,
          tx_hash: null,
        };
      } catch (error) {
        if (isMissingMethodError(error)) {
          throw new Error(buildRedeployMessage("getAuditEntry(uint256)"));
        }
        withNodeOfflineMessage(error);
      }
      return null;
    })
  );

  return entries.filter(Boolean).filter((entry) => matchesAuditFilters(entry, filters));
}

export async function exportAuditLogs(filters = {}) {
  const logs = await fetchAuditLogs(filters);
  const lines = [
    ["ID", "Type", "Action", "Detail", "User", "Date", "Time", "Tx Hash"].join(","),
    ...logs.map((entry) =>
      [
        entry.id,
        entry.type,
        entry.action,
        String(entry.detail || "").replace(/<[^>]+>/g, ""),
        entry.user_name || "",
        entry.date || "",
        entry.time || "",
        entry.tx_hash || "",
      ]
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  return {
    blob: new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    filename: "audit-log.csv",
  };
}

export async function fetchDistributionSchedules() {
  const contract = await getReadContract();
  let totalSchedules;
  try {
    totalSchedules = await contract.scheduleCount();
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("scheduleCount()"));
    }
    withNodeOfflineMessage(error);
  }

  const [farmers, officers] = await Promise.all([
    fetchFarmers().catch(() => []),
    fetchOfficers().catch(() => []),
  ]);

  const count = Number(totalSchedules || 0);
  const schedules = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const scheduleId = index + 1;
      let schedule;
      try {
        schedule = await contract.schedules(scheduleId);
      } catch (error) {
        if (isMissingMethodError(error)) {
          throw new Error(buildRedeployMessage("schedules(uint256)"));
        }
        withNodeOfflineMessage(error);
      }

      const province = String(schedule?.province || "");
      const district = String(schedule?.district || "");
      const ward = String(schedule?.ward || "");
      const startTime = Number(schedule?.startTime || 0);
      const endTime = Number(schedule?.endTime || 0);
      const bagsPerFarmer = Number(schedule?.bagsPerFarmer || 0);
      const isActive = Boolean(schedule?.isActive);

      const scopedFarmers = farmers.filter(
        (farmer) =>
          sameText(farmer.province, province) &&
          sameText(farmer.district, district) &&
          sameText(farmer.ward, ward) &&
          sameText(farmer.status, "approved")
      );
      const distributed = scopedFarmers.filter((farmer) => Boolean(farmer.hasCollected)).length;
      const matchedOfficer =
        officers.find(
          (officer) =>
            sameText(officer.province, province) &&
            sameText(officer.district, district) &&
            sameText(officer.ward, ward) &&
            sameText(officer.status, "active")
        ) || null;

      return {
        id: Number(schedule?.id || scheduleId),
        province,
        district,
        ward,
        location: [province, district, ward].filter(Boolean).join(" / "),
        bagsPerFarmer,
        startTime,
        endTime,
        startDate: timestampToDateInput(startTime),
        endDate: timestampToDateInput(endTime),
        isActive,
        officerId: matchedOfficer?.id || "",
        officer: matchedOfficer?.name || "Assigned by Location",
        distributed,
        totalFarmers: scopedFarmers.length,
        total_farmers: scopedFarmers.length,
        status: buildScheduleStatus({
          isActive,
          startTime,
          endTime,
          distributed,
          totalFarmers: scopedFarmers.length,
        }),
      };
    })
  );

  return schedules.sort((a, b) => Number(b.id) - Number(a.id));
}

export async function createDistributionSchedule({
  province,
  district,
  ward,
  bagsPerFarmer,
  durationDays,
}) {
  const contract = await getWriteContract();
  let tx;
  try {
    tx = await contract.createSchedule(
      String(province || "").trim(),
      String(district || "").trim(),
      String(ward || "").trim(),
      ethers.toBigInt(Number(bagsPerFarmer || 0)),
      ethers.toBigInt(Number(durationDays || 0)),
    );
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("createSchedule(string,string,string,uint256,uint256)"));
    }
    throw error;
  }
  await tx.wait();
  return { txHash: tx.hash };
}

export async function confirmDistributionByFarmerId(farmerId) {
  const contract = await getWriteContract();
  let tx;
  try {
    tx = await contract.confirmDistribution(String(farmerId || "").trim());
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("confirmDistribution(string)"));
    }
    throw error;
  }
  await tx.wait();
  return { txHash: tx.hash };
}

export async function fetchWalletBalance(walletAddress) {
  if (!walletAddress) return "0.0000";
  try {
    const provider = getRpcProvider();
    const rawBalance = await provider.getBalance(walletAddress);
    return Number(ethers.formatEther(rawBalance)).toFixed(4);
  } catch (error) {
    withNodeOfflineMessage(error);
  }
}

export async function fetchRecentFarmerRegistrationTxs(walletAddress, limit = 5) {
  if (!walletAddress) return [];
  const contract = await getReadContract();
  try {
    const logs = await contract.queryFilter(contract.filters.FarmerRegistered());
    return logs
      .filter((entry) => String(entry?.args?.wallet || "").toLowerCase() === String(walletAddress).toLowerCase())
      .reverse()
      .slice(0, limit)
      .map((entry) => ({
        hash: entry.transactionHash,
        farmerId: entry?.args?.farmerId || "",
        name: entry?.args?.name || "",
        location: entry?.args?.location || "",
        blockNumber: entry.blockNumber,
      }));
  } catch (error) {
    withNodeOfflineMessage(error);
  }
}
