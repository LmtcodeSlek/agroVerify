import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar  from "./topbar";
import Footer from "./Footer";
import { colors } from "../theme";
import { useWalletContext } from "../context/WalletContext";

const SIDEBAR_EXPANDED_WIDTH = 180;
const SIDEBAR_COLLAPSED_WIDTH = 56;

/**
 * Layout
 * Wraps every authenticated page with Sidebar + Topbar.
 *
 * Props:
 *  activePath          – current route path string
 *  onNavigate          – (path: string) => void
 *  onSearch            – (query: string) => void  (optional)
 *  searchPlaceholder   – string (optional)
 *  location            – string (optional, defaults to user's assigned location)
 *  children            – page content
 */
export default function Layout({
  activePath,
  onNavigate,
  onSearch,
  searchPlaceholder,
  location,
  children,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("agroverify_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [geoLabel, setGeoLabel] = useState("");
  const { user, logoutUser }      = useWalletContext();

  useEffect(() => {
    if (location || user?.location) return;
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude?.toFixed(4);
        const lng = pos.coords.longitude?.toFixed(4);
        if (lat && lng) setGeoLabel(`Lat ${lat}, Lng ${lng}`);
      },
      () => {
        setGeoLabel("Location unavailable");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [location, user?.location]);

  useEffect(() => {
    try {
      localStorage.setItem("agroverify_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  const displayLocation = location || user?.location || geoLabel || "—";

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <div style={s.shell}>
      <Sidebar
        activePath={activePath}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
      />

      <div style={{ ...s.main, marginLeft: `${sidebarWidth}px` }}>
        <Topbar
          location={displayLocation}
          user={user}
          onSearch={onSearch}
          onLogout={logoutUser}
          searchPlaceholder={searchPlaceholder}
        />
        <div style={s.content}>
          <div style={s.page}>
            {children}
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

const s = {
  shell: {
    display: "flex",
    width: "100%",
    minHeight: "100vh",
    background: colors.white,
    overflow: "visible",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: colors.bg,
    overflow: "visible",
    minWidth: 0,
    minHeight: "100vh",
    transition: "margin-left 0.2s ease",
  },
  content: {
    flex: "1 1 auto",
    padding: "20px 24px",
    overflow: "visible",
    display: "flex",
    flexDirection: "column",
  },
  page: {
    flex: "1 0 auto",
    minHeight: "auto",
  },
};
