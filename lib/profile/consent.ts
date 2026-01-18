/**
 * Consent Defaults Storage
 *
 * Stores user's default privacy preferences for identity disclosure.
 * These defaults are applied at join-time for Circles and Bundles.
 *
 * RULES:
 * - Defaults only (v1) — per-group overrides deferred to follow-up
 * - Fail closed — if storage fails, assume consent NOT granted
 * - No retroactive updates — changing defaults doesn't affect existing memberships
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * User's default consent preferences for identity disclosure.
 *
 * circleNameSharing: When ON, displayHint is set when joining a Circle
 * bundleCoachVisibility: When ON, coach can see name in live Bundles (future)
 */
export interface ConsentDefaults {
  /** Share display name in Circles I join (default: OFF) */
  circleNameSharing: boolean;
  /** Allow coach/admin to see my name in Bundles (default: OFF) */
  bundleCoachVisibility: boolean;
  /** When these defaults were last updated */
  updatedAt: string | null;
}

export const DEFAULT_CONSENT: ConsentDefaults = {
  circleNameSharing: false,      // Privacy-first: OFF by default
  bundleCoachVisibility: false,  // Privacy-first: OFF by default
  updatedAt: null,
};

// =============================================================================
// STORAGE
// =============================================================================

const CONSENT_STORAGE_KEY = '@orbital:consent_defaults';

/**
 * Load consent defaults from storage.
 * Returns DEFAULT_CONSENT if not found or on error (fail closed).
 */
export async function loadConsentDefaults(): Promise<ConsentDefaults> {
  try {
    const json = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    if (!json) return DEFAULT_CONSENT;
    return { ...DEFAULT_CONSENT, ...JSON.parse(json) };
  } catch {
    // Fail closed: return defaults (no consent)
    return DEFAULT_CONSENT;
  }
}

/**
 * Save consent defaults to storage.
 */
export async function saveConsentDefaults(consent: ConsentDefaults): Promise<void> {
  try {
    const toSave: ConsentDefaults = {
      ...consent,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    if (__DEV__) console.error('[Consent] Failed to save:', error);
    throw error;
  }
}

/**
 * Clear consent defaults (for logout/reset).
 */
export async function clearConsentDefaults(): Promise<void> {
  await AsyncStorage.removeItem(CONSENT_STORAGE_KEY);
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseConsentDefaultsResult {
  consent: ConsentDefaults;
  isLoading: boolean;
  /** Update circle name sharing default */
  setCircleNameSharing: (enabled: boolean) => Promise<void>;
  /** Update bundle coach visibility default */
  setBundleCoachVisibility: (enabled: boolean) => Promise<void>;
  /** Refresh from storage */
  refresh: () => Promise<void>;
}

export function useConsentDefaults(): UseConsentDefaultsResult {
  const [consent, setConsent] = useState<ConsentDefaults>(DEFAULT_CONSENT);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const loaded = await loadConsentDefaults();
    setConsent(loaded);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setCircleNameSharing = useCallback(async (enabled: boolean) => {
    const updated = { ...consent, circleNameSharing: enabled };
    await saveConsentDefaults(updated);
    setConsent(updated);
  }, [consent]);

  const setBundleCoachVisibility = useCallback(async (enabled: boolean) => {
    const updated = { ...consent, bundleCoachVisibility: enabled };
    await saveConsentDefaults(updated);
    setConsent(updated);
  }, [consent]);

  return {
    consent,
    isLoading,
    setCircleNameSharing,
    setBundleCoachVisibility,
    refresh,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if user has consented to share name in Circles.
 * Use this at Circle join-time to decide whether to set displayHint.
 *
 * @returns true if consent granted, false otherwise (fail closed)
 */
export async function shouldShareNameInCircles(): Promise<boolean> {
  const consent = await loadConsentDefaults();
  return consent.circleNameSharing;
}

/**
 * Check if user has consented to coach visibility in Bundles.
 * Use this at Bundle join-time to set visibility flag.
 *
 * @returns true if consent granted, false otherwise (fail closed)
 */
export async function shouldAllowBundleCoachVisibility(): Promise<boolean> {
  const consent = await loadConsentDefaults();
  return consent.bundleCoachVisibility;
}
