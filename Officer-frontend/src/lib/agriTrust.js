import { ethers } from "ethers";
import artifact from "../contracts/AgroVerify.json";
import { getLocationLabel, normalizeFarmerLocation, normalizeOfficerLocation } from "../utils/location";

const STATUS_LABELS = ["pending", "approved", "rejected"];

function getContractAddress() {
  return (
    process.env.REACT_APP_CONTRACT_ADDRESS ||
    process.env.VITE_AGRITRUST_CONTRACT_ADDRESS ||
    "0x"
  );
}

function getAbi() {
  return artifact.abi || [];
}

const REGISTER_FARMER_SIGNATURE = "registerFarmer(string,string,string)";
const CONFIRM_DISTRIBUTION_SIGNATURE = "confirmDistribution(string)";
const GET_OFFICER_DETAILS_SIGNATURE = "getOfficerDetails(address)";
const GET_ALLOCATION_SIGNATURE = "getAllocation(string)";

function splitFarmerVillage(location) {
  const parts = String(location || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function deriveMaskedNrc(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  const visible = digits.slice(-4);
  return `****${visible}`;
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
    + "Your frontend expects the upgraded AgriTrust.sol with getAllFarmers(id, name, location, status). "
    + "Redeploy the latest contract to Hardhat localhost, then update REACT_APP_CONTRACT_ADDRESS if the address changes."
  );
}

export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is required.");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

async function getReadContract() {
  const provider = await getProvider();
  return new ethers.Contract(getContractAddress(), getAbi(), provider);
}

async function getSigner() {
  const provider = await getProvider();
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

export async function connectOfficerWallet() {
  const provider = await getProvider();
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const contract = await getReadContract();
  let active;
  try {
    active = await contract.isOfficerActive(address);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("isOfficerActive(address)"));
    }
    throw error;
  }
  if (!active) {
    throw new Error("Connected wallet is not an active officer in AgriTrust.");
  }
  let officer;
  try {
    officer = await contract[GET_OFFICER_DETAILS_SIGNATURE](address);
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("getOfficerDetails(address)"));
    }
    throw error;
  }

  const province = String(officer[2] || "").trim();
  const district = String(officer[3] || "").trim();
  const ward = String(officer[4] || "").trim();
  return normalizeOfficerLocation({
    id: address,
    wallet_address: address,
    name: officer[1] || "Officer",
    role: "officer",
    status: officer[5] ? "active" : "inactive",
    province,
    district,
    ward,
    village: ward,
    villages: ward ? [ward] : [],
  });
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
    throw error;
  }
  const allocations = await Promise.all(
    farmers.map(async (farmer) => {
      try {
        return await contract[GET_ALLOCATION_SIGNATURE](farmer.id);
      } catch (_error) {
        return null;
      }
    }),
  );

  return farmers.map((farmer, index) => {
    const allocation = allocations[index];
    const allocatedQuantity = Number(allocation?.[1] || 0);
    const normalizedFarmer = normalizeFarmerLocation({
      id: farmer.id,
      farmerId: farmer.id,
      name: farmer.name,
      location: farmer.location,
      province: farmer.province,
      district: farmer.district,
      ward: farmer.ward,
      village: farmer.village || splitFarmerVillage(farmer.location),
    });

    return {
      id: normalizedFarmer.id,
      farmerId: normalizedFarmer.farmerId,
      name: normalizedFarmer.name,
      location: getLocationLabel(normalizedFarmer) || normalizedFarmer.location,
      province: normalizedFarmer.province,
      district: normalizedFarmer.district,
      ward: normalizedFarmer.ward,
      village: normalizedFarmer.village,
      approvalStatus: STATUS_LABELS[Number(farmer.status)] || "pending",
      collectionStatus: farmer.hasCollected ? "collected" : "not_collected",
      registeredBy: String(farmer.registeredBy || "").toLowerCase(),
      createdAt: Number(farmer.registeredAt || 0)
        ? new Date(Number(farmer.registeredAt) * 1000).toISOString()
        : "",
      collectedAt: Number(farmer.collectedAt || 0)
        ? new Date(Number(farmer.collectedAt) * 1000).toISOString()
        : "",
      initials: String(farmer.name || "NA")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "NA",
      maskedNrc: deriveMaskedNrc(farmer.id),
      nrc: "",
      farmSize: 0,
      bagsAllocated: allocatedQuantity,
      collectedBags: farmer.hasCollected ? allocatedQuantity : 0,
    };
  });
}

export async function registerFarmer(id, name, location) {
  const signer = await getSigner();
  const iface = new ethers.Interface(getAbi());
  let tx;
  try {
    tx = await signer.sendTransaction({
      to: getContractAddress(),
      data: iface.encodeFunctionData(REGISTER_FARMER_SIGNATURE, [id, name, location]),
    });
  } catch (error) {
    if (isMissingMethodError(error)) {
      throw new Error(buildRedeployMessage("registerFarmer(string,string,string)"));
    }
    throw error;
  }
  await tx.wait();
  return { hash: tx.hash };
}

export async function confirmDistribution(farmerId) {
  const signer = await getSigner();
  const iface = new ethers.Interface(getAbi());
  const tx = await signer.sendTransaction({
    to: getContractAddress(),
    data: iface.encodeFunctionData(CONFIRM_DISTRIBUTION_SIGNATURE, [farmerId]),
  });
  await tx.wait();
  return { hash: tx.hash };
}
