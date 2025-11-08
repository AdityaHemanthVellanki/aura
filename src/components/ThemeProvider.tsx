import React, { createContext, useContext, ReactNode } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { theme } from '../theme/theme';

const ThemeCtx = createContext(theme);
export const useTheme = () => useContext(ThemeCtx);

export const AuraThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeCtx.Provider value={theme}>
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  </ThemeCtx.Provider>
);