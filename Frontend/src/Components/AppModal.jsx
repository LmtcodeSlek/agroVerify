import { colors, btnPrimary } from "../theme";

export default function AppModal({ open, title, message, content, onClose }) {
  if (!open) return null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.title}>{title || "Notice"}</h3>
        <div style={s.message}>
          {content ?? message}
        </div>
        <div style={s.actions}>
          <button style={{ ...btnPrimary, minWidth: "96px" }} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.28)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  },
  modal: {
    width: "100%",
    maxWidth: "520px",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 18px 48px rgba(0,0,0,0.2)",
    border: "1px solid #eef2f7",
    padding: "18px 18px 14px",
  },
  title: {
    margin: 0,
    color: colors.navy,
    fontSize: "18px",
    fontWeight: 700,
  },
  message: {
    marginTop: "10px",
    color: "#334155",
    whiteSpace: "pre-wrap",
    lineHeight: 1.45,
    fontSize: "13px",
  },
  actions: {
    marginTop: "14px",
    display: "flex",
    justifyContent: "flex-end",
  },
};
