import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Default to 'matrix' to preserve existing look
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "matrix";
  });

  useEffect(() => {
    const root = window.document.documentElement;
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
