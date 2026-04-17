export const font = "'DM Sans', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";

export const colors = {
  white: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  navy: "#1f2a44",
  green: "#16a34a",
  greenLight: "#dcfce7",
  info: "#2563eb",
  warning: "#d97706",
  danger: "#dc2626",
  border: "#e5e7eb",
  bg: "#f8fafc",
};

export const card = {
  background: colors.white,
  borderRadius: "10px",
  border: `1px solid ${colors.border}`,
};

export const btnPrimary = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.green}`,
  background: colors.green,
  color: colors.white,
  fontSize: "12px",
  fontWeight: "600",
  fontFamily: font,
  cursor: "pointer",
};

export const btnOutline = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.border}`,
  background: colors.white,
  color: colors.text,
  fontSize: "12px",
  fontWeight: "600",
  fontFamily: font,
  cursor: "pointer",
};

const badgePalette = {
  green: { bg: "#dcfce7", color: "#166534" },
  blue: { bg: "#dbeafe", color: "#1e40af" },
  yellow: { bg: "#fef3c7", color: "#92400e" },
  red: { bg: "#fee2e2", color: "#991b1b" },
  gray: { bg: "#f3f4f6", color: "#374151" },
};

export function badge(variant = "gray") {
  const tone = badgePalette[variant] || badgePalette.gray;
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "2px 8px",
    fontSize: "10px",
    fontWeight: "700",
    lineHeight: 1.5,
    background: tone.bg,
    color: tone.color,
  };
}
