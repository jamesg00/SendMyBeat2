import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import axios from "axios";

import { API as API_URL, me as fetchMe } from "@/app/api";
import { resetDraft } from "@/app/draft";
import Shell from "@/app/Shell";
import Analytics from "@/app/pages/Analytics";
import Landing from "@/app/pages/Landing";
import Pro from "@/app/pages/Pro";
import ProPlan from "@/app/pages/ProPlan";
import Producer from "@/app/pages/Producer";
import Profile from "@/app/pages/Profile";
import Spotlight from "@/app/pages/Spotlight";
import Workflow from "@/app/pages/Workflow";
import { resetStores, setUser } from "@/app/store";
import { AppIcon } from "@/app/ui";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { clearAuthToken, getAuthToken } from "@/lib/auth";
import About from "@/pages/About";
import AdminCosts from "@/pages/AdminCosts";
import AdminUsers from "@/pages/AdminUsers";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import YouTubeCallback from "@/pages/YouTubeCallback";

// Older pages import the API address from here.
export const API = API_URL;

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
  const [loading, setLoading] = useState(!DEV_BYPASS);

  useEffect(() => {
    if (DEV_BYPASS) return;
    const checkAuth = async () => {
      if (getAuthToken()) {
        try {
          const user = await fetchMe();
          setUser(user);
          setIsAdmin(Boolean(user?.is_admin));
          setIsAuthenticated(true);
        } catch (error) {
          clearAuthToken();
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const signedIn = (user) => {
    setUser(user ?? null);
    setIsAdmin(Boolean(user?.is_admin));
    setIsAuthenticated(true);
  };
  const signOut = () => {
    clearAuthToken();
    resetStores();
    resetDraft();
    setIsAdmin(false);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="s-app" style={{ alignItems: "center", justifyContent: "center", gap: 16 }}>
        <AppIcon size={56} />
        <span className="s-spinner" role="status" aria-label="Loading" />
      </div>
    );
  }

  const home = <Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />;
  const member = (page) => (isAuthenticated ? page : home);
  const admin = (page) => (isAuthenticated && isAdmin ? page : home);

  return (
    <BrowserRouter>
      <Toaster position="top-right" theme="dark" />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing onSignedIn={signedIn} />} />

        {/* The app: four tabs inside one frame. Guests can open Spotlight and profiles. */}
        <Route element={<Shell signedIn={isAuthenticated} />}>
          <Route path="/dashboard" element={member(<Workflow />)} />
          <Route path="/spotlight" element={<Spotlight signedIn={isAuthenticated} />} />
          <Route path="/producer/:id" element={<Producer signedIn={isAuthenticated} />} />
          <Route path="/pros/:id" element={member(<Pro />)} />
          <Route path="/pros/:id/plan" element={member(<ProPlan />)} />
          <Route path="/analytics" element={member(<Analytics />)} />
          <Route path="/profile" element={member(<Profile onSignOut={signOut} />)} />
          <Route path="/admin/costs" element={admin(<AdminCosts />)} />
          <Route path="/admin/users" element={admin(<AdminUsers />)} />
        </Route>

        <Route path="/youtube-callback" element={member(<YouTubeCallback />)} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={home} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
