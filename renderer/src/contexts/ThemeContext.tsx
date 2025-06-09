import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Get initial theme from electron
    window.electronAPI?.app.getTheme().then((savedTheme: string) => {
      setTheme(savedTheme as 'light' | 'dark');
    });

    // Listen for theme updates
    const unsubscribe = window.electronAPI?.app.onThemeUpdated((data: { theme: string }) => {
      setTheme(data.theme as 'light' | 'dark');
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    window.electronAPI?.app.setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
