/**
 * Orbital Localization Hook
 *
 * Provides app-wide language switching with AsyncStorage persistence.
 *
 * Usage:
 *   const { t, locale, setLocale } = useLocale();
 *
 * Access translations:
 *   t.core.capacity        // "Capacity" or "Capacidad"
 *   t.states.depleted      // "Depleted" or "Reducida"
 *   t.patterns.lockedTitle // Full sentence
 *
 * Switch language:
 *   setLocale('es');
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Locale, TranslationKeys } from '../../locales';

const LOCALE_KEY = '@orbital:locale';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: TranslationKeys;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function LocaleProvider({ children, defaultLocale = 'en' }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved locale on mount
  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then((savedLocale) => {
      const validLocales: Locale[] = ['en', 'es', 'fr', 'de', 'pt-BR', 'it', 'ja'];
      if (savedLocale && validLocales.includes(savedLocale as Locale)) {
        setLocaleState(savedLocale as Locale);
      }
      setIsLoaded(true);
    });
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    await AsyncStorage.setItem(LOCALE_KEY, newLocale);
  }, []);

  const t = translations[locale];

  // Don't render until locale is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

/**
 * Helper to interpolate variables into translated strings
 *
 * Usage:
 *   interpolate(t.patterns.lockedProgress, { count: 3 })
 *   // "3 of 7 logged" or "3 de 7 registradas"
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
