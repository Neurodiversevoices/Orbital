/**
 * Canonical Entitlement Layer
 *
 * Single source of truth for all entitlement checks.
 * Used by UI, API, and consent enforcement.
 *
 * TIER LADDER (B2C): Free → Pro → Family → Circles → CCI-Q4
 *
 * RULES:
 * - Pro is required for participation in Circles and Bundles
 * - Family is a Pro add-on (family circles allowed)
 * - Circles are purchasable containers (5 buddies max, all must be Pro)
 * - Bundles are Annual-only: 10, 15, 20 seats
 * - Admin Add-on: optional paid add-on for READ-ONLY pattern history (consent-gated)
 * - CCI can be purchased by anyone, price varies: $199 (Free) | $149 (Pro)
 */

import { getGrantedEntitlements, hasEntitlement } from '../payments/mockCheckout';
import { ENTITLEMENTS, CCI_PRICING, getCCIPrice, getCCIProductId } from '../subscription/pricing';

// =============================================================================
// TYPES
// =============================================================================

export interface UserEntitlements {
  // Core status
  isFree: boolean;
  isPro: boolean;

  // Add-ons
  hasFamily: boolean;
  familyMemberCount: number;

  // Circles
  hasCircle: boolean;
  circleId: string | null;
  circleMemberCount: number;
  maxCircleBuddies: 5;

  // Bundles
  hasBundle: boolean;
  bundleId: string | null;
  bundleSize: 10 | 15 | 20 | null;

  // Admin
  hasAdminAddOn: boolean;

  // CCI
  hasCCIPurchased: boolean;
  cciPrice: number;

  // Raw entitlements list
  rawEntitlements: string[];
}

// =============================================================================
// ENTITLEMENT CHECKING FUNCTIONS
// =============================================================================

/**
 * Check if user is Free tier (no Pro entitlement)
 */
export async function checkIsFree(): Promise<boolean> {
  const isPro = await hasEntitlement(ENTITLEMENTS.PRO);
  return !isPro;
}

/**
 * Check if user has Pro tier
 */
export async function checkIsPro(): Promise<boolean> {
  return hasEntitlement(ENTITLEMENTS.PRO);
}

/**
 * Check if user has Family add-on
 */
export async function checkHasFamily(): Promise<boolean> {
  return hasEntitlement(ENTITLEMENTS.FAMILY);
}

/**
 * Check if user has Circle access
 */
export async function checkHasCircle(): Promise<boolean> {
  return hasEntitlement(ENTITLEMENTS.CIRCLE);
}

/**
 * Check if user has a specific bundle
 */
export async function checkHasBundle(bundleSize?: 10 | 15 | 20): Promise<boolean> {
  if (bundleSize === 10) return hasEntitlement(ENTITLEMENTS.BUNDLE_10);
  if (bundleSize === 15) return hasEntitlement(ENTITLEMENTS.BUNDLE_15);
  if (bundleSize === 20) return hasEntitlement(ENTITLEMENTS.BUNDLE_20);

  // Check for any bundle
  const entitlements = await getGrantedEntitlements();
  return (
    entitlements.includes(ENTITLEMENTS.BUNDLE_10) ||
    entitlements.includes(ENTITLEMENTS.BUNDLE_15) ||
    entitlements.includes(ENTITLEMENTS.BUNDLE_20)
  );
}

/**
 * Check if user has Admin add-on
 */
export async function checkHasAdminAddOn(): Promise<boolean> {
  return hasEntitlement(ENTITLEMENTS.ADMIN_ADDON);
}

/**
 * Check if user has purchased CCI
 */
export async function checkHasCCIPurchased(): Promise<boolean> {
  return hasEntitlement(ENTITLEMENTS.CCI_PURCHASED);
}

/**
 * Get CCI price for current user
 */
export async function getUserCCIPrice(): Promise<number> {
  const isPro = await checkIsPro();
  return getCCIPrice(isPro ? 60 : 90);
}

/**
 * Get CCI product ID for current user
 */
export async function getUserCCIProductId(): Promise<string> {
  const isPro = await checkIsPro();
  return getCCIProductId(isPro ? 60 : 90);
}

// =============================================================================
// AGGREGATED ENTITLEMENT STATE
// =============================================================================

/**
 * Get complete user entitlement state
 * This is the canonical function to use across the app
 */
export async function getUserEntitlements(): Promise<UserEntitlements> {
  const entitlements = await getGrantedEntitlements();

  const isPro = entitlements.includes(ENTITLEMENTS.PRO);
  const hasFamily = entitlements.includes(ENTITLEMENTS.FAMILY);
  const hasCircle = entitlements.includes(ENTITLEMENTS.CIRCLE);
  const hasBundle10 = entitlements.includes(ENTITLEMENTS.BUNDLE_10);
  const hasBundle15 = entitlements.includes(ENTITLEMENTS.BUNDLE_15);
  const hasBundle20 = entitlements.includes(ENTITLEMENTS.BUNDLE_20);
  const hasAdminAddOn = entitlements.includes(ENTITLEMENTS.ADMIN_ADDON);
  const hasCCIPurchased = entitlements.includes(ENTITLEMENTS.CCI_PURCHASED);

  // Determine bundle size
  let bundleSize: 10 | 15 | 20 | null = null;
  if (hasBundle20) bundleSize = 20;
  else if (hasBundle15) bundleSize = 15;
  else if (hasBundle10) bundleSize = 10;

  return {
    isFree: !isPro,
    isPro,
    hasFamily,
    familyMemberCount: hasFamily ? 1 : 0, // TODO: Track actual family members
    hasCircle,
    circleId: hasCircle ? 'demo_circle' : null, // TODO: Track actual circle ID
    circleMemberCount: hasCircle ? 1 : 0, // TODO: Track actual circle members
    maxCircleBuddies: 5,
    hasBundle: hasBundle10 || hasBundle15 || hasBundle20,
    bundleId: bundleSize ? `demo_bundle_${bundleSize}` : null,
    bundleSize,
    hasAdminAddOn,
    hasCCIPurchased,
    cciPrice: isPro ? CCI_PRICING.sixtyDay : CCI_PRICING.ninetyDay,
    rawEntitlements: entitlements,
  };
}

// =============================================================================
// ELIGIBILITY CHECKS
// =============================================================================

/**
 * Check if user can purchase Family add-on
 */
export async function canPurchaseFamily(): Promise<{ eligible: boolean; reason?: string }> {
  const isPro = await checkIsPro();
  if (!isPro) {
    return { eligible: false, reason: 'Pro subscription required' };
  }

  const hasFamily = await checkHasFamily();
  if (hasFamily) {
    return { eligible: false, reason: 'Already have Family add-on' };
  }

  return { eligible: true };
}

/**
 * Check if user can purchase/create a Circle
 */
export async function canPurchaseCircle(): Promise<{ eligible: boolean; reason?: string }> {
  const isPro = await checkIsPro();
  if (!isPro) {
    return { eligible: false, reason: 'Pro subscription required for all Circle members' };
  }

  return { eligible: true };
}

/**
 * Check if user can join a Circle (as a buddy)
 */
export async function canJoinCircle(): Promise<{ eligible: boolean; reason?: string }> {
  const isPro = await checkIsPro();
  if (!isPro) {
    return { eligible: false, reason: 'Pro subscription required to join Circles' };
  }

  return { eligible: true };
}

/**
 * Check if user can purchase a Bundle
 */
export async function canPurchaseBundle(): Promise<{ eligible: boolean; reason?: string }> {
  // Bundles can be purchased by anyone (they include Pro seats)
  return { eligible: true };
}

/**
 * Check if user can purchase Admin add-on
 */
export async function canPurchaseAdminAddOn(): Promise<{ eligible: boolean; reason?: string }> {
  const hasCircle = await checkHasCircle();
  const hasBundle = await checkHasBundle();

  if (!hasCircle && !hasBundle) {
    return { eligible: false, reason: 'Circle or Bundle required for Admin add-on' };
  }

  const hasAdmin = await checkHasAdminAddOn();
  if (hasAdmin) {
    return { eligible: false, reason: 'Already have Admin add-on' };
  }

  return { eligible: true };
}

/**
 * Check if user can purchase CCI
 * Everyone can purchase CCI, but price varies
 */
export async function canPurchaseCCI(): Promise<{ eligible: boolean; price: number }> {
  const isPro = await checkIsPro();
  return {
    eligible: true, // Always eligible
    price: getCCIPrice(isPro ? 60 : 90),
  };
}

/**
 * Check if user can purchase Circle CCI
 * REQUIREMENT: User must be a member of the specific Circle
 */
export async function canPurchaseCircleCCI(circleId?: string): Promise<{ eligible: boolean; reason?: string; price: number }> {
  const hasCircle = await checkHasCircle();

  if (!hasCircle) {
    return {
      eligible: false,
      reason: 'You must be a member of a Circle to purchase Circle CCI',
      price: 399
    };
  }

  // TODO: When backend is ready, verify user is member of specific circleId
  // For now, having any circle membership grants access
  if (circleId) {
    // Future: const isMember = await checkIsCircleMember(circleId);
    // if (!isMember) return { eligible: false, reason: 'Not a member of this Circle' };
  }

  return { eligible: true, price: 399 };
}

/**
 * Check if user can purchase Bundle CCI
 * REQUIREMENT: User must own/be member of the specific Bundle with matching size
 */
export async function canPurchaseBundleCCI(bundleSize?: 10 | 15 | 20): Promise<{ eligible: boolean; reason?: string; price: number }> {
  const hasBundle = await checkHasBundle();

  if (!hasBundle) {
    return {
      eligible: false,
      reason: 'You must own a Bundle to purchase Bundle CCI',
      price: 999
    };
  }

  // If specific bundle size requested, verify user has that bundle
  if (bundleSize) {
    const hasSpecificBundle = await checkHasBundle(bundleSize);
    if (!hasSpecificBundle) {
      return {
        eligible: false,
        reason: `Bundle ${bundleSize} entitlement required`,
        price: 999
      };
    }
  }

  return { eligible: true, price: 999 };
}

// =============================================================================
// CIRCLE/BUNDLE PRO VERIFICATION (for CCI eligibility)
// =============================================================================

/**
 * Check if all Circle members have Pro subscription.
 *
 * Delegates to the canonical implementation in lib/cci/pricing.ts
 * which queries Supabase for real entitlement data.
 */
export async function checkCircleAllMembersPro(circleId?: string | null): Promise<boolean> {
  const hasCircle = await checkHasCircle();
  if (!hasCircle) return false;

  const { checkCircleAllMembersPro: checkPro } = await import('../cci/pricing');
  return checkPro(circleId ?? null);
}

/**
 * Check if all Bundle seats are Pro-entitled.
 *
 * Delegates to the canonical implementation in lib/cci/pricing.ts
 * which queries Supabase for real entitlement data.
 */
export async function checkBundleAllSeatsPro(bundleId?: string | null): Promise<boolean> {
  const hasBundle = await checkHasBundle();
  if (!hasBundle) return false;

  const { checkBundleAllSeatsPro: checkPro } = await import('../cci/pricing');
  return checkPro(bundleId ?? null);
}

// =============================================================================
// CONSENT-GATED ACCESS CHECKS
// =============================================================================

/**
 * Check if Admin can view member history
 * NOTE: This requires PoisonPillConsentGate enforcement
 */
export async function canAdminViewMemberHistory(): Promise<{ allowed: boolean; reason?: string }> {
  const hasAdmin = await checkHasAdminAddOn();
  if (!hasAdmin) {
    return { allowed: false, reason: 'Admin add-on required' };
  }

  // Consent is checked separately via PoisonPillConsentGate
  return { allowed: true };
}

/**
 * Check if user can access relational features
 * NOTE: This requires PoisonPillConsentGate enforcement
 */
export async function canAccessRelationalFeatures(): Promise<{ allowed: boolean; reason?: string }> {
  const hasCircle = await checkHasCircle();
  const hasBundle = await checkHasBundle();

  if (!hasCircle && !hasBundle) {
    return { allowed: false, reason: 'Circle or Bundle required for relational features' };
  }

  // Consent is checked separately via PoisonPillConsentGate
  return { allowed: true };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  getGrantedEntitlements,
  hasEntitlement,
} from '../payments/mockCheckout';

export {
  ENTITLEMENTS,
  CCI_PRICING,
  getCCIPrice,
  getCCIProductId,
} from '../subscription/pricing';
