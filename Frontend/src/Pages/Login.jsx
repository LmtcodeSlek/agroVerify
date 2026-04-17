import { useState } from "react";

const PortalLogo = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#1a2744" />
    <path d="M24 10 C18 10 13 15 13 21 C13 27 18 30 24 30 C30 30 35 27 35 21 C35 15 30 10 24 10Z" fill="#2d6a4f" opacity="0.8" />
    <path d="M24 16 L24 34 M20 20 L24 16 L28 20" stroke="#f0c040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="36" r="2.5" fill="#f0c040" />
  </svg>
);

export default function Login({ onLoginSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setIsLoading(true);
    setError("");
    try {
      await onLoginSuccess?.();
    } catch (err) {
      setError(err?.message || "Unable to connect wallet.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.blobTopLeft} />
      <div style={styles.blobBottomRight} />
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <PortalLogo />
          <h1 style={styles.title}>Farmer ID Portal</h1>
          <p style={styles.subtitle}>Connect MetaMask to continue. Roles are resolved directly from AgriTrust.</p>
        </div>

        {error ? <div style={styles.errorBanner}>{error}</div> : null}

        <button
          type="button"
          style={{ ...styles.submitBtn, opacity: isLoading ? 0.75 : 1 }}
          onClick={handleConnect}
          disabled={isLoading}
        >
          {isLoading ? "Connecting Wallet..." : "Connect Wallet"}
        </button>

        <div style={styles.helperText}>
          Admin wallet: <span style={styles.mono}>0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1a2744 0%, #2d6a4f 50%, #1a4a35 100%)",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: "24px",
  },
  blobTopLeft: {
    position: "absolute",
    top: "-80px",
    left: "-80px",
    width: "320px",
    height: "320px",
    background: "rgba(255,255,255,0.06)",
    borderRadius: "50%",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: "-100px",
    right: "-60px",
    width: "400px",
    height: "400px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "50%",
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "40px 36px 32px",
    width: "100%",
    maxWidth: "440px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
    position: "relative",
    zIndex: 1,
  },
  cardHeader: {
    textAlign: "center",
    marginBottom: "28px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a2744",
    margin: "12px 0 4px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#667085",
    margin: 0,
    lineHeight: 1.6,
  },
  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#dc2626",
    marginBottom: "20px",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "#1a2744",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
  },
  helperText: {
    marginTop: "16px",
    fontSize: "12px",
    color: "#667085",
    textAlign: "center",
    lineHeight: 1.6,
  },
  mono: {
    fontFamily: "monospace",
    wordBreak: "break-all",
  },
};
