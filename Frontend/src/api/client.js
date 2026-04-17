const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api";
const TOKEN_KEY = "agroverify_token";

function isBackendEnabled() {
  const flag = process.env.REACT_APP_USE_BACKEND;
  if (flag !== undefined && flag !== null && String(flag).trim() !== "") {
    return String(flag).trim().toLowerCase() === "true";
  }
  return Boolean(String(API_BASE || "").trim());
}

const BACKEND_ENABLED = isBackendEnabled();
const BLOCKCHAIN_ONLY_MODE = !BACKEND_ENABLED;

function getOfflineFallback(path) {
  if (path === "/dashboard/stats") return {};
  if (path.startsWith("/locations/hierarchy")) return { provinces: [], districts: [], towns: [], villages: [], summary: null };
  if (path === "/farmers/") return [];
  if (path === "/officers/") return [];
  if (path === "/officers/summary") return {};
  if (path === "/distribution/schedules") return [];
  if (path === "/settings") return {};
  return null;
}

function buildApiUnavailableError(path, method = "GET") {
  const action = String(method || "GET").toUpperCase();
  if (BLOCKCHAIN_ONLY_MODE) {
    const message = action === "GET"
      ? `Blockchain-only mode is active. API data for ${path} is unavailable, so the app is using an empty fallback instead.`
      : `Blockchain-only mode is active. This action still depends on the API endpoint ${path} and has not been moved fully on-chain yet.`;
    const error = new Error(message);
    error.path = path;
    error.blockchainOnly = true;
    return error;
  }

  const error = new Error(
    `Cannot reach the API server at ${API_BASE}. Make sure the backend is running and reachable.`
  );
  error.path = path;
  return error;
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const fallback = actionAllowsOfflineFallback(method) ? getOfflineFallback(path) : null;
    if (fallback !== null) {
      return fallback;
    }
    const networkError = buildApiUnavailableError(path, method);
    networkError.cause = error;
    throw networkError;
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    let message = data?.detail || data?.message || text || `Request failed: ${res.status}`;
    if (typeof message === "object") {
      try {
        message = JSON.stringify(message);
      } catch {
        message = "Request failed.";
      }
    }
    const error = new Error(message);
    error.status = res.status;
    error.path = path;
    error.body = data;
    throw error;
  }
  return data;
}

async function download(path, { params = {}, auth = true } = {}) {
  const q = new URLSearchParams(params);
  const headers = {};
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}${q.toString() ? `?${q}` : ""}`, {
      method: "GET",
      headers,
    });
  } catch (error) {
    if (BLOCKCHAIN_ONLY_MODE && path === "/audit/logs/export") {
      return {
        blob: new Blob(["date,time,action,detail,meta\n"], { type: "text/csv;charset=utf-8" }),
        filename: "audit-log.csv",
      };
    }
    const networkError = buildApiUnavailableError(path, "GET");
    networkError.cause = error;
    throw networkError;
  }

  if (!res.ok) {
    const text = await res.text();
    let message = `Request failed: ${res.status}`;
    try {
      const data = text ? JSON.parse(text) : null;
      message = data?.detail || data?.message || message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob: await res.blob(),
    filename: match?.[1] || "download.csv",
  };
}

function actionAllowsOfflineFallback(method = "GET") {
  return BLOCKCHAIN_ONLY_MODE && String(method || "GET").toUpperCase() === "GET";
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  dashboardStats: () => request("/dashboard/stats"),
  locationsHierarchy: (params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/locations/hierarchy${q.toString() ? `?${q}` : ""}`);
  },

  listFarmers: () => request("/farmers/"),
  getFarmer: (id) => request(`/farmers/${id}`),
  registerFarmer: (payload) => request("/farmers/register", { method: "POST", body: payload }),
  approveFarmer: (payload) => request("/farmers/approve", { method: "POST", body: payload }),
  rejectFarmer: (payload) => request("/farmers/reject", { method: "POST", body: payload }),

  listOfficers: () => request("/officers/"),
  getOfficer: (id) => request(`/officers/${id}`),
  officersSummary: () => request("/officers/summary"),
  createOfficer: (payload) => request("/officers/", { method: "POST", body: payload }),
  deactivateOfficer: (id) => request(`/officers/${id}/deactivate`, { method: "POST" }),
  reactivateOfficer: (id) => request(`/officers/${id}/reactivate`, { method: "POST" }),
  resetPasswords: (payload) => request("/officers/reset-passwords", { method: "POST", body: payload }),

  calcAllocation: (payload) => request("/allocation/calculate", { method: "POST", body: payload }),
  confirmAllocation: (payload) => request("/allocation/confirm", { method: "POST", body: payload }),

  listSchedules: () => request("/distribution/schedules"),
  createSchedule: (payload) => request("/distribution/schedules", { method: "POST", body: payload }),
  confirmDistribution: (payload) => request("/distribution/confirm", { method: "POST", body: payload }),

  auditLogs: (params = {}) => {
    const query = {};
    if (params.action) query.action = params.action;
    if (params.user) query.user_id = params.user;
    if (params.date) {
      query.date_from = params.date;
      query.date_to = params.date;
    }
    const q = new URLSearchParams(query);
    return request(`/audit/logs${q.toString() ? `?${q}` : ""}`);
  },
  exportAuditLogs: (params = {}) => {
    const query = {};
    if (params.action) query.action = params.action;
    if (params.user) query.user_id = params.user;
    if (params.date) {
      query.date_from = params.date;
      query.date_to = params.date;
    }
    return download("/audit/logs/export", { params: query });
  },

  getSettings: () => request("/settings"),
  saveSettings: (payload) => request("/settings", { method: "POST", body: payload }),
};
