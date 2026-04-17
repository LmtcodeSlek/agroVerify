import { colors } from "../theme";

export default function StatCard({ icon, label, value, sub, subColor }) {
  return (
    <div style={s.card}>
      {icon && <div style={s.icon}>{icon}</div>}
      <div style={s.label}>{label}</div>
      <div style={s.value}>{value ?? "-"}</div>
      {sub && <div style={{ ...s.sub, color: subColor || colors.green }}>{sub}</div>}
    </div>
  );
}

const s = {
  card: {
    background: "white",
    borderRadius: "10px",
    padding: "14px",
    border: `1px solid ${colors.border}`,
  },
  icon: {
    marginBottom: "6px",
    color: colors.navy,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: "11px", color: colors.muted, marginBottom: "4px" },
  value: { fontSize: "22px", fontWeight: "700", color: colors.navy },
  sub: { fontSize: "11px", marginTop: "2px" },
};
