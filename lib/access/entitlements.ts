/**
 * Orbital Centralized Access Control
 *
 * Single source of truth for all access checks.
 * Respects: RevenueCat IAP, sponsor codes, bundle grants, and org mode bypass.
 *
 * Usage:
 *   const access = useAccess();
 *   if (access.hasTier('individual_pro')) { ... }
 *   if (access.hasFeature('unlimitedSignals')) { ... }
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AccessGrant,
  AccessState,
  AnyTier,
  BaseTier,
  FamilyAddon,
  BundleType,
  SponsorSeatType,
  AccessFeatures,
  ACCESS_STORAGE_KEYS,
} from './types';
import { validateSponsorCode, generateTestCode } from './sponsorCodes';
import { STARTER_TIER } from '../subscription/pricing';
import {
  initializeQAFreeMode,
  isQAFreeModeEnabled,
  enableQAFreeMode as enableQA,
  disableQAFreeMode as disableQA,
  QA_FREE_MODE_LIMITS,
} from './qaFreeMode';
import {
  initializeForcedRoleView,
  isFreeUserViewActive,
  enableFreeUserView,
  disableFreeUserView,
  shouldBlockOrgBypass,
  getOverriddenBaseTier,
  getOverriddenFeatures,
  shouldShowOrganizationTab,
  shouldShowBriefingsOrgGlobal,
  shouldShowSentinelDemo,
  shouldShowCCIIssuance,
  getFreeUserViewBanner,
  FREE_ROLE_RESTRICTIONS,
} from './forcedRoleView';
import { FOUNDER_DEMO_ENABLED } from '../hooks/useDemoMode';

// =============================================================================
// CONSTANTS
// =============================================================================

// Modes that bypass all subscription checks
const BYPASS_MODES = ['employer', 'school_district', 'university', 'healthcare'] as const;

// Tier hierarchy (higher index = more access)
const TIER_HIERARCHY: BaseTier[] = ['starter', 'individual', 'individual_pro'];

// =============================================================================
// STORAGE
// =============================================================================

async function loadGrants(): Promise<AccessGrant[]> {
  try {
    const json = await AsyncStorage.getItem(ACCESS_STORAGE_KEYS.GRANTS);
    if (!json) return [];
    const grants: AccessGrant[] = JSON.parse(json);
    // Filter out expired grants
    const now = Date.now();
    return grants.filter((g) => !g.expiresAt || g.expiresAt > now);
  } catch {
    return [];
  }
}

async function saveGrants(grants: AccessGrant[]): Promise<void> {
  await AsyncStorage.setItem(ACCESS_STORAGE_KEYS.GRANTS, JSON.stringify(grants));
}

async function addGrant(grant: AccessGrant): Promise<void> {
  const grants = await loadGrants();
  // Remove any existing grant of the same tier
  const filtered = grants.filter((g) => g.tier !== grant.tier);
  filtered.push(grant);
  await saveGrants(filtered);
}

async function removeGrant(grantId: string): Promise<void> {
  const grants = await loadGrants();
  const filtered = grants.filter((g) => g.id !== grantId);
  await saveGrants(filtered);
}

// =============================================================================
// ACCESS RESOLUTION
// =============================================================================

/**
 * Determine effective base tier from grants.
 */
function resolveBaseTier(grants: AccessGrant[], orgBypass: boolean): BaseTier {
  if (orgBypass) {
    return 'individual_pro'; // Org modes get full access
  }

  let highestTier: BaseTier = 'starter';

  for (const grant of grants) {
    // Sponsor seats map to base tiers
    if (grant.tier === 'sponsor_seat_core') {
      if (TIER_HIERARCHY.indexOf('individual') > TIER_HIERARCHY.indexOf(highestTier)) {
        highestTier = 'individual';
      }
    } else if (grant.tier === 'sponsor_seat_pro') {
      if (TIER_HIERARCHY.indexOf('individual_pro') > TIER_HIERARCHY.indexOf(highestTier)) {
        highestTier = 'individual_pro';
      }
    } else if (['individual', 'individual_pro'].includes(grant.tier)) {
      const grantTier = grant.tier as BaseTier;
      if (TIER_HIERARCHY.indexOf(grantTier) > TIER_HIERARCHY.indexOf(highestTier)) {
        highestTier = grantTier;
      }
    }
  }

  return highestTier;
}

/**
 * Check if user has a specific family addon.
 */
function hasFamilyAddon(grants: AccessGrant[], addon: FamilyAddon): boolean {
  return grants.some((g) => g.tier === addon);
}

/**
 * Check if user has access through a bundle.
 */
function hasBundle(grants: AccessGrant[], bundle: BundleType): boolean {
  return grants.some((g) => g.tier === bundle);
}

/**
 * Compute feature flags from access state.
 */
function computeFeatures(baseTier: BaseTier, grants: AccessGrant[], orgBypass: boolean): AccessFeatures {
  const isProLevel = baseTier === 'individual_pro' || orgBypass;
  const isIndividualOrHigher = baseTier !== 'starter' || orgBypass;
  const hasFamilyAccess = hasFamilyAddon(grants, 'family') || hasFamilyAddon(grants, 'family_pro');
  const hasFamilyProAccess = hasFamilyAddon(grants, 'family_pro');
  const hasBundleAccess = hasBundle(grants, 'circle_pack') || hasBundle(grants, 'sponsor_pack') || hasBundle(grants, 'cohort_pack');

  return {
    unlimitedSignals: isIndividualOrHigher,
    fullPatternHistory: isProLevel,
    qsbAccess: isIndividualOrHigher,
    familyCircles: hasFamilyAccess || hasBundleAccess,
    familyAnalytics: hasFamilyProAccess,
    bundleAdmin: hasBundleAccess,
    executiveReports: isProLevel || hasBundleAccess,
  };
}

// =============================================================================
// HOOK: useAccess
// =============================================================================

export interface AccessContext {
  // State
  isLoading: boolean;
  baseTier: BaseTier;
  grants: AccessGrant[];
  features: AccessFeatures;

  // Tier checks
  hasTier: (tier: BaseTier) => boolean;
  hasAddon: (addon: FamilyAddon) => boolean;
  hasBundle: (bundle: BundleType) => boolean;
  hasSponsorSeat: (type: SponsorSeatType) => boolean;
  hasFeature: (feature: keyof AccessFeatures) => boolean;

  // Tier limits (for Starter)
  limits: {
    maxSignalsPerMonth: number;
    maxPatternHistoryDays: number;
  };

  // Actions
  redeemSponsorCode: (code: string) => Promise<{ success: boolean; error?: string; tier?: string; expiresAt?: Date }>;
  syncWithRevenueCat: (entitlements: string[]) => Promise<void>;
  setAppMode: (mode: string) => void;

  // Expiration info
  sponsorExpiration: Date | null;

  // For display
  tierLabel: string;
  isSponsored: boolean;

  // QA Free Mode (Founder testing - legacy)
  qaFreeModeEnabled: boolean;
  enableQAFreeMode: () => Promise<void>;
  disableQAFreeMode: () => Promise<void>;

  // FREE USER VIEW — Hard override for testing real user experience
  freeUserViewActive: boolean;
  freeUserViewBanner: string | null;
  enableFreeUserView: () => Promise<void>;
  disableFreeUserView: () => Promise<void>;

  // Route visibility (respects Free User View)
  showOrganizationTab: boolean;
  showBriefingsOrgGlobal: boolean;
  showSentinelDemo: boolean;
  showCCIIssuance: boolean;

  // Testing helpers (dev only)
  __generateTestCode: typeof generateTestCode;
  __clearAllGrants: () => Promise<void>;
}

export function useAccess(): AccessContext {
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appMode, setAppModeState] = useState<string>('personal');
  const [revenueCatEntitlements, setRevenueCatEntitlements] = useState<string[]>([]);
  const [qaFreeModeEnabled, setQAFreeModeEnabled] = useState<boolean>(false);
  const [freeUserViewActive, setFreeUserViewActive] = useState<boolean>(false);

  // Load grants, QA Free Mode, and Free User View state on mount
  useEffect(() => {
    Promise.all([
      loadGrants(),
      initializeQAFreeMode(),
      initializeForcedRoleView(),
    ]).then(([loaded, qaEnabled, forcedRole]) => {
      setGrants(loaded);
      setQAFreeModeEnabled(qaEnabled);
      setFreeUserViewActive(forcedRole === 'free');
      setIsLoading(false);
    });
  }, []);

  // Determine if org mode bypasses subscription
  // NOTE: Free User View BLOCKS org bypass entirely (unlike QA Free Mode)
  const orgBypass = useMemo(() => {
    // FREE USER VIEW: Block ALL org bypass — must experience true free user flow
    if (freeUserViewActive) {
      return false;
    }
    return (BYPASS_MODES as readonly string[]).includes(appMode);
  }, [appMode, freeUserViewActive]);

  // Compute effective base tier
  // NOTE: Free User View forces 'starter' tier ALWAYS (blocks everything)
  // NOTE: QA Free Mode forces 'starter' tier for Personal mode only
  const baseTier = useMemo(() => {
    // FREE USER VIEW: Always starter — no exceptions
    if (freeUserViewActive) {
      return 'starter';
    }
    // QA Free Mode only affects Personal mode, not institutional demos
    if (qaFreeModeEnabled && !orgBypass) {
      return 'starter';
    }
    return resolveBaseTier(grants, orgBypass);
  }, [grants, orgBypass, qaFreeModeEnabled, freeUserViewActive]);

  // Compute feature flags
  // NOTE: Free User View blocks ALL features (no exceptions)
  // NOTE: QA Free Mode restricts all features for Personal mode
  const features = useMemo(() => {
    // FREE USER VIEW: All features disabled — no exceptions
    if (freeUserViewActive) {
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
    if (qaFreeModeEnabled && !orgBypass) {
      // QA Free Mode: all features disabled
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
    return computeFeatures(baseTier, grants, orgBypass);
  }, [baseTier, grants, orgBypass, qaFreeModeEnabled, freeUserViewActive]);

  // Tier checks
  const hasTier = useCallback(
    (tier: BaseTier): boolean => {
      const currentIdx = TIER_HIERARCHY.indexOf(baseTier);
      const requestedIdx = TIER_HIERARCHY.indexOf(tier);
      return currentIdx >= requestedIdx;
    },
    [baseTier]
  );

  const hasAddonFn = useCallback(
    (addon: FamilyAddon): boolean => {
      return hasFamilyAddon(grants, addon) || orgBypass;
    },
    [grants, orgBypass]
  );

  const hasBundleFn = useCallback(
    (bundle: BundleType): boolean => {
      return hasBundle(grants, bundle);
    },
    [grants]
  );

  const hasSponsorSeat = useCallback(
    (type: SponsorSeatType): boolean => {
      return grants.some((g) => g.tier === type);
    },
    [grants]
  );

  const hasFeature = useCallback(
    (feature: keyof AccessFeatures): boolean => {
      return features[feature];
    },
    [features]
  );

  // Get sponsor expiration
  const sponsorExpiration = useMemo(() => {
    const sponsorGrants = grants.filter(
      (g) => g.tier === 'sponsor_seat_core' || g.tier === 'sponsor_seat_pro'
    );
    if (sponsorGrants.length === 0) return null;
    const latestExpiry = Math.max(...sponsorGrants.map((g) => g.expiresAt || 0));
    return latestExpiry > 0 ? new Date(latestExpiry) : null;
  }, [grants]);

  // Check if sponsored
  const isSponsored = useMemo(() => {
    return grants.some((g) => g.source === 'sponsor_code' || g.source === 'bundle_code');
  }, [grants]);

  // Tier label for display
  const tierLabel = useMemo(() => {
    // FREE USER VIEW indicator (takes priority)
    if (freeUserViewActive) {
      return 'Free (View Mode)';
    }
    // QA Free Mode indicator
    if (qaFreeModeEnabled && !orgBypass) {
      return 'Starter (QA Mode)';
    }
    if (orgBypass) return 'Organization Access';
    if (isSponsored) {
      const proSponsor = grants.find((g) => g.tier === 'sponsor_seat_pro');
      return proSponsor ? 'Sponsored Pro' : 'Sponsored';
    }
    switch (baseTier) {
      case 'individual_pro':
        return 'Pro';
      case 'individual':
        return 'Individual';
      default:
        return 'Starter';
    }
  }, [baseTier, orgBypass, isSponsored, grants, qaFreeModeEnabled, freeUserViewActive]);

  // Redeem sponsor code
  const redeemSponsorCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string; tier?: string; expiresAt?: Date }> => {
      const result = await validateSponsorCode(code);

      if (!result.valid || !result.tier || !result.expiresAt) {
        return { success: false, error: result.error || 'Invalid code' };
      }

      const grant: AccessGrant = {
        id: `sponsor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tier: result.tier,
        source: 'sponsor_code',
        grantedAt: Date.now(),
        expiresAt: result.expiresAt,
        redeemedCode: code.toUpperCase().replace(/[-\s]/g, '').substring(0, 8) + '****', // Partial for audit
      };

      await addGrant(grant);

      // Reload grants
      const updated = await loadGrants();
      setGrants(updated);

      return {
        success: true,
        tier: result.tier === 'sponsor_seat_pro' ? 'Pro' : 'Core',
        expiresAt: new Date(result.expiresAt),
      };
    },
    []
  );

  // Sync with RevenueCat entitlements
  const syncWithRevenueCat = useCallback(async (entitlements: string[]): Promise<void> => {
    setRevenueCatEntitlements(entitlements);

    // Map RevenueCat entitlements to grants
    const newGrants: AccessGrant[] = [];

    if (entitlements.includes('individual_pro') || entitlements.includes('pro')) {
      newGrants.push({
        id: 'rc_individual_pro',
        tier: 'individual_pro',
        source: 'iap',
        grantedAt: Date.now(),
        expiresAt: null, // RevenueCat manages expiration
      });
    } else if (entitlements.includes('individual_access') || entitlements.includes('individual')) {
      newGrants.push({
        id: 'rc_individual',
        tier: 'individual',
        source: 'iap',
        grantedAt: Date.now(),
        expiresAt: null,
      });
    }

    if (entitlements.includes('family_pro')) {
      newGrants.push({
        id: 'rc_family_pro',
        tier: 'family_pro',
        source: 'iap',
        grantedAt: Date.now(),
        expiresAt: null,
      });
    } else if (entitlements.includes('family_access') || entitlements.includes('family')) {
      newGrants.push({
        id: 'rc_family',
        tier: 'family',
        source: 'iap',
        grantedAt: Date.now(),
        expiresAt: null,
      });
    }

    // Merge with existing non-IAP grants
    const existingGrants = await loadGrants();
    const nonIapGrants = existingGrants.filter((g) => g.source !== 'iap');
    const merged = [...nonIapGrants, ...newGrants];
    await saveGrants(merged);
    setGrants(merged);
  }, []);

  // Set app mode
  const setAppMode = useCallback((mode: string) => {
    setAppModeState(mode);
  }, []);

  // Clear all grants (for testing)
  const clearAllGrants = useCallback(async () => {
    await AsyncStorage.removeItem(ACCESS_STORAGE_KEYS.GRANTS);
    await AsyncStorage.removeItem(ACCESS_STORAGE_KEYS.REDEEMED_CODES);
    setGrants([]);
  }, []);

  // QA Free Mode actions
  const enableQAFreeMode = useCallback(async () => {
    await enableQA();
    setQAFreeModeEnabled(true);
  }, []);

  const disableQAFreeMode = useCallback(async () => {
    await disableQA();
    setQAFreeModeEnabled(false);
  }, []);

  // Limits
  const limits = useMemo(() => {
    // FREE USER VIEW uses strict Free limits (takes priority)
    if (freeUserViewActive) {
      return {
        maxSignalsPerMonth: FREE_ROLE_RESTRICTIONS.maxSignalsPerMonth,
        maxPatternHistoryDays: FREE_ROLE_RESTRICTIONS.maxPatternHistoryDays,
      };
    }
    // QA Free Mode uses strict Starter limits
    if (qaFreeModeEnabled && !orgBypass) {
      return {
        maxSignalsPerMonth: QA_FREE_MODE_LIMITS.maxSignalsPerMonth,
        maxPatternHistoryDays: QA_FREE_MODE_LIMITS.maxPatternHistoryDays,
      };
    }
    if (baseTier === 'starter' && !orgBypass) {
      return {
        maxSignalsPerMonth: STARTER_TIER.limits.maxSignalsPerMonth,
        maxPatternHistoryDays: STARTER_TIER.limits.maxPatternHistoryDays,
      };
    }
    return {
      maxSignalsPerMonth: Infinity,
      maxPatternHistoryDays: Infinity,
    };
  }, [baseTier, orgBypass, qaFreeModeEnabled, freeUserViewActive]);

  // FREE USER VIEW: Route visibility
  const showOrganizationTabFlag = useMemo(() => {
    if (freeUserViewActive) return false;
    return true;
  }, [freeUserViewActive]);

  // B2C Briefings: ONLY show Personal scope
  // Organization/Global scopes are for B2B/Institutional modes only
  const showBriefingsOrgGlobalFlag = useMemo(() => {
    if (freeUserViewActive) return false;
    // Only show Org/Global for institutional modes OR founder demo
    return orgBypass || FOUNDER_DEMO_ENABLED;
  }, [freeUserViewActive, orgBypass]);

  const showSentinelDemoFlag = useMemo(() => {
    if (freeUserViewActive) return false;
    return true;
  }, [freeUserViewActive]);

  const showCCIIssuanceFlag = useMemo(() => {
    if (freeUserViewActive) return false;
    return true;
  }, [freeUserViewActive]);

  // FREE USER VIEW: Banner
  const freeUserViewBanner = useMemo(() => {
    if (freeUserViewActive) {
      return 'FREE USER VIEW — All elevated access suppressed';
    }
    return null;
  }, [freeUserViewActive]);

  // FREE USER VIEW: Enable/Disable actions
  const enableFreeUserViewAction = useCallback(async () => {
    await enableFreeUserView();
    setFreeUserViewActive(true);
  }, []);

  const disableFreeUserViewAction = useCallback(async () => {
    await disableFreeUserView();
    setFreeUserViewActive(false);
  }, []);

  return {
    isLoading,
    baseTier,
    grants,
    features,
    hasTier,
    hasAddon: hasAddonFn,
    hasBundle: hasBundleFn,
    hasSponsorSeat,
    hasFeature,
    limits,
    redeemSponsorCode,
    syncWithRevenueCat,
    setAppMode,
    sponsorExpiration,
    tierLabel,
    isSponsored,
    // QA Free Mode (legacy)
    qaFreeModeEnabled,
    enableQAFreeMode,
    disableQAFreeMode,
    // FREE USER VIEW — Hard override
    freeUserViewActive,
    freeUserViewBanner,
    enableFreeUserView: enableFreeUserViewAction,
    disableFreeUserView: disableFreeUserViewAction,
    // Route visibility (respects Free User View)
    showOrganizationTab: showOrganizationTabFlag,
    showBriefingsOrgGlobal: showBriefingsOrgGlobalFlag,
    showSentinelDemo: showSentinelDemoFlag,
    showCCIIssuance: showCCIIssuanceFlag,
    // Testing helpers
    __generateTestCode: generateTestCode,
    __clearAllGrants: clearAllGrants,
  };
}

// =============================================================================
// STANDALONE FUNCTIONS (for non-hook contexts)
// =============================================================================

/**
 * Check if app mode bypasses subscription.
 */
export function shouldBypassSubscription(mode: string): boolean {
  return (BYPASS_MODES as readonly string[]).includes(mode);
}

/**
 * Get starter tier limits.
 */
export function getStarterLimits() {
  return STARTER_TIER.limits;
}

/**
 * Generate a test sponsor code.
 */
export { generateTestCode };
