/**
 * QA Free Mode — Founder Testing Override
 *
 * GOVERNANCE:
 * - Forces current session into true Free (Starter) tier
 * - Overrides ALL Pro/Circle/Family/Bundle/Admin entitlements
 * - Does NOT affect other users (client-side only)
 * - Does NOT affect institutional DEMO modes
 *
 * PURPOSE:
 * - Validate Free tier UX and funnel
 * - Test upgrade prompts and restriction visibility
 * - Ensure CCI pricing shows Free user price ($199)
 *
 * WHAT IS ENFORCED IN QA FREE MODE:
 * - Year of Birth gate (required)
 * - Personal mode only by default
 * - Capacity logging allowed
 * - Signal count and history retention are UNLIMITED for QA (no artificial caps)
 *   Rationale: QA testing must not be blocked by signal/retention limits.
 *   Real Free tier limits are applied at the server/product layer, not in QA mode.
 * - No CCI discount ($199 not $149)
 *
 * WHAT IS BLOCKED IN QA FREE MODE:
 * - Pro-only full pattern history
 * - Circles creation or joining
 * - Family creation
 * - Admin dashboard access
 * - Institutional activation
 * - All hidden bypasses
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// CONSTANTS
// =============================================================================

const QA_FREE_MODE_KEY = '@orbital:qa_free_mode';

// =============================================================================
// QA FREE MODE STATE
// =============================================================================

let qaFreeModeEnabled: boolean = false;
let qaFreeModeInitialized: boolean = false;

/**
 * Initialize QA Free Mode state from storage
 */
export async function initializeQAFreeMode(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(QA_FREE_MODE_KEY);
    qaFreeModeEnabled = stored === 'true';
    qaFreeModeInitialized = true;
    return qaFreeModeEnabled;
  } catch {
    qaFreeModeEnabled = false;
    qaFreeModeInitialized = true;
    return false;
  }
}

/**
 * Check if QA Free Mode is enabled
 * NOTE: This is synchronous for performance — call initializeQAFreeMode() first
 */
export function isQAFreeModeEnabled(): boolean {
  return qaFreeModeEnabled;
}

/**
 * Check if QA Free Mode has been initialized
 */
export function isQAFreeModeInitialized(): boolean {
  return qaFreeModeInitialized;
}

/**
 * Enable QA Free Mode
 */
export async function enableQAFreeMode(): Promise<void> {
  qaFreeModeEnabled = true;
  await AsyncStorage.setItem(QA_FREE_MODE_KEY, 'true');

  // Log for audit
  if (__DEV__) {
    console.log('[QA Free Mode] ENABLED — Session now in true Free tier');
  }
}

/**
 * Disable QA Free Mode
 */
export async function disableQAFreeMode(): Promise<void> {
  qaFreeModeEnabled = false;
  await AsyncStorage.setItem(QA_FREE_MODE_KEY, 'false');

  // Log for audit
  if (__DEV__) {
    console.log('[QA Free Mode] DISABLED — Normal entitlements restored');
  }
}

/**
 * Toggle QA Free Mode
 */
export async function toggleQAFreeMode(): Promise<boolean> {
  if (qaFreeModeEnabled) {
    await disableQAFreeMode();
  } else {
    await enableQAFreeMode();
  }
  return qaFreeModeEnabled;
}

// =============================================================================
// ENTITLEMENT OVERRIDE
// =============================================================================

/**
 * Override entitlement check when QA Free Mode is enabled
 * Returns true if the check should be overridden to FALSE
 */
export function shouldOverrideEntitlement(_entitlementId: string): boolean {
  // If QA Free Mode is enabled, ALL entitlements are blocked
  return qaFreeModeEnabled;
}

/**
 * Override granted entitlements list when QA Free Mode is enabled
 * Returns an empty array if QA Free Mode is on
 */
export function overrideGrantedEntitlements(actualEntitlements: string[]): string[] {
  if (qaFreeModeEnabled) {
    return []; // No entitlements in QA Free Mode
  }
  return actualEntitlements;
}

// =============================================================================
// QA FREE MODE RESTRICTIONS
// =============================================================================

/**
 * QA Free Mode restriction labels
 * These are shown in UI when features are blocked
 */
export const QA_FREE_MODE_RESTRICTIONS = {
  proFeatures: 'Pro subscription required',
  circles: 'Pro subscription required for Circles',
  family: 'Pro subscription required for Family',
  bundles: 'Pro subscription required for Bundles',
  admin: 'Admin add-on requires Circle or Bundle',
  fullHistory: 'Full pattern history requires Pro',
  unlimitedSignals: 'Unlimited signals requires Pro',
} as const;

/**
 * QA Free Mode limits (matches Starter tier)
 */
export const QA_FREE_MODE_LIMITS = {
  maxSignalsPerMonth: Infinity,
  maxPatternHistoryDays: Infinity,
} as const;

// =============================================================================
// DEV CONSOLE HELPERS
// =============================================================================

/**
 * Get QA Free Mode status for dev console
 */
export function getQAFreeModeStatus(): {
  enabled: boolean;
  initialized: boolean;
  restrictions: typeof QA_FREE_MODE_RESTRICTIONS;
  limits: typeof QA_FREE_MODE_LIMITS;
} {
  return {
    enabled: qaFreeModeEnabled,
    initialized: qaFreeModeInitialized,
    restrictions: QA_FREE_MODE_RESTRICTIONS,
    limits: QA_FREE_MODE_LIMITS,
  };
}
