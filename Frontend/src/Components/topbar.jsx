import { useState } from "react";
import { colors, font } from "../theme";
import { LocationIcon, LogoutIcon, SearchIcon } from "./icons";

export default function Topbar({ location, user, onSearch, onLogout, searchPlaceholder = "Search..." }) {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = (e) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const initials = user?.initials || (user?.name ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?");

  return (
    <header style={s.topbar}>
      <div style={s.left}>
        <span style={s.iconWrap}>
          <LocationIcon size={14} />
        </span>
        <span style={s.locationLabel}>{location || "-"}</span>

        {onSearch && (
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>
              <SearchIcon size={13} />
            </span>
            <input type="text" value={query} onChange={handleSearch} placeholder={searchPlaceholder} style={s.searchInput} />
          </div>
        )}
      </div>

      <div style={s.right}>
        <div style={s.userMeta}>
          <div style={s.userName}>{user?.name || "-"}</div>
          <div style={s.userRole}>{user?.role || ""}</div>
        </div>

        <div style={{ position: "relative" }}>
          <button style={s.avatar} onClick={() => setMenuOpen((v) => !v)} title="Account menu">
            {initials}
          </button>

          {menuOpen && (
            <div style={s.dropdown}>
              <button
                style={s.dropItem}
                onClick={() => {
                  setMenuOpen(false);
                  onLogout?.();
                }}
              >
                <LogoutIcon size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const s = {
  topbar: {
    background: "white",
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
    position: "sticky",
    top: 0,
    zIndex: 30,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  iconWrap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.muted,
  },
  locationLabel: {
    fontSize: "13px",
    color: "#555",
    fontWeight: "600",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    background: "#f0f2f5",
    borderRadius: "20px",
    padding: "6px 14px",
    gap: "6px",
    marginLeft: "12px",
  },
  searchIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },
  searchInput: {
    background: "none",
    border: "none",
    outline: "none",
    fontSize: "12px",
    color: "#555",
    width: "180px",
    fontFamily: font,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userMeta: { textAlign: "right" },
  userName: { fontSize: "12px", fontWeight: "600", color: colors.navy },
  userRole: { fontSize: "10px", color: colors.muted },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: colors.navy,
    color: "white",
    fontSize: "12px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    fontFamily: font,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    position: "absolute",
    right: 0,
    top: "38px",
    background: "white",
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    zIndex: 100,
    minWidth: "140px",
    overflow: "hidden",
  },
  dropItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "10px 16px",
    textAlign: "left",
    background: "none",
    border: "none",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: font,
    color: colors.text,
  },
};
