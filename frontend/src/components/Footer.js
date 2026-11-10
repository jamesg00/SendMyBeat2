import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer mt-auto">
      <div className="app-footer-row">
        <span className="app-footer-title smb-wordmark">SENDMYBEAT</span>
        <nav className="app-footer-links" aria-label="Footer">
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
