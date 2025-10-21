import { Link } from "react-router-dom";
import { Instagram, Youtube, Music2 } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Music2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SendMyBeat
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left">
              Empowering music producers to maximize beat discoverability.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Links</h3>
            <nav className="flex flex-col gap-2 text-sm text-center">
              <Link
                to="/about"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                About
              </Link>
              <Link
                to="/privacy-policy"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Terms & Conditions
              </Link>
            </nav>
          </div>

          {/* Social Links */}
          <div className="flex flex-col items-center md:items-end">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Connect With Us</h3>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/dead.at.18"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-white" />
              </a>
              <a
                href="https://www.youtube.com/@deadat1897"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5 text-white" />
              </a>
              <a
                href="https://soundcloud.com/deadat18"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="SoundCloud"
              >
                <Music2 className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {currentYear} SendMyBeat. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
