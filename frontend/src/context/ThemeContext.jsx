import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME_ID } from '../theme/themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem('csms_theme');
      return saved && THEMES[saved] ? saved : DEFAULT_THEME_ID;
    } catch (e) {
      return DEFAULT_THEME_ID;
    }
  });

  const activeTheme = THEMES[currentThemeId] || THEMES[DEFAULT_THEME_ID];

  // Apply theme variables to :root / document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    const vars = activeTheme.variables;

    root.setAttribute('data-theme', currentThemeId);

    // Apply color transitions cleanly
    root.style.setProperty('--theme-transition', 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease');

    Object.keys(vars).forEach((key) => {
      root.style.setProperty(key, vars[key]);
    });

    try {
      localStorage.setItem('csms_theme', currentThemeId);
    } catch (e) {
      // localStorage fallback ignore
    }

    // Dispatch global event for non-React canvas/chart listeners
    window.dispatchEvent(new CustomEvent('csms_theme_change', { detail: { themeId: currentThemeId, theme: activeTheme } }));
  }, [currentThemeId, activeTheme]);

  const setTheme = (themeId) => {
    if (THEMES[themeId]) {
      setCurrentThemeId(themeId);
    }
  };

  const resetTheme = () => {
    setCurrentThemeId(DEFAULT_THEME_ID);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId: currentThemeId,
        theme: activeTheme,
        setTheme,
        resetTheme,
        themesList: Object.values(THEMES),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if component is outside provider
    return {
      themeId: DEFAULT_THEME_ID,
      theme: THEMES[DEFAULT_THEME_ID],
      setTheme: () => {},
      resetTheme: () => {},
      themesList: Object.values(THEMES),
    };
  }
  return context;
}
