import { useCallback, useEffect, useMemo, useState } from 'react';
import { confirmDistribution, fetchFarmers as fetchFarmersFromChain, registerFarmer as registerOnChain } from '../lib/agriTrust';
import useWallet from './useWallet';
import { getLocationLabel } from '../utils/location';

const buildFarmerId = (seed) => {
  const normalized = String(seed || '').trim();
  if (normalized) {
    return normalized.replace(/\s+/g, '-').toLowerCase();
  }
  return `farmer-${Date.now()}`;
};

const useContract = () => {
  const { officer, address } = useWallet();
  const [farmers, setFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [contractError, setContractError] = useState('');

  const refreshFarmers = useCallback(async () => {
    if (!address) {
      setFarmers([]);
      setContractError('');
      return;
    }

    setLoadingFarmers(true);
    try {
      setContractError('');
      const allFarmers = await fetchFarmersFromChain();
      const owned = allFarmers.filter((farmer) => farmer.registeredBy === String(address).toLowerCase());
      setFarmers(owned);
    } catch (error) {
      setFarmers([]);
      setContractError(error?.message || 'Unable to read farmers from the smart contract.');
    } finally {
      setLoadingFarmers(false);
    }
  }, [address]);

  useEffect(() => {
    refreshFarmers().catch((error) => {
      setContractError(error?.message || 'Unable to read farmers from the smart contract.');
    });
  }, [refreshFarmers]);

  const registerFarmer = useCallback(async (payload) => {
    const province = String(payload?.province || officer?.province || '').trim();
    const district = String(payload?.district || officer?.district || '').trim();
    const ward = String(payload?.ward || officer?.ward || '').trim();
    const village = String(payload?.village || '').trim();

    if (!province || !district) {
      throw new Error('Officer location is incomplete. Reload the app or reconnect the wallet before registering a farmer.');
    }

    const location = getLocationLabel({
      province,
      district,
      ward,
      village: village || officer?.village || '',
    });
    const farmerId = buildFarmerId(payload?.nrc || payload?.name);
    const response = await registerOnChain(farmerId, payload?.name || '', location);
    await refreshFarmers();
    return response;
  }, [officer, refreshFarmers]);

  const confirmCollection = useCallback(async ({ farmerId }) => {
    const response = await confirmDistribution(String(farmerId));
    await refreshFarmers();
    return response;
  }, [refreshFarmers]);

  const findFarmer = useCallback(async (query) => {
    const normalized = String(query || '').trim().toLowerCase();
    return farmers.find((farmer) => (
      farmer.name?.toLowerCase().includes(normalized) ||
      farmer.farmerId?.toLowerCase().includes(normalized)
    )) || null;
  }, [farmers]);

  const getStats = useCallback(() => {
    const approved = farmers.filter((farmer) => farmer.approvalStatus === 'approved').length;
    const pendingApproval = farmers.filter((farmer) => farmer.approvalStatus === 'pending').length;
    const collectedTotal = farmers.filter((farmer) => farmer.collectionStatus === 'collected').length;
    const todayKey = new Date().toISOString().slice(0, 10);
    const collectedToday = farmers.filter((farmer) => String(farmer.collectedAt || '').slice(0, 10) === todayKey).length;
    return {
      total: farmers.length,
      approved,
      pendingApproval,
      pendingCollection: Math.max(approved - collectedTotal, 0),
      collectedToday,
      collectedTotal,
      bagsDistributed: farmers.reduce((sum, farmer) => sum + Number(farmer.collectionStatus === 'collected' ? farmer.collectedBags || 0 : 0), 0),
      totalBagsAllocated: farmers.reduce((sum, farmer) => sum + Number(farmer.bagsAllocated || 0), 0),
    };
  }, [farmers]);

  const getDistributionWindow = useCallback(() => ({
    rangeLabel: 'On-chain workflow',
    todayLabel: new Date().toLocaleDateString(),
    daysRemaining: 0,
    progress: 0,
    status: 'open',
    eligibleFarmers: farmers.filter((farmer) => farmer.approvalStatus === 'approved').length,
  }), [farmers]);

  const getWeeklyCollectionTrend = useCallback(() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(today.getDate() - 6);

    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      const dateKey = date.toISOString().slice(0, 10);
      const value = farmers.filter((farmer) => String(farmer.collectedAt || '').slice(0, 10) === dateKey).length;
      return {
        label: labels[date.getDay()],
        value,
        date,
      };
    });
  }, [farmers]);

  return useMemo(() => ({
    getFarmers: () => farmers,
    registerFarmer,
    confirmCollection,
    findFarmer,
    getStats,
    getDistributionWindow,
    getWeeklyCollectionTrend,
    refreshFarmers,
    loadingFarmers,
    contractError,
  }), [
    farmers,
    registerFarmer,
    confirmCollection,
    findFarmer,
    getStats,
    getDistributionWindow,
    getWeeklyCollectionTrend,
    refreshFarmers,
    loadingFarmers,
    contractError,
  ]);
};

export default useContract;
