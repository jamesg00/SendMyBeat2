import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// Same storage key and shape as the mobile app's web build: { id }.
export const THEME_STORAGE_KEY = "smb_theme";

export const PALETTES = [
  { id: "console", label: "Console", swatch: ["#000000", "#EDEDED", "#2EE59D"], dark: true },
  { id: "auto", label: "Auto", swatch: ["#000000", "#F5F5F7", "#2EE59D"], dark: true },
  { id: "light", label: "Light", swatch: ["#F5F5F7", "#1D1D1F", "#0066D6"], dark: false },
  { id: "graphite", label: "Dark", swatch: ["#1C1C1E", "#F2F2F4", "#0A84FF"], dark: true },
  { id: "noir", label: "Noir", swatch: ["#000000", "#FFFFFF", "#FFFFFF"], dark: true },
  { id: "paper", label: "Paper", swatch: ["#FFFFFF", "#000000", "#000000"], dark: false },
  { id: "mint", label: "Mint", swatch: ["#060D09", "#E7F2EC", "#2EE59D"], dark: true },
  { id: "midnight", label: "Midnight", swatch: ["#0B0C15", "#F1E7D2", "#9EB1FF"], dark: true },
  { id: "ocean", label: "Ocean", swatch: ["#081316", "#ECE5D8", "#62D6BD"], dark: true },
  { id: "sunset", label: "Sunset", swatch: ["#1F1311", "#F6ECE8", "#FF9F6B"], dark: true },
  { id: "rose", label: "Rose", swatch: ["#1F1218", "#F7EAF0", "#FF7EB6"], dark: true },
];

const PALETTE_IDS = new Set(PALETTES.map((p) => p.id));
const LIGHT_IDS = new Set(PALETTES.filter((p) => !p.dark).map((p) => p.id));

const ThemeContext = createContext();

const readStoredTheme = () => {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    const id = raw ? JSON.parse(raw)?.id : null;
    return PALETTE_IDS.has(id) ? id : "console";
  } catch {
    return "console";
  }
};

const prefersLight = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: light)").matches;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const resolvePalette = (id) => {
  if (id === "auto") return prefersLight() ? "light" : "console";
  return PALETTE_IDS.has(id) ? id : "console";
};

const applyPalette = (resolved) => {
  const root = window.document.documentElement;
  const body = window.document.body;
  const isDark = !LIGHT_IDS.has(resolved);
  root.setAttribute("data-palette", resolved);
  root.classList.toggle("dark", isDark);
  body.classList.toggle("dark", isDark);
  body.setAttribute("data-theme", isDark ? "dark" : "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(root).getPropertyValue("--c-bg").trim();
    if (bg) meta.setAttribute("content", bg);
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolvePalette(readStoredTheme()));

  // Cross-fade between palettes where the browser supports view transitions.
  const setTheme = useCallback((nextId) => {
    const id = PALETTE_IDS.has(nextId) ? nextId : "console";
    const commit = () => {
      const resolved = resolvePalette(id);
      applyPalette(resolved);
      setResolvedTheme(resolved);
      setThemeState(id);
    };
    if (typeof document !== "undefined" && document.startViewTransition && !prefersReducedMotion()) {
      document.startViewTransition(commit);
    } else {
      commit();
    }
  }, []);

  useEffect(() => {
    applyPalette(resolvePalette(theme));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ id: theme }));
    } catch {
      // storage can be unavailable in private windows
    }
  }, [theme]);

  // Follow the system setting while "Auto" is picked.
  useEffect(() => {
    if (theme !== "auto" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const resolved = resolvePalette("auto");
      applyPalette(resolved);
      setResolvedTheme(resolved);
    };
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, palettes: PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
