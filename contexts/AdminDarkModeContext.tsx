/**
 * AdminDarkModeContext
 * 
 * A context that provides dark mode toggle functionality for the Admin Panel.
 * Persists preference in localStorage for consistent experience across sessions.
 * Uses CSS variables and Tailwind 'dark' class for styling.
 * 
 * Features:
 * - Toggle between light and dark mode
 * - Persist preference in localStorage
 * - System preference detection on first visit
 * - Instant theme switching without page reload
 * 
 * @example
 * // Wrap your admin app with the provider
 * <AdminDarkModeProvider>
 *   <YourApp />
 * </AdminDarkModeProvider>
 * 
 * // Use the toggle in your component
 * const { isDarkMode, toggleDarkMode } = useAdminDarkMode();
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Storage key for localStorage
const STORAGE_KEY = 'admin-dark-mode';

interface AdminDarkModeContextType {
  /** Whether dark mode is currently active */
  isDarkMode: boolean;
  /** Toggle between light and dark mode */
  toggleDarkMode: () => void;
  /** Explicitly set dark mode on/off */
  setDarkMode: (enabled: boolean) => void;
  /** Whether the theme has been initialized (for SSR hydration) */
  isInitialized: boolean;
}

// Create context with default values
const AdminDarkModeContext = createContext<AdminDarkModeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
  isInitialized: false,
});

interface AdminDarkModeProviderProps {
  children: React.ReactNode;
  /** Default theme if no preference stored. Default: 'light' */
  defaultTheme?: 'light' | 'dark' | 'system';
}

/**
 * Provider component that wraps the admin app and provides dark mode functionality
 */
export function AdminDarkModeProvider({
  children,
  defaultTheme = 'system',
}: AdminDarkModeProviderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored !== null) {
      // Use stored preference
      setIsDarkMode(stored === 'dark');
    } else if (defaultTheme === 'system') {
      // Use system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(systemPrefersDark);
    } else {
      // Use default theme
      setIsDarkMode(defaultTheme === 'dark');
    }
    
    setIsInitialized(true);
  }, [defaultTheme]);

  // Apply dark mode class to document when state changes
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Store preference in localStorage
    localStorage.setItem(STORAGE_KEY, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, isInitialized]);

  // Listen for system preference changes (if no stored preference)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no stored preference
      if (localStorage.getItem(STORAGE_KEY) === null) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Explicitly set dark mode
  const setDarkMode = useCallback((enabled: boolean) => {
    setIsDarkMode(enabled);
  }, []);

  const value: AdminDarkModeContextType = {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    isInitialized,
  };

  return (
    <AdminDarkModeContext.Provider value={value}>
      {children}
    </AdminDarkModeContext.Provider>
  );
}

/**
 * Hook to access admin dark mode context
 * 
 * @example
 * function MyComponent() {
 *   const { isDarkMode, toggleDarkMode } = useAdminDarkMode();
 *   
 *   return (
 *     <button onClick={toggleDarkMode}>
 *       {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
 *     </button>
 *   );
 * }
 */
export function useAdminDarkMode(): AdminDarkModeContextType {
  const context = useContext(AdminDarkModeContext);
  if (context === undefined) {
    throw new Error('useAdminDarkMode must be used within an AdminDarkModeProvider');
  }
  return context;
}

/**
 * Dark Mode Toggle Button Component
 * Ready-to-use toggle button for the admin navbar
 */
interface DarkModeToggleProps {
  /** Size of the toggle button. Default: 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function DarkModeToggle({ size = 'md', className = '' }: DarkModeToggleProps) {
  const { isDarkMode, toggleDarkMode, isInitialized } = useAdminDarkMode();

  // Size configurations
  const sizes = {
    sm: { button: 'p-1.5', icon: 'w-4 h-4' },
    md: { button: 'p-2', icon: 'w-5 h-5' },
    lg: { button: 'p-2.5', icon: 'w-6 h-6' },
  };

  const { button, icon } = sizes[size];

  // Prevent hydration mismatch by not rendering until initialized
  if (!isInitialized) {
    return (
      <div className={`${button} ${className}`}>
        <div className={`${icon} bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse`} />
      </div>
    );
  }

  return (
    <button
      onClick={toggleDarkMode}
      className={`${button} rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 ${className}`}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        // Sun icon for dark mode (click to switch to light)
        <svg
          className={`${icon} text-yellow-500`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Moon icon for light mode (click to switch to dark)
        <svg
          className={`${icon} text-gray-600 dark:text-gray-400`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}

export default AdminDarkModeProvider;
