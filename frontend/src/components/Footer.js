import { Link, useLocation } from "react-router-dom";
const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const isLandingFooter = location.pathname === "/";

  return (
    <footer className={`app-footer mt-auto ${isLandingFooter ? "app-footer--landing" : ""}`}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4">
        <div className="app-footer-row">
          <div className="app-footer-brand-inline">
            <span className="app-footer-title text-sm font-bold">SENDMYBEAT</span>
          </div>

          <nav className="app-footer-links text-xs sm:text-sm">
            <Link to="/about" className="app-footer-link transition-colors">About</Link>
            <Link to="/privacy-policy" className="app-footer-link transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="app-footer-link transition-colors">Terms</Link>
            <a
              href="https://instagram.com/dead.at.18"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-link transition-colors"
              aria-label="Instagram"
            >
              Instagram
            </a>
            <a
              href="https://www.youtube.com/@deadat1897"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-link transition-colors"
              aria-label="YouTube"
            >
              YouTube
            </a>
            <a
              href="https://soundcloud.com/deadat18"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-link transition-colors"
              aria-label="SoundCloud"
            >
              SoundCloud
            </a>
          </nav>

          <div className="app-footer-bottom">
            <p className="text-xs sm:text-sm app-footer-text">
              &copy; {currentYear} SendMyBeat
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
