import { colors, font } from "../theme";
import { useWalletContext } from "../context/WalletContext";
import {
  AllocationIcon,
  AuditIcon,
  DashboardIcon,
  DistributionIcon,
  FarmersIcon,
  LocationIcon,
  MenuIcon,
  OfficersIcon,
  SettingsIcon,
} from "./icons";

const NAV = [
  { section: "MAIN", items: [{ icon: DashboardIcon, label: "Dashboard", path: "/dashboard", roles: ["admin", "officer"] }] },
  {
    section: "PEOPLE",
    items: [
      { icon: FarmersIcon, label: "Farmers", path: "/farmers", roles: ["admin", "officer"] },
      { icon: OfficersIcon, label: "Officers", path: "/officers", roles: ["admin"] },
    ],
  },
  { section: "GEOGRAPHY", items: [{ icon: LocationIcon, label: "Locations", path: "/locations", roles: ["admin"] }] },
  {
    section: "GOVERNANCE",
    items: [
      { icon: AllocationIcon, label: "Allocation", path: "/allocation", roles: ["admin"] },
      { icon: DistributionIcon, label: "Distribution", path: "/distribution", roles: ["admin", "officer"] },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { icon: AuditIcon, label: "Audit", path: "/audit", roles: ["admin"] },
      { icon: SettingsIcon, label: "Settings", path: "/settings", roles: ["admin"] },
    ],
  },
];

export default function Sidebar({ activePath, onNavigate, collapsed, onToggle }) {
  const { user } = useWalletContext();
  const role = String(user?.role || "").toLowerCase();
  const visibleNav = NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);

  return (
    <aside style={{ ...s.sidebar, width: collapsed ? "56px" : "180px" }}>
      <div style={s.header}>
        <button style={s.menuBtn} onClick={onToggle} aria-label="Toggle sidebar">
          <MenuIcon size={18} />
        </button>
      </div>

      {visibleNav.map(({ section, items }) => (
        <div key={section}>
          <div style={{ ...s.sectionTitle, ...(collapsed ? s.sectionTitleCollapsed : {}) }}>
            {section}
          </div>
          {items.map(({ icon: Icon, label, path }) => {
            const isActive = activePath === path;
            return (
              <button
                key={path}
                style={{ ...s.navItem, ...(collapsed ? s.navItemCollapsed : {}), ...(isActive ? s.navItemActive : {}) }}
                onClick={() => onNavigate(path)}
                title={collapsed ? label : undefined}
              >
                <span style={s.navIcon}>
                  <Icon size={16} />
                </span>
                <span style={{ ...s.navLabel, ...(collapsed ? s.navLabelCollapsed : {}) }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

const s = {
  sidebar: {
    background: colors.navy,
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    flexShrink: 0,
    transition: "width 0.2s ease",
    overflowX: "hidden",
    overflowY: "auto",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100vh",
    zIndex: 40,
  },
  header: {
    padding: "0 16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    marginBottom: "16px",
  },
  menuBtn: {
    background: "none",
    border: "none",
    color: "white",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    fontFamily: font,
  },
  sectionTitle: {
    fontSize: "9px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    padding: "0 16px",
    margin: "12px 0 4px",
    transition: "opacity 0.2s ease",
  },
  sectionTitleCollapsed: {
    color: "transparent",
    visibility: "hidden",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 16px",
    color: "rgba(255,255,255,0.65)",
    fontSize: "13px",
    cursor: "pointer",
    background: "none",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: font,
    transition: "background 0.15s, color 0.15s",
    whiteSpace: "nowrap",
    justifyContent: "flex-start",
    position: "relative",
    zIndex: 2,
    pointerEvents: "auto",
  },
  navItemCollapsed: {
    gap: 0,
    padding: "9px 0",
    justifyContent: "center",
  },
  navItemActive: {
    background: colors.green,
    color: "white",
    fontWeight: "600",
  },
  navIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
    flexShrink: 0,
  },
  navLabel: {
    display: "inline-block",
    maxWidth: "120px",
    opacity: 1,
    overflow: "hidden",
    transition: "opacity 0.15s ease, max-width 0.2s ease",
  },
  navLabelCollapsed: {
    maxWidth: 0,
    opacity: 0,
  },
};
