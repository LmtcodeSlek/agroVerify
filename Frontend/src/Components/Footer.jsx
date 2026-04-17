import { colors, font } from "../theme";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={s.root} aria-label="Footer">
      <div style={s.inner}>
        <div style={s.brand}>
          <img
            src="/image.jpg"
            alt="Ministry of Agriculture"
            style={s.logo}
            onError={(e) => {
              e.currentTarget.onerror = null;
              if (!e.currentTarget.dataset.fallbackTried) {
                e.currentTarget.dataset.fallbackTried = "1";
                e.currentTarget.src = "/image.png";
                return;
              }
              e.currentTarget.src = "/logo192.png";
            }}
          />
          <div style={s.brandText}>
            <div style={s.brandTitle}>Ministry of Agriculture</div>
            <div style={s.brandSub}>AgroVerify</div>
          </div>
        </div>

        <div style={s.block}>
          <div style={s.heading}>Mission</div>
          <div style={s.text}>
            Supporting transparent, data-driven farmer registration and distribution workflows.
          </div>
        </div>

        <div style={s.block}>
          <div style={s.heading}>Links</div>
          <div style={s.links}>
            <a style={s.link} href="#support">Support</a>
            <a style={s.link} href="#privacy">Privacy</a>
            <a style={s.link} href="#terms">Terms</a>
          </div>
        </div>

        <div style={s.block}>
          <div style={s.heading}>Contact</div>
          <div style={s.text}>Ministry of Agriculture, Zambia</div>
          <div style={s.text}>Email: support@agroverify.local</div>
        </div>
      </div>

      <div style={s.bottom}>
        <div style={s.copyright}>
          © {year} Ministry of Agriculture. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

const s = {
  root: {
    margin: "24px -24px -20px",
    background: "#2e3646",
    color: "rgba(255,255,255,0.86)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  inner: {
    display: "flex",
    flexWrap: "wrap",
    gap: "18px",
    padding: "26px 24px",
    alignItems: "flex-start",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: "220px",
    flex: "1 1 260px",
  },
  logo: {
    width: "64px",
    height: "64px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.08)",
    objectFit: "contain",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  brandText: {
    minWidth: 0,
  },
  brandTitle: {
    fontFamily: font,
    fontWeight: "800",
    fontSize: "14px",
    lineHeight: 1.2,
    color: colors.white,
  },
  brandSub: {
    fontFamily: font,
    fontWeight: "600",
    fontSize: "12px",
    marginTop: "4px",
    color: "rgba(255,255,255,0.7)",
  },
  block: {
    flex: "1 1 200px",
    minWidth: "180px",
  },
  heading: {
    fontFamily: font,
    fontSize: "12px",
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  text: {
    fontFamily: font,
    fontSize: "12px",
    color: "rgba(255,255,255,0.68)",
    lineHeight: 1.55,
  },
  links: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  link: {
    fontFamily: font,
    fontSize: "12px",
    color: "rgba(255,255,255,0.78)",
    textDecoration: "none",
  },
  bottom: {
    padding: "12px 24px 16px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.18)",
  },
  copyright: {
    fontFamily: font,
    fontSize: "12px",
    color: "rgba(255,255,255,0.7)",
  },
};
