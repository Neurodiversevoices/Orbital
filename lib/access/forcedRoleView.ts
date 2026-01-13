/**
 * Forced Role View — Hard Override for Testing Real User Experience
 *
 * GOVERNANCE:
 * This is NOT a cosmetic toggle. When enabled, the app MUST behave
 * IDENTICALLY to a brand-new user with zero elevated access.
 *
 * CRITICAL DIFFERENCES FROM QA FREE MODE:
 * - QA Free Mode allows institutional demos (org bypass)
 * - Forced Role View BLOCKS EVERYTHING — including org bypass
 * - Forced Role View hides routes entirely, not just disables buttons
 *
 * WHAT "FREE" ROLE MEANS (NON-NEGOTIABLE):
 * - NO Pro access
 * - NO Circles access
 * - NO Family access
 * - NO Institutional modes unlocked
 * - NO Sentinel Organization views
 * - NO CCI issuance ability
 * - NO upgrade discounts
 * - NO admin privileges
 * - Organization tab HIDDEN (not disabled)
 * - Briefings tab shows ONLY Personal mode
 * - Upgrade CTAs shown everywhere
 *
 * PERSISTENCE:
 * - Survives app reload
 * - Survives session restart
 * - Must be explicitly exited via Developer Tools
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Available forced roles
 * - 'actual': Use real entitlements (normal behavior)
 * - 'free': Force true free user experience
 */
export type ForcedRole = 'actual' | 'free';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORCED_ROLE_KEY = '@orbital:forced_role_view';

/**
 * Restrictions applied when in Free role view
 */
export const FREE_ROLE_RESTRICTIONS = {
  // Access flags
  hasPro: false,
  hasCircles: false,
  hasFamily: false,
  hasAdmin: false,
  hasInstitutional: false,
  hasSentinelOrg: false,
  hasCCIIssuance: false,
  hasUpgradeDiscount: false,

  // Route visibility
  showOrganizationTab: false,
  showSentinelDemo: false,
  showBriefingsOrgGlobal: false,
  showCCIIssuance: false,
  showDevTools: true, // Keep dev tools visible to exit

  // Feature limits
  maxSignalsPerMonth: 30,
  maxPatternHistoryDays: 7,
} as const;

// =============================================================================
// STATE
// =============================================================================

let forcedRole: ForcedRole = 'actual';
let initialized: boolean = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize forced role view state from storage
 * MUST be called at app startup
 */
export async function initializeForcedRoleView(): Promise<ForcedRole> {
  try {
    const stored = await AsyncStorage.getItem(FORCED_ROLE_KEY);
    if (stored === 'free') {
      forcedRole = 'free';
    } else {
      forcedRole = 'actual';
    }
    initialized = true;

    if (__DEV__ && forcedRole === 'free') {
      console.log('[FORCED ROLE VIEW] Active: FREE USER — All elevated access suppressed');
    }

    return forcedRole;
  } catch {
    forcedRole = 'actual';
    initialized = true;
    return 'actual';
  }
}

// =============================================================================
// GETTERS
// =============================================================================

/**
 * Get the current forced role
 */
export function getForcedRole(): ForcedRole {
  return forcedRole;
}

/**
 * Check if forced role view is initialized
 */
export function isForcedRoleInitialized(): boolean {
  return initialized;
}

/**
 * Check if Free User View is active
 * This is the PRIMARY check that all access controls should use
 */
export function isFreeUserViewActive(): boolean {
  return forcedRole === 'free';
}

// =============================================================================
// SETTERS
// =============================================================================

/**
 * Enable Free User View
 * This forces the app to behave as a brand-new free user
 */
export async function enableFreeUserView(): Promise<void> {
  forcedRole = 'free';
  await AsyncStorage.setItem(FORCED_ROLE_KEY, 'free');

  if (__DEV__) {
    console.log('[FORCED ROLE VIEW] ENABLED — FREE USER VIEW');
    console.log('  → All Pro access: BLOCKED');
    console.log('  → All Circles access: BLOCKED');
    console.log('  → All Family access: BLOCKED');
    console.log('  → All Institutional modes: BLOCKED');
    console.log('  → All Sentinel Org views: BLOCKED');
    console.log('  → All CCI issuance: BLOCKED');
    console.log('  → All admin privileges: BLOCKED');
    console.log('  → Organization tab: HIDDEN');
    console.log('  → Briefings (Org/Global): HIDDEN');
  }
}

/**
 * Disable Free User View (restore normal access)
 */
export async function disableFreeUserView(): Promise<void> {
  forcedRole = 'actual';
  await AsyncStorage.setItem(FORCED_ROLE_KEY, 'actual');

  if (__DEV__) {
    console.log('[FORCED ROLE VIEW] DISABLED — Normal entitlements restored');
  }
}

/**
 * Set forced role (generic setter)
 */
export async function setForcedRole(role: ForcedRole): Promise<void> {
  if (role === 'free') {
    await enableFreeUserView();
  } else {
    await disableFreeUserView();
  }
}

// =============================================================================
// ACCESS OVERRIDES
// =============================================================================

/**
 * Override for org bypass check
 * When Free User View is active, org bypass is ALWAYS false
 */
export function shouldBlockOrgBypass(): boolean {
  return forcedRole === 'free';
}

/**
 * Override for tier check
 * When Free User View is active, always return 'starter'
 */
export function getOverriddenBaseTier(): 'starter' | null {
  if (forcedRole === 'free') {
    return 'starter';
  }
  return null; // Use actual tier
}

/**
 * Override for feature flags
 * When Free User View is active, all features are disabled
 */
export function getOverriddenFeatures(): {
  unlimitedSignals: boolean;
  fullPatternHistory: boolean;
  qsbAccess: boolean;
  familyCircles: boolean;
  familyAnalytics: boolean;
  bundleAdmin: boolean;
  executiveReports: boolean;
} | null {
  if (forcedRole === 'free') {
    return {
      unlimitedSignals: false,
      fullPatternHistory: false,
      qsbAccess: false,
      familyCircles: false,
      familyAnalytics: false,
      bundleAdmin: false,
      executiveReports: false,
    };
  }
  return null; // Use actual features
}

/**
 * Check if a specific route should be hidden
 */
export function shouldHideRoute(route: string): boolean {
  if (forcedRole !== 'free') {
    return false;
  }

  // Routes that are HIDDEN for free users
  const hiddenRoutes = [
    '/sentinel',
    '/organization',
    '/admin',
    '/circles',
    '/family',
    '/cci-issuance',
    '/enterprise',
    '/executive',
  ];

  return hiddenRoutes.some((r) => route.startsWith(r) || route === r);
}

/**
 * Check if Organization tab should be shown in bottom nav
 */
export function shouldShowOrganizationTab(): boolean {
  return forcedRole !== 'free';
}

/**
 * Check if Briefings Organization/Global scopes should be shown
 */
export function shouldShowBriefingsOrgGlobal(): boolean {
  return forcedRole !== 'free';
}

/**
 * Check if Sentinel demo should be accessible
 */
export function shouldShowSentinelDemo(): boolean {
  return forcedRole !== 'free';
}

/**
 * Check if CCI issuance is available
 */
export function shouldShowCCIIssuance(): boolean {
  return forcedRole !== 'free';
}

// =============================================================================
// STATUS
// =============================================================================

/**
 * Get full status for debugging
 */
export function getForcedRoleViewStatus(): {
  role: ForcedRole;
  isActive: boolean;
  initialized: boolean;
  restrictions: typeof FREE_ROLE_RESTRICTIONS;
} {
  return {
    role: forcedRole,
    isActive: forcedRole === 'free',
    initialized,
    restrictions: FREE_ROLE_RESTRICTIONS,
  };
}

/**
 * Get banner message for Free User View
 */
export function getFreeUserViewBanner(): string | null {
  if (forcedRole === 'free') {
    return 'FREE USER VIEW — All elevated access suppressed';
  }
  return null;
}
