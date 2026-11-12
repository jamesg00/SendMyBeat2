import { useState, useEffect } from "react";
import "@/App.css";
import "@/styles/console.css";
import "@/styles/pros.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import AdminCosts from "@/pages/AdminCosts";
import AdminUsers from "@/pages/AdminUsers";
import ProducerSpotlight from "@/pages/ProducerSpotlight";
import ProPage from "@/pages/ProPage";
import ProPlanPage from "@/pages/ProPlanPage";
import YouTubeCallback from "@/pages/YouTubeCallback";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import About from "@/pages/About";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/ThemeContext";
import { clearAuthToken, getAuthToken } from "@/lib/auth";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE_URL;
const API_BASE_URL = (BACKEND_URL || window.location.origin).replace(/\/$/, "");
export const API = `${API_BASE_URL}/api`;

if (!BACKEND_URL) {
  console.warn("Missing REACT_APP_BACKEND_URL / REACT_APP_API_BASE_URL. Falling back to current origin for API requests.");
}

// Axios interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      config.headers["X-Timezone"] = timezone;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const token = getAuthToken();
    if (status === 401 && token) {
      clearAuthToken();
      if (window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }
    return Promise.reject(error);
  }
);

const DEV_BYPASS =
  process.env.REACT_APP_DEV_BYPASS === "true" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_BYPASS);
  const [isAdmin, setIsAdmin] = useState(DEV_BYPASS);
  // null while we don't know yet (e.g. right after signing in), so admin pages wait instead of
  // sending you back to the Dashboard.
  const [adminChecked, setAdminChecked] = useState(DEV_BYPASS);
  const [loading, setLoading] = useState(!DEV_BYPASS);

  useEffect(() => {
    if (DEV_BYPASS) return;
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const me = await axios.get(`${API}/auth/me`);
          setIsAdmin(Boolean(me?.data?.is_admin));
          setAdminChecked(true);
          setIsAuthenticated(true);
        } catch (error) {
          clearAuthToken();
          setIsAuthenticated(false);
          setIsAdmin(false);
          setAdminChecked(true);
        }
      } else {
        setIsAdmin(false);
        setAdminChecked(true);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Signing in (or out) without a page reload: look up whether the new account is an admin.
  useEffect(() => {
    if (DEV_BYPASS || loading) return undefined;
    if (!isAuthenticated) {
      setIsAdmin(false);
      setAdminChecked(true);
      return undefined;
    }
    let alive = true;
    setAdminChecked(false);
    axios.get(`${API}/auth/me`).then(
      (me) => {
        if (!alive) return;
        setIsAdmin(Boolean(me?.data?.is_admin));
        setAdminChecked(true);
      },
      () => {
        if (!alive) return;
        setIsAdmin(false);
        setAdminChecked(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [isAuthenticated, loading]);

  const adminRoute = (page) => {
    if (!isAuthenticated) return <Navigate to="/" replace />;
    if (!adminChecked) {
      return (
        <div className="app-boot" role="status" aria-label="Loading">
          <span className="app-boot-mark">SENDMYBEAT</span>
          <span className="app-boot-bar"><i /></span>
        </div>
      );
    }
    return isAdmin ? page : <Navigate to="/dashboard" replace />;
  };

  if (loading) {
    return (
      <div className="app-boot" role="status" aria-label="Loading">
        <span className="app-boot-mark">SENDMYBEAT</span>
        <span className="app-boot-bar"><i /></span>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="App flex flex-col min-h-screen">
        <Toaster position="top-right" richColors />
        <BrowserRouter>
        <div className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LandingPage setIsAuthenticated={setIsAuthenticated} />
                )
              }
            />
            <Route
              path="/spotlight"
              element={<ProducerSpotlight />}
            />
            <Route
              path="/admin/costs"
              element={adminRoute(<AdminCosts />)}
            />
            <Route
              path="/admin/users"
              element={adminRoute(<AdminUsers />)}
            />
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  <Dashboard setIsAuthenticated={setIsAuthenticated} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/youtube-callback"
              element={
                isAuthenticated ? (
                  <YouTubeCallback />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="/pros/:id" element={isAuthenticated ? <ProPage /> : <Navigate to="/" replace />} />
            <Route path="/pros/:id/plan" element={isAuthenticated ? <ProPlanPage /> : <Navigate to="/" replace />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
          <Footer />
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
