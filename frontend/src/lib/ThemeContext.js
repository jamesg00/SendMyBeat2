import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
const AI_THEME_STORAGE_KEY = "app-theme-ai";

const clearAiVariables = () => {
  const root = window.document.documentElement;
  const body = window.document.body;
  const targets = [root, body];
  targets.forEach((target) => {
    target.removeAttribute("data-ai-theme");
    target.style.removeProperty("--bg-primary");
    target.style.removeProperty("--bg-secondary");
    target.style.removeProperty("--bg-tertiary");
    target.style.removeProperty("--text-primary");
    target.style.removeProperty("--text-secondary");
    target.style.removeProperty("--accent-primary");
    target.style.removeProperty("--accent-secondary");
    target.style.removeProperty("--border-color");
    target.style.removeProperty("--card-bg");
    target.style.removeProperty("--shadow");
    target.style.removeProperty("--glow");
  });
};

export const ThemeProvider = ({ children }) => {
  // Default to 'matrix' to preserve existing look
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("app-theme") || "matrix";
    return stored === "minimal" ? "matrix" : stored;
  });
  const [aiTheme, setAiTheme] = useState(() => {
    try {
      const raw = localStorage.getItem(AI_THEME_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const body = window.document.body;

    // Remove old theme classes/attributes
    body.removeAttribute("data-theme");

    // Apply new theme
    body.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);

    // Handle special matrix effects
    if (theme === 'matrix') {
        body.classList.add('matrix-mode');
    } else {
        body.classList.remove('matrix-mode');
    }

  }, [theme]);

  useEffect(() => {
    if (aiTheme) {
      localStorage.setItem(AI_THEME_STORAGE_KEY, JSON.stringify(aiTheme));
    } else {
      localStorage.removeItem(AI_THEME_STORAGE_KEY);
    }
  }, [aiTheme]);

  useEffect(() => {
    if (theme !== "ai" || !aiTheme?.variables) {
      clearAiVariables();
      return;
    }

    const root = window.document.documentElement;
    const body = window.document.body;
    const variables = aiTheme.variables || {};
    [root, body].forEach((target) => {
      target.setAttribute("data-ai-theme", "true");
      Object.entries(variables).forEach(([key, value]) => {
        if (typeof key === "string" && typeof value === "string") {
          target.style.setProperty(key, value);
        }
      });
    });
  }, [theme, aiTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, aiTheme, setAiTheme }}>
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
