import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { btnOutline, btnPrimary, colors } from "../theme";

export default function CreateOfficerModal({ open, onClose, onCreate }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");

  useEffect(() => {
    if (open) {
      setWalletAddress("");
      setError("");
      setSaving(false);
      setVerified(false);
      setVerifyMessage("");
    }
  }, [open]);

  if (!open) return null;

  const verifyAddress = () => {
    const value = walletAddress.trim();
    if (!value) {
      setVerified(false);
      setVerifyMessage("");
      setError("Officer wallet address is required.");
      return false;
    }

    if (!ethers.isAddress(value)) {
      setVerified(false);
      setVerifyMessage("");
      setError("Enter a valid Ethereum wallet address.");
      return false;
    }

    setError("");
    setVerified(true);
    setVerifyMessage("Wallet address verified and ready for on-chain authorization.");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = verifyAddress();
    if (!isValid) return;

    setSaving(true);
    try {
      await onCreate?.({
        walletAddress: ethers.getAddress(walletAddress.trim()),
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to authorize officer on chain.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.title}>Authorize Blockchain Officer</h3>
        <p style={s.subtitle}>This action records an officer wallet address directly on chain. No database account or password is created.</p>

        {error ? <div style={s.error}>{error}</div> : null}
        {verifyMessage ? <div style={verified ? s.success : s.info}>{verifyMessage}</div> : null}

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Officer Wallet Address (0x...)</label>
          <input
            value={walletAddress}
            onChange={(e) => {
              setWalletAddress(e.target.value);
              setVerified(false);
              setVerifyMessage("");
              if (error) setError("");
            }}
            style={{ ...s.input, ...(verified ? s.inputVerified : {}) }}
            placeholder="0x1234...abcd"
            disabled={saving}
          />

          <div style={s.actions}>
            <button type="button" style={btnOutline} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" style={btnOutline} onClick={verifyAddress} disabled={saving}>
              Verify Address
            </button>
            <button type="submit" style={btnPrimary} disabled={saving}>
              {saving ? "Authorizing..." : "Authorize on Chain"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.42)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  },
  modal: {
    width: "100%",
    maxWidth: "560px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
    border: "1px solid #dbe4f0",
    padding: "20px",
  },
  title: {
    margin: 0,
    color: colors.navy,
    fontSize: "18px",
    fontWeight: 700,
  },
  subtitle: {
    margin: "6px 0 14px",
    color: colors.muted,
    fontSize: "12px",
    lineHeight: 1.5,
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: colors.danger,
    padding: "8px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    marginBottom: "10px",
  },
  info: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    padding: "8px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    marginBottom: "10px",
  },
  success: {
    background: "#ecfdf5",
    border: "1px solid #86efac",
    color: "#166534",
    padding: "8px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    marginBottom: "10px",
  },
  form: {
    display: "grid",
    gap: "8px",
  },
  label: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#334155",
    marginTop: "4px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: `1px solid ${colors.border}`,
    fontSize: "13px",
    outline: "none",
    background: "white",
    fontFamily: "monospace",
  },
  inputVerified: {
    borderColor: "#22c55e",
    boxShadow: "0 0 0 3px rgba(34,197,94,0.12)",
  },
  actions: {
    marginTop: "10px",
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
};
