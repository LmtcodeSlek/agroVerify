import { useCallback } from "react";
import { useWalletContext } from "../context/WalletContext";

/**
 * useWallet
 * Thin compatibility wrapper over WalletContext with message-sign helper.
 */
export function useWallet() {
  const { account, chainId, isConnecting, error, hasProvider, connectWallet, disconnectWallet } = useWalletContext();

  const signMessage = useCallback(
    async (message) => {
      if (!hasProvider) throw new Error("MetaMask not installed.");
      if (!account) throw new Error("Wallet not connected.");

      return window.ethereum.request({
        method: "personal_sign",
        params: [message, account],
      });
    },
    [account, hasProvider]
  );

  return {
    account,
    chainId,
    isConnecting,
    error,
    hasProvider,
    connect: connectWallet,
    disconnect: disconnectWallet,
    signMessage,
  };
}

export default useWallet;
