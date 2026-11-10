import { Link, useLocation } from "react-router-dom";

// Shown under the public pages; the signed-in app has these links on Profile instead.
const PUBLIC = ["/", "/about", "/privacy-policy", "/terms"];

const Footer = () => {
  const { pathname } = useLocation();
  if (!PUBLIC.includes(pathname)) return null;
  return (
    <footer style={{ borderTop: "1px solid var(--line-soft)", background: "var(--bg)" }}>
      <div className="s-screen s-screen--wide" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 20, padding: "20px 20px 28px" }}>
        <span className="s-display" style={{ fontSize: 15 }}>
          SendMyBeat
        </span>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 18, marginLeft: "auto" }} aria-label="Footer">
          <Link to="/about" className="s-link" style={{ color: "var(--t2)", fontWeight: 400 }}>
            About
          </Link>
          <Link to="/privacy-policy" className="s-link" style={{ color: "var(--t2)", fontWeight: 400 }}>
            Privacy Policy
          </Link>
          <Link to="/terms" className="s-link" style={{ color: "var(--t2)", fontWeight: 400 }}>
            Terms
          </Link>
          <a href="https://www.youtube.com/@deadat1897" target="_blank" rel="noopener noreferrer" className="s-link" style={{ color: "var(--t2)", fontWeight: 400 }} aria-label="YouTube">
            YouTube
          </a>
        </nav>
        <span className="s-hint">&copy; {new Date().getFullYear()} SendMyBeat</span>
      </div>
    </footer>
  );
};

export default Footer;
