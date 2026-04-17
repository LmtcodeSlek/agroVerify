import { useCallback, useEffect, useMemo, useState } from "react";
import { WalletProvider, useWalletContext } from "./context/WalletContext";
import { api } from "./api/client";
import Allocation from "./Pages/Allocation";
import Audit from "./Pages/Audit";
import Dashboard from "./Pages/Dashboard";
import Distribution from "./Pages/Distribution";
import Farmers from "./Pages/Farmers";
import Locations from "./Pages/Locations";
import Login from "./Pages/Login";
import Officers from "./Pages/Officers";
import Settings from "./Pages/Settings";
import {
  buildHierarchyFromTree,
  buildLocationString,
  getOfficerLocationConfig,
  resolveLocationSelection,
} from "./lib/locations";
import {
  activateOfficer,
  approveFarmer,
  authorizeOfficer,
  confirmDistributionByFarmerId,
  connectWallet,
  createDistributionSchedule,
  deactivateOfficer,
  exportAuditLogs as exportChainAuditLogs,
  fetchFarmers,
  fetchAuditLogs as fetchChainAuditLogs,
  fetchDistributionSchedules,
  fetchOfficers as fetchChainOfficers,
  getOfficer as getChainOfficer,
  getOwnerAddress,
  registerFarmer,
  rejectFarmer,
  resolveWalletRole,
} from "./lib/agriTrust";

const ADMIN_ROUTES = ["/dashboard", "/farmers", "/officers", "/locations", "/allocation", "/distribution", "/audit", "/settings"];
const OFFICER_ROUTES = ["/dashboard", "/farmers", "/distribution"];
const FALLBACK_ROUTE_BY_ROLE = {
  admin: "/dashboard",
  officer: "/farmers",
};

function buildRoleUser(account, role) {
  return {
    id: account,
    wallet: account,
    name: role === "Admin" ? "District Admin" : "Authorized Officer",
    role,
  };
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function getAllowedRoutes(role) {
  return normalizeRole(role) === "admin" ? ADMIN_ROUTES : OFFICER_ROUTES;
}

function getSafeRoute(pathname, role) {
  const allowedRoutes = getAllowedRoutes(role);
  if (allowedRoutes.includes(pathname)) return pathname;
  return FALLBACK_ROUTE_BY_ROLE[normalizeRole(role)] || "/farmers";
}

function splitLocationParts(location) {
  return resolveLocationSelection({ location });
}

function matchesScope(farmer, filters = {}) {
  const location = splitLocationParts(farmer?.location || farmer?.village || "");
  const province = String(filters.province || "").trim().toLowerCase();
  const district = String(filters.district || "").trim().toLowerCase();
  const town = String(filters.town || "").trim().toLowerCase();
  const village = String(filters.village || "").trim().toLowerCase();

  if (province && location.province.toLowerCase() !== province) return false;
  if (district && location.district.toLowerCase() !== district) return false;
  if (town && location.ward.toLowerCase() !== town) return false;
  if (village && location.village.toLowerCase() !== village) return false;
  return true;
}

function toOptionList(values) {
  return Array.from(values)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((value) => ({ value, label: value }));
}

function buildHierarchyFromFarmers(farmers, filters = {}) {
  const matchingRows = (farmers || []).filter((farmer) => matchesScope(farmer, filters));
  const treeHierarchy = buildHierarchyFromTree(filters);
  const provinces = new Set((treeHierarchy.provinces || []).map((item) => item.value));
  const districts = new Set((treeHierarchy.districts || []).map((item) => item.value));
  const towns = new Set((treeHierarchy.towns || []).map((item) => item.value));
  const villages = new Set((treeHierarchy.villages || []).map((item) => item.value));

  for (const farmer of matchingRows) {
    const location = splitLocationParts(farmer?.location || farmer?.village || "");
    if (location.province) provinces.add(location.province);
    if (location.district) districts.add(location.district);
    if (location.ward) towns.add(location.ward);
    if (location.village) villages.add(location.village);
  }

  const approved = matchingRows.filter((farmer) => normalizeRole(farmer?.status) === "approved").length;
  const pending = matchingRows.filter((farmer) => normalizeRole(farmer?.status) === "pending").length;
  const bagsPerFarmer = 3;
  const total = matchingRows.length;
  const bags = approved * bagsPerFarmer;

  return {
    provinces: treeHierarchy.provinces?.length ? treeHierarchy.provinces : toOptionList(provinces),
    districts: treeHierarchy.districts?.length ? treeHierarchy.districts : toOptionList(districts),
    towns: treeHierarchy.towns?.length ? treeHierarchy.towns : toOptionList(towns),
    villages: treeHierarchy.villages?.length ? treeHierarchy.villages : toOptionList(villages),
    summary: {
      registered: total,
      approved,
      pending,
      bags,
      bagsPerFarmer,
      approvalRate: total ? Math.round((approved / total) * 100) : 0,
      coverageRate: approved ? 100 : 0,
      distributionRate: 0,
      allocationComplete: approved > 0,
    },
  };
}

function buildFarmerDetails(farmer) {
  if (!farmer) return null;
  const location = splitLocationParts(farmer.location || farmer.village || "");
  const name = String(farmer.name || "").trim();
  const nameParts = name.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  return {
    id: farmer.id || farmer.farmerId || "",
    farmer_code: farmer.farmerId || farmer.id || "",
    farmerId: farmer.farmerId || farmer.id || "",
    name,
    first_name: firstName,
    last_name: lastName,
    nrc: farmer.nrc || "",
    phone: farmer.phone || "",
    province: farmer.province || location.province,
    district: farmer.district || location.district,
    ward: farmer.ward || location.ward,
    village: farmer.village || location.village,
    status: farmer.status || "",
    officer_id: farmer.officer_id || farmer.officer || farmer.registeredBy || "",
    location: farmer.location || "",
  };
}

function AppInner() {
  const { account, user, loginUser, logoutUser } = useWalletContext();
  const [ownerAddress, setOwnerAddress] = useState("");
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activePath, setActivePath] = useState(() => window.location.pathname || "/");

  const loadFarmers = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchFarmers();
      setFarmers(rows || []);
      return rows || [];
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveSession = useCallback(async (walletAddress) => {
    const roleInfo = await resolveWalletRole(walletAddress);
    if (!roleInfo.role) {
      throw new Error("Connected wallet is neither the admin wallet nor an active on-chain officer.");
    }
    loginUser(buildRoleUser(walletAddress, roleInfo.role));
    setOwnerAddress(await getOwnerAddress());
  }, [loginUser]);

  useEffect(() => {
    if (!account || user) return;
    resolveSession(account).catch((err) => {
      setAuthError(err?.message || "Unable to resolve wallet role.");
    });
  }, [account, user, resolveSession]);

  useEffect(() => {
    if (!user) return;
    loadFarmers().catch(() => {
      setFarmers([]);
    });
  }, [user, loadFarmers]);

  useEffect(() => {
    const onPopState = () => {
      setActivePath(window.location.pathname || "/");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleNavigate = useCallback((path) => {
    setActivePath(path);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, []);

  const handleLogin = async () => {
    setAuthError("");
    const signer = await connectWallet();
    const walletAddress = await signer.getAddress();
    await resolveSession(walletAddress);
  };

  const handleLogout = () => {
    setFarmers([]);
    setOwnerAddress("");
    setAuthError("");
    setActivePath("/");
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
    logoutUser();
  };

  const handleRegister = async (payload) => {
    const fallbackId = `farmer-${Date.now()}`;
    const farmerId = String(payload?.id || fallbackId).trim();
    const farmerName = String(payload?.name || "").trim();
    const farmerLocation = buildLocationString(resolveLocationSelection({
      ...payload,
      province: payload?.province || officerLocationConfig.province,
      district: payload?.district || officerLocationConfig.district,
    }));
    if (!farmerName || !farmerLocation) {
      throw new Error("Farmer name, ward and village are required.");
    }
    await registerFarmer(farmerId, farmerName, farmerLocation);
    await loadFarmers();
    return { id: farmerId };
  };

  const handleApprove = async (farmer) => {
    await approveFarmer(farmer.farmerId || farmer.id);
    await loadFarmers();
  };

  const handleReject = async (farmer) => {
    await rejectFarmer(farmer.farmerId || farmer.id);
    await loadFarmers();
  };

  const currentUser = useMemo(() => user || null, [user]);
  const currentRole = normalizeRole(currentUser?.role);
  const canModerate = currentUser?.role === "Admin";
  const officerLocationConfig = useMemo(() => getOfficerLocationConfig(), []);

  useEffect(() => {
    if (!currentUser) return;
    const safePath = getSafeRoute(activePath, currentRole);
    if (safePath !== activePath) {
      setActivePath(safePath);
      if (window.location.pathname !== safePath) {
        window.history.replaceState({}, "", safePath);
      }
    }
  }, [activePath, currentRole, currentUser]);

  const safeActivePath = currentUser ? getSafeRoute(activePath, currentRole) : activePath;

  const fetchAppFarmers = useCallback(async () => {
    if (farmers.length) return farmers;
    return loadFarmers();
  }, [farmers, loadFarmers]);

  const fetchHierarchy = useCallback(async (params = {}) => {
    const rows = await fetchAppFarmers();
    return buildHierarchyFromFarmers(rows, params);
  }, [fetchAppFarmers]);

  const fetchAllocationSummary = useCallback(async (params = {}) => {
    const rows = await fetchAppFarmers();
    const scopedRows = rows.filter((farmer) => matchesScope(farmer, params));
    const approvedFarmers = scopedRows.filter((farmer) => normalizeRole(farmer?.status) === "approved").length;
    const bagsPerFarmer = Number(params?.bagsPerFarmer || 0);

    return {
      approvedFarmers,
      bagsPerFarmer,
      totalBags: approvedFarmers * bagsPerFarmer,
      scope: {
        province: params?.province || "",
        district: params?.district || "",
        town: params?.town || "",
      },
      source: "blockchain",
    };
  }, [fetchAppFarmers]);

  const fetchOfficers = useCallback(async () => {
    return fetchChainOfficers();
  }, []);

  const fetchSettings = useCallback(async () => {
    const [settings, officers] = await Promise.all([
      api.getSettings().catch(() => ({})),
      fetchChainOfficers().catch(() => []),
    ]);
    return {
      ...settings,
      users: settings?.users || officers || [],
    };
  }, []);

  const renderPage = () => {
    switch (safeActivePath) {
      case "/dashboard":
        return (
          <Dashboard
            onNavigate={handleNavigate}
            onApplyAllocation={async (payload) => ({
              txHash: null,
              mode: "blockchain-readonly",
              payload,
            })}
          />
        );
      case "/farmers":
        return (
          <Farmers
            onNavigate={handleNavigate}
            currentUser={currentUser}
            fetchFarmers={fetchAppFarmers}
            onApprove={handleApprove}
            onReject={handleReject}
            onView={async (id) => {
              const farmer = farmers.find((row) => row.id === id || row.farmerId === id) || null;
              return buildFarmerDetails(farmer);
            }}
            onRegister={handleRegister}
            registrationLocationConfig={officerLocationConfig}
            onExport={async () => ({ ok: true })}
            isOwner={canModerate}
            ownershipLoading={false}
            ownershipError=""
            subscribeEvent={null}
            onLogout={handleLogout}
            ownerAddress={ownerAddress}
            loading={loading}
          />
        );
      case "/officers":
        return (
          <Officers
            onNavigate={handleNavigate}
            fetchOfficers={fetchOfficers}
            onAddOfficer={({ walletAddress }) => authorizeOfficer(walletAddress)}
            onViewOfficer={getChainOfficer}
            onDeactivate={deactivateOfficer}
            onReactivate={activateOfficer}
          />
        );
      case "/locations":
        return <Locations onNavigate={handleNavigate} fetchHierarchy={fetchHierarchy} />;
      case "/allocation":
        return (
          <Allocation
            onNavigate={handleNavigate}
            fetchSummary={fetchAllocationSummary}
            fetchHierarchy={fetchHierarchy}
            fetchLocations={fetchHierarchy}
            onConfirmAlloc={async (payload) => ({
              txHash: null,
              mode: "blockchain-readonly",
              payload,
            })}
          />
        );
      case "/distribution":
        return (
          <Distribution
            onNavigate={handleNavigate}
            fetchSchedules={fetchDistributionSchedules}
            fetchHierarchy={fetchHierarchy}
            fetchOfficers={fetchOfficers}
            onCreateSchedule={createDistributionSchedule}
            onMarkDistributed={async ({ nrc }) => confirmDistributionByFarmerId(nrc)}
            onViewSchedule={async (id) => {
              const schedules = await fetchDistributionSchedules();
              return (schedules || []).find((row) => String(row?.id) === String(id)) || null;
            }}
            currentUser={currentUser}
          />
        );
      case "/audit":
        return (
          <Audit
            onNavigate={handleNavigate}
            fetchLogs={fetchChainAuditLogs}
            onExportAudit={exportChainAuditLogs}
            onExport={exportChainAuditLogs}
          />
        );
      case "/settings":
        return (
          <Settings
            onNavigate={handleNavigate}
            fetchSettings={fetchSettings}
            onSaveSettings={api.saveSettings}
            onCreateOfficer={({ walletAddress }) => authorizeOfficer(walletAddress)}
            onDeactivateUser={deactivateOfficer}
            onReactivateUser={activateOfficer}
            onResetPasswords={() => api.resetPasswords({})}
          />
        );
      default:
        return (
          <Farmers
            onNavigate={handleNavigate}
            currentUser={currentUser}
            fetchFarmers={fetchAppFarmers}
            onApprove={handleApprove}
            onReject={handleReject}
            onView={async (id) => {
              const farmer = farmers.find((row) => row.id === id || row.farmerId === id) || null;
              return buildFarmerDetails(farmer);
            }}
            onRegister={handleRegister}
            registrationLocationConfig={officerLocationConfig}
            onExport={async () => ({ ok: true })}
            isOwner={canModerate}
            ownershipLoading={false}
            ownershipError=""
            subscribeEvent={null}
            onLogout={handleLogout}
            ownerAddress={ownerAddress}
            loading={loading}
          />
        );
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} error={authError} />;
  }

  return renderPage();
}

export default function App() {
  return (
    <WalletProvider>
      <AppInner />
    </WalletProvider>
  );
}
