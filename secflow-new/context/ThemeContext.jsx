import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const lightColors = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  primary: '#1A429A',
  border: '#E5E7EB',
};

const darkColors = {
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  primary: '#3B82F6',
  border: '#374151',
};

const ThemeContext = createContext({
  colors: lightColors,
  isDarkMode: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const scheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(scheme === 'dark');

  const toggleTheme = () => setIsDarkMode((v) => !v);

  return (
    <ThemeContext.Provider
      value={{ colors: isDarkMode ? darkColors : lightColors, isDarkMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
