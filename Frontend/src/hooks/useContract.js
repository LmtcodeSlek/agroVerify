import { useState, useCallback, useMemo, useEffect } from "react";
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

function toStringSafe(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (value?.message) return String(value.message);
  return String(value);
}

function parseJsonSafe(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (!(raw.startsWith("{") || raw.startsWith("["))) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractRpcErrorMessage(error) {
  const queue = [error];
  const seen = new Set();
  const messages = [];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);

    const directCandidates = [
      current.shortMessage,
      current.reason,
      current.message,
      current.details,
      current?.data?.message,
      current?.data?.reason,
      current?.data?.originalError?.message,
      current?.error?.message,
      current?.error?.reason,
      current?.info?.error?.message,
      current?.info?.error?.data?.message,
    ];

    directCandidates.forEach((value) => {
      const text = toStringSafe(value).trim();
      if (text) messages.push(text);
      const parsed = parseJsonSafe(text);
      if (parsed) queue.push(parsed);
    });

    const nestedCandidates = [
      current.data,
      current.error,
      current.cause,
      current.info,
      current.value,
    ];

    nestedCandidates.forEach((value) => {
      if (!value) return;
      if (typeof value === "string") {
        const parsed = parseJsonSafe(value);
        if (parsed) queue.push(parsed);
        return;
      }
      if (typeof value === "object") {
        queue.push(value);
      }
    });
  }

  const best = messages.find((msg) => !/internal json-rpc error/i.test(msg))
    || messages.find(Boolean);
  return best || "Transaction failed.";
}

function extractErrorMessage(err) {
  return (
    extractRpcErrorMessage(err) ||
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
  const chainIdHex = `0x${chainId.toString(16)}`;
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

  const getRpcProvider = useCallback(() => new ethers.JsonRpcProvider(rpcUrl), [rpcUrl]);

  const getReadContract = useCallback(async () => {
    if (!address) throw new Error("Missing REACT_APP_CONTRACT_ADDRESS.");
    if (!abi?.length) throw new Error("Missing/invalid REACT_APP_CONTRACT_ABI.");
    const provider = getRpcProvider();
    return new ethers.Contract(address, abi, provider);
  }, [abi, address, getRpcProvider]);

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
      throw new Error(`No contract found at ${address} on chain ${chainId}.`);
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
      const currentSigner = account;
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
  }, [abi, account, address, getReadContract, hasProvider]);

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
        const provider = getProvider();
        const rpcProvider = getRpcProvider();
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
        const txData = contract.interface.encodeFunctionData(method, normalizedArgs);
        const txRequest = {
          to: address,
          from: signerAddress,
          data: txData,
        };

        // Preflight the transaction against the local RPC so revert reasons surface
        // before MetaMask wraps them in a generic internal JSON-RPC error.
        await rpcProvider.call(txRequest);

        const estimatedGas = await rpcProvider.estimateGas(txRequest);
        const txHash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [{
            ...txRequest,
            gas: ethers.toQuantity((estimatedGas * 120n) / 100n),
          }],
        });
        const receipt = await rpcProvider.waitForTransaction(txHash);

        if (!receipt) {
          throw new Error("Transaction was submitted but no receipt was found on the RPC node.");
        }
        if (receipt.status === 0) {
          throw new Error("Transaction was mined but reverted on-chain.");
        }

        setTxHash(receipt?.hash || txHash || null);
        setTxStatus("success");
        return { tx: null, receipt, txHash: receipt?.hash || txHash || null };
      } catch (err) {
        const raw = extractErrorMessage(err);
        const rawLower = String(raw || "").toLowerCase();
        const methodLower = String(method || "").trim().toLowerCase();
        const approveLower = String(APPROVE_METHOD || "").trim().toLowerCase();

        let message = raw;
        if (rawLower.includes("owner only") || rawLower.includes("agritrust: owner only")) {
          message = OWNER_ONLY_MESSAGE;
        } else if (rawLower.includes("officer not found")) {
          message = "Connected wallet is not registered as an on-chain officer for this contract.";
        } else if (rawLower.includes("officer inactive")) {
          message = "Connected wallet is an inactive officer on-chain. Reactivate this officer wallet first.";
        } else if (rawLower.includes("farmer not found")) {
          message = "The farmer does not exist on-chain at this contract address.";
        } else if (rawLower.includes("farmer already verified")) {
          message = "This farmer is already verified on-chain.";
        } else if (rawLower.includes("farmer already registered")) {
          message = "This farmer is already registered on-chain.";
        } else if (rawLower.includes("farmerid required")) {
          message = "This contract action needs a farmer ID, but none was provided.";
        } else if (rawLower.includes("allocation not found")) {
          message = "No on-chain allocation was found for this farmer yet.";
        } else if (rawLower.includes("distribution already confirmed")) {
          message = "Distribution has already been confirmed on-chain for this farmer.";
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
    [address, defaultWriteArgs, defaultWriteMethod, getContract, getProvider, getRpcProvider, isOwner]
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
