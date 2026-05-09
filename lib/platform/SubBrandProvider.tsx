/**
 * Orbital Platform — SubBrandProvider
 *
 * React context that exposes the currently-active sub-brand, its trust
 * posture, and helpers to switch brands. The choice is persisted to
 * AsyncStorage under `orbital.subBrand` so it survives cold launches.
 *
 * Default brand is 'personal' (most-trusting posture, no audit, memory off).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SubBrand, SubBrandConfig, TrustPosture } from './types';
import {
  DEFAULT_SUB_BRAND,
  SUB_BRAND_CONFIGS,
  getSubBrandConfig,
} from './subBrandConfig';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'orbital.subBrand';

// =============================================================================
// CONTEXT SHAPE
// =============================================================================

export interface SubBrandContextValue {
  /** Active sub-brand id. */
  brand: SubBrand;
  /** Full config for the active brand. */
  config: SubBrandConfig;
  /** Theme accent for the active brand (drawn from capacity spectrum). */
  themeAccent: string;
  /** Trust posture for the active brand. */
  posture: TrustPosture;
  /** Whether the persisted choice has been hydrated from AsyncStorage. */
  isHydrated: boolean;
  /** Switch brand (also persists to AsyncStorage). */
  setBrand: (next: SubBrand) => Promise<void>;
}

const SubBrandContext = createContext<SubBrandContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export interface SubBrandProviderProps {
  children: React.ReactNode;
  /** Override the initial brand — primarily for tests/storybook. */
  initialBrand?: SubBrand;
}

export function SubBrandProvider({
  children,
  initialBrand,
}: SubBrandProviderProps): React.ReactElement {
  const [brand, setBrandState] = useState<SubBrand>(
    initialBrand ?? DEFAULT_SUB_BRAND,
  );
  const [isHydrated, setIsHydrated] = useState<boolean>(initialBrand != null);

  // Hydrate persisted choice on mount.
  useEffect(() => {
    if (initialBrand != null) {
      // Caller forced an initial brand — skip hydration.
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored && stored in SUB_BRAND_CONFIGS) {
          setBrandState(stored as SubBrand);
        }
      } catch (err) {
        console.warn('[SubBrandProvider] hydrate failed', err);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialBrand]);

  const setBrand = useCallback(async (next: SubBrand): Promise<void> => {
    setBrandState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      console.warn('[SubBrandProvider] persist failed', err);
    }
  }, []);

  const value = useMemo<SubBrandContextValue>(() => {
    const config = getSubBrandConfig(brand);
    return {
      brand,
      config,
      themeAccent: config.themeAccent,
      posture: config.posture,
      isHydrated,
      setBrand,
    };
  }, [brand, isHydrated, setBrand]);

  return (
    <SubBrandContext.Provider value={value}>
      {children}
    </SubBrandContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Read the active sub-brand context. Throws if used outside a provider —
 * fail loud so we don't silently fall back to a wrong posture.
 */
export function useSubBrand(): SubBrandContextValue {
  const ctx = useContext(SubBrandContext);
  if (!ctx) {
    throw new Error(
      'useSubBrand must be used within a <SubBrandProvider>. ' +
        'Wrap the (platform) route group, or provide an initialBrand for tests.',
    );
  }
  return ctx;
}

/**
 * Optional variant that returns null instead of throwing.
 * Useful for shared components rendered both inside and outside the
 * (platform) route group.
 */
export function useOptionalSubBrand(): SubBrandContextValue | null {
  return useContext(SubBrandContext);
}
