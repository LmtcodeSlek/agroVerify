import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { connectOfficerWallet } from '../lib/agriTrust';
import { normalizeOfficerLocation } from '../utils/location';

const WalletContext = createContext(null);
const STORAGE_KEY = 'agro_officer_session';

const defaultOfficer = {
  id: '',
  name: '',
  email: '',
  role: 'officer',
  status: 'inactive',
  district: '',
  province: '',
  ward: '',
  wards: [],
  village: '',
  villages: [],
  wallet_address: '',
};

const getStoredWallet = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const persistWallet = (officer) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(officer));
  } catch (error) {
    // ignore
  }
};

export const WalletProvider = ({ children }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [officer, setOfficer] = useState(defaultOfficer);

  useEffect(() => {
    const stored = getStoredWallet();
    if (!stored?.wallet_address) return;
    const normalizedOfficer = normalizeOfficerLocation({ ...defaultOfficer, ...stored });
    setWalletConnected(true);
    setAddress(normalizedOfficer.wallet_address);
    setOfficer(normalizedOfficer);
  }, []);

  const connectWallet = useCallback(async () => {
    const nextOfficer = normalizeOfficerLocation(await connectOfficerWallet());
    setWalletConnected(true);
    setAddress(nextOfficer.wallet_address);
    setOfficer(nextOfficer);
    persistWallet(nextOfficer);
    return nextOfficer;
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletConnected(false);
    setAddress('');
    setOfficer(defaultOfficer);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateOfficer = useCallback((updates) => {
    setOfficer((prev) => {
      const next = normalizeOfficerLocation({ ...prev, ...updates });
      persistWallet(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    walletConnected,
    address,
    officer,
    connectWallet,
    disconnectWallet,
    setOfficer,
    updateOfficer,
    token: '',
  }), [walletConnected, address, officer, connectWallet, disconnectWallet, updateOfficer]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};
