import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { schemes, type Scheme } from './tokens';

const CHAVE_MODO = 'feith.theme.mode';

export type ModoTema = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ModoTema;
  /** `mode` resolvido contra o aparelho quando `mode === 'system'`. */
  effectiveMode: 'light' | 'dark';
  scheme: Scheme;
  setMode: (mode: ModoTema) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const corDoAparelho = useColorScheme();
  const [mode, setModeState] = useState<ModoTema>('system');

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_MODO)
      .then((salvo) => {
        if (salvo === 'light' || salvo === 'dark' || salvo === 'system') {
          setModeState(salvo);
        }
      })
      .catch(() => undefined);
  }, []);

  const setMode = useCallback((novo: ModoTema) => {
    setModeState(novo);
    void AsyncStorage.setItem(CHAVE_MODO, novo);
  }, []);

  const effectiveMode: 'light' | 'dark' =
    mode === 'system' ? (corDoAparelho === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, effectiveMode, scheme: schemes[effectiveMode], setMode }),
    [mode, effectiveMode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  }
  return ctx;
}
