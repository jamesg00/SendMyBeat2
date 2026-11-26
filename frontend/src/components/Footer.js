import { Link } from "react-router-dom";
import { TOOL_PAGES } from "@/lib/seoModel";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer mt-auto">
      <div className="app-footer-row">
        <span className="app-footer-title smb-wordmark">SENDMYBEAT</span>
        <nav className="app-footer-links" aria-label="Footer">
          <Link to="/free-tag-generator" className="app-footer-link">Free tag generator</Link>
          {Object.entries(TOOL_PAGES).map(([path, tool]) => (
            <Link key={path} to={path} className="app-footer-link">{tool.nav}</Link>
          ))}
          <Link to="/type-beat-tags" className="app-footer-link">Type beat tags</Link>
          <Link to="/blog" className="app-footer-link">Blog</Link>
          <Link to="/about" className="app-footer-link">About</Link>
          <Link to="/privacy-policy" className="app-footer-link">Privacy</Link>
          <Link to="/terms" className="app-footer-link">Terms</Link>
          <a
            href="https://www.youtube.com/@deadat1897"
            target="_blank"
            rel="noopener noreferrer"
            className="app-footer-link"
          >
            YouTube
          </a>
        </nav>
        <p className="app-footer-text">&copy; {currentYear} SendMyBeat</p>
      </div>
    </footer>
  );
};

export default Footer;
