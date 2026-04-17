import { CloseIcon, ErrorIcon, PendingIcon, SuccessIcon } from "./icons";

export default function TxStatus({ status, txHash, error, onDismiss }) {
  if (!status) return null;

  const config = {
    pending: {
      bg: "#fef9c3",
      border: "#fde68a",
      color: "#92400e",
      icon: PendingIcon,
      text: "Transaction pending...",
    },
    success: {
      bg: "#dcfce7",
      border: "#bbf7d0",
      color: "#166534",
      icon: SuccessIcon,
      text: "Transaction confirmed.",
    },
    error: {
      bg: "#fee2e2",
      border: "#fecaca",
      color: "#991b1b",
      icon: ErrorIcon,
      text: error || "Transaction failed.",
    },
  };

  const { bg, border, color, icon: Icon, text } = config[status];

  return (
    <div style={{ ...s.banner, background: bg, border: `1px solid ${border}`, color }}>
      <span style={s.icon}>
        <Icon size={16} />
      </span>
      <div style={s.body}>
        <div style={s.text}>{text}</div>
        {txHash && (
          <div style={s.hash}>
            Tx: <span style={s.mono}>{txHash.slice(0, 18)}...{txHash.slice(-6)}</span>
          </div>
        )}
      </div>
      {onDismiss && (
        <button style={{ ...s.closeBtn, color }} onClick={onDismiss} aria-label="Dismiss transaction status">
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  );
}

const s = {
  banner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: "1px",
  },
  body: { flex: 1 },
  text: { fontSize: "13px", fontWeight: "600" },
  hash: { fontSize: "11px", marginTop: "2px", opacity: 0.8 },
  mono: { fontFamily: "monospace" },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0 2px",
    flexShrink: 0,
    opacity: 0.7,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
