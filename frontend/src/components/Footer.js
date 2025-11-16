import { Link } from "react-router-dom";
import { Instagram, Youtube, Music2 } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="cyber-grid border-t-2 neon-border mt-auto" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 neon-border rounded-lg flex items-center justify-center" style={{background: 'rgba(0, 255, 65, 0.1)'}}>
                <Music2 className="w-5 h-5 matrix-glow" />
              </div>
              <span className="text-xl font-bold brand-text matrix-glow">
                SendMyBeat
              </span>
            </div>
            <p className="text-sm text-center md:text-left matrix-glow">
              Empowering music producers to maximize beat discoverability.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center">
            <h3 className="font-semibold matrix-glow mb-3">Quick Links</h3>
            <nav className="flex flex-col gap-2 text-sm text-center">
              <Link
                to="/about"
                className="matrix-glow hover:text-white transition-colors rgb-hover"
              >
                About
              </Link>
              <Link
                to="/privacy-policy"
                className="matrix-glow hover:text-white transition-colors rgb-hover"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="matrix-glow hover:text-white transition-colors rgb-hover"
              >
                Terms & Conditions
              </Link>
            </nav>
          </div>

          {/* Social Links */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="font-semibold matrix-glow mb-3">Connect With Us</h3>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/dead.at.18"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 neon-border rounded-full flex items-center justify-center hover:scale-110 transition-transform pulse-glow"
                style={{background: 'rgba(0, 255, 65, 0.1)'}}
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 matrix-glow" />
              </a>
              <a
                href="https://www.youtube.com/@deadat1897"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 neon-border rounded-full flex items-center justify-center hover:scale-110 transition-transform pulse-glow"
                style={{background: 'rgba(0, 255, 65, 0.1)'}}
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5 matrix-glow" />
              </a>
              <a
                href="https://soundcloud.com/deadat18"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 neon-border rounded-full flex items-center justify-center hover:scale-110 transition-transform pulse-glow"
                style={{background: 'rgba(0, 255, 65, 0.1)'}}
                aria-label="SoundCloud"
              >
                <Music2 className="w-5 h-5 matrix-glow" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t-2 neon-border text-center">
          <p className="text-sm matrix-glow">
            © {currentYear} SendMyBeat. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
