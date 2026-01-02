/**
 * Orbital Localization System
 *
 * Supports: English (en), Spanish (es), French (fr), German (de),
 *           Portuguese-Brazil (pt-BR), Italian (it), Japanese (ja)
 * Default: English
 *
 * Coverage: EU institutions, pharma, global employers, medical buyers
 *
 * Usage:
 *   const { t, locale, setLocale } = useLocale();
 *   t.core.capacity // "Capacity", "Capacidad", "Capacité", etc.
 */

import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { ptBR } from './pt-BR';
import { it } from './it';
import { ja } from './ja';

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'pt-BR' | 'it' | 'ja';

// Flexible type that allows string values to differ across locales
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Record<string, unknown>
    ? DeepStringify<T[K]>
    : T[K];
};

export type TranslationKeys = DeepStringify<typeof en>;

export const translations: Record<Locale, TranslationKeys> = {
  en,
  es,
  fr,
  de,
  'pt-BR': ptBR,
  it,
  ja,
};

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  'pt-BR': 'Português (Brasil)',
  it: 'Italiano',
  ja: '日本語',
};

// Regional groupings for UI organization
export const localeRegions: Record<string, Locale[]> = {
  americas: ['en', 'es', 'pt-BR'],
  europe: ['en', 'fr', 'de', 'it'],
  asia: ['en', 'ja'],
};

export { en, es, fr, de, ptBR, it, ja };
