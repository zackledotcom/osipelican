import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Get initial theme from localStorage or system preference
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) return savedTheme;
    
    // Fall back to system preference
    return 'system';
  });

  // Track whether dark mode is active (regardless of source)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Initialize theme based on system preference
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Initial setup
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Apply theme to document
        document.documentElement.classList.toggle('dark', isDarkMode);
        
        // Sync with Electron's native theme
        if (window.electronAPI) {
          await window.electronAPI.setTheme(theme);
        }
      } catch (error) {
        console.error('Failed to initialize theme:', error);
      }
    };

    initializeTheme();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setIsDarkMode(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
        
        // Sync with Electron if available
        if (window.electronAPI) {
          window.electronAPI.setTheme('system');
        }
      }
    };
    
    // Modern API (addEventListener)
    darkModeQuery.addEventListener('change', handleSystemThemeChange);
    
    // Cleanup
    return () => darkModeQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  // Listen for theme updates from Electron
  useEffect(() => {
    if (!window.electronAPI?.onThemeUpdated) return;
    
    const unsubscribe = window.electronAPI.onThemeUpdated((themeData) => {
      if (theme === 'system') {
        setIsDarkMode(themeData.shouldUseDarkColors);
        document.documentElement.classList.toggle('dark', themeData.shouldUseDarkColors);
      }
    });
    
    return unsubscribe;
  }, [theme]);

  // Update theme effects
  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Update dark mode state based on theme selection
    if (theme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      // For 'system', use the system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(systemPrefersDark);
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    }
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? '#1f2937' : '#ffffff');
    }
    
    // Sync with Electron if available
    if (window.electronAPI) {
      window.electronAPI.setTheme(theme);
    }
  }, [theme, isDarkMode]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prevTheme => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 