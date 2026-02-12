import { Link } from "react-router-dom";
import { Instagram, Youtube, Music2 } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer mt-auto">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="app-footer-brand flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="app-footer-logo w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center">
                <Music2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="app-footer-title text-lg sm:text-xl font-bold">SendMyBeat</span>
            </div>
            <p className="app-footer-text text-xs sm:text-sm text-center md:text-left">
              Empowering music producers to maximize beat discoverability.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="app-footer-heading font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Quick Links</h3>
            <nav className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm text-center">
              <Link to="/about" className="app-footer-link transition-colors">About</Link>
              <Link to="/privacy-policy" className="app-footer-link transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="app-footer-link transition-colors">Terms & Conditions</Link>
            </nav>
          </div>

          <div className="flex flex-col items-center md:items-end">
            <h3 className="app-footer-heading font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Connect With Us</h3>
            <div className="flex gap-3 sm:gap-4">
              <a
                href="https://instagram.com/dead.at.18"
                target="_blank"
                rel="noopener noreferrer"
                className="app-footer-icon w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://www.youtube.com/@deadat1897"
                target="_blank"
                rel="noopener noreferrer"
                className="app-footer-icon w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="https://soundcloud.com/deadat18"
                target="_blank"
                rel="noopener noreferrer"
                className="app-footer-icon w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="SoundCloud"
              >
                <Music2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="app-footer-bottom mt-6 sm:mt-8 pt-4 sm:pt-6 text-center">
          <p className="text-xs sm:text-sm app-footer-text">
            © {currentYear} SendMyBeat. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
