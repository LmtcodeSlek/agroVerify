import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount]         = useState(null);   // connected wallet address
  const [user, setUser]               = useState(null);   // logged-in admin user object
  const [isConnecting, setConnecting] = useState(false);
  const [chainId, setChainId]         = useState(null);
  const [error, setError]             = useState(null);
  const hasProvider = typeof window !== "undefined" && Boolean(window.ethereum);

  useEffect(() => {
    if (!hasProvider) return;

    let mounted = true;

    (async () => {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        const chain = await window.ethereum.request({ method: "eth_chainId" });
        if (!mounted) return;
        setAccount(accounts?.[0] || null);
        setChainId(chain || null);
      } catch {
        // no-op: app can still continue without preloaded wallet state
      }
    })();

    const handleAccountsChanged = (accounts) => setAccount(accounts?.[0] || null);
    const handleChainChanged = (nextChainId) => setChainId(nextChainId || null);

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      mounted = false;
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [hasProvider]);

  // ── Connect MetaMask ────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setError(null);
    if (!hasProvider) {
      setError("MetaMask is not installed. Please install it to continue.");
      return null;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chain    = await window.ethereum.request({ method: "eth_chainId" });
      setAccount(accounts[0]);
      setChainId(chain);
      return accounts[0];
    } catch (err) {
      setError(err.message || "Failed to connect wallet.");
      return null;
    } finally {
      setConnecting(false);
    }
  }, [hasProvider]);

  // ── Disconnect ──────────────────────────────────────────────────────────────
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
  }, []);

  // ── Auth helpers (set by Login page after credential check) ─────────────────
  const loginUser  = useCallback((userData) => setUser(userData), []);
  const logoutUser = useCallback(() => {
    setUser(null);
    setAccount(null);
    setChainId(null);
    localStorage.removeItem("agroverify_token");
  }, []);

  const value = useMemo(
    () => ({
      account,
      user,
      isConnecting,
      chainId,
      error,
      hasProvider,
      connectWallet,
      disconnectWallet,
      loginUser,
      logoutUser,
    }),
    [account, user, isConnecting, chainId, error, hasProvider, connectWallet, disconnectWallet, loginUser, logoutUser]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// ── Custom hook ──────────────────────────────────────────────────────────────
export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used inside <WalletProvider>");
  return ctx;
}

export default WalletContext;
