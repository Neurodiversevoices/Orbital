/**
 * CCI Pricing Logic — Tier-Based Resolution
 *
 * DOCTRINE: CCI is a one-time purchase, not a subscription.
 *
 * PRICING TIERS:
 * - Individual (Free user): $199
 * - Individual (Paid user: Pro/Family/Circle/Bundle): $149
 * - Circle CCI: $399 (only if user in active Circle AND all members Pro)
 * - Bundle CCI: $999 (only if user in active Bundle AND seats Pro-entitled)
 *
 * VISIBILITY RULES:
 * - Individual CCI: Always visible
 * - Circle CCI: Only if hasCircle && allCircleMembersPro
 * - Bundle CCI: Only if hasBundle && allBundleSeatsPro
 *
 * Do not surface CCI purchase options inside demo-only institutional modes.
 */

import {
  CCI_PRICING,
  CCI_GROUP_PRICING,
  PRODUCT_IDS,
  type ProductId,
} from '../subscription/pricing';
import type { UserEntitlements } from '../entitlements';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for CCI purchase tracking
const CCI_CIRCLE_PURCHASED_KEY = 'orbital:cci:circle:purchased';
const CCI_BUNDLE_PURCHASED_KEY = 'orbital:cci:bundle:purchased';

// =============================================================================
// CCI PURCHASE STATE TRACKING
// =============================================================================

/**
 * Check if Circle CCI has been purchased
 */
export async function hasCircleCCIPurchased(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(CCI_CIRCLE_PURCHASED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Check if Bundle CCI has been purchased
 */
export async function hasBundleCCIPurchased(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(CCI_BUNDLE_PURCHASED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark Circle CCI as purchased
 * Call this after successful Stripe checkout for Circle CCI
 */
export async function markCircleCCIPurchased(): Promise<void> {
  await AsyncStorage.setItem(CCI_CIRCLE_PURCHASED_KEY, 'true');
}

/**
 * Mark Bundle CCI as purchased
 * Call this after successful Stripe checkout for Bundle CCI
 */
export async function markBundleCCIPurchased(): Promise<void> {
  await AsyncStorage.setItem(CCI_BUNDLE_PURCHASED_KEY, 'true');
}

/**
 * Clear Circle CCI purchase state
 * Call this when user leaves Circle or for testing
 */
export async function clearCircleCCIPurchased(): Promise<void> {
  await AsyncStorage.removeItem(CCI_CIRCLE_PURCHASED_KEY);
}

/**
 * Clear Bundle CCI purchase state
 * Call this when user leaves Bundle or for testing
 */
export async function clearBundleCCIPurchased(): Promise<void> {
  await AsyncStorage.removeItem(CCI_BUNDLE_PURCHASED_KEY);
}

// =============================================================================
// TYPES
// =============================================================================

export type CCITierId =
  | 'individual_free'
  | 'individual_paid'
  | 'circle'
  | 'bundle';

export type CCIScope = 'individual' | 'circle' | 'bundle';

export interface CCIPricingTier {
  /** Tier identifier */
  id: CCITierId;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
  /** Price in USD */
  price: number;
  /** Scope of the CCI */
  scope: CCIScope;
  /** RevenueCat product ID */
  productId: ProductId;
  /** Whether this tier is visible to the user */
  visible: boolean;
  /** Whether the user is eligible to purchase */
  eligible: boolean;
  /** Reason if not eligible (undefined if eligible) */
  reason?: string;
  /** Whether this tier has been purchased */
  purchased: boolean;
}

export interface CCIPricingResult {
  /** All resolved tiers */
  tiers: CCIPricingTier[];
  /** The individual tier (always present) */
  individualTier: CCIPricingTier;
  /** Circle tier (may not be visible) */
  circleTier: CCIPricingTier;
  /** Bundle tier (may not be visible) */
  bundleTier: CCIPricingTier;
  /** Whether CCI section should be hidden (demo mode) */
  hiddenByDemoMode: boolean;
}

// =============================================================================
// CIRCLE/BUNDLE PRO VERIFICATION
// =============================================================================

/**
 * Check if all Circle members have Pro subscription.
 * This is a placeholder that will be implemented when Circle membership
 * tracking is fully integrated.
 *
 * TODO: Integrate with actual Circle membership data from backend
 */
export async function checkCircleAllMembersPro(
  _circleId: string | null
): Promise<boolean> {
  // For now, assume if user has Circle, all members are Pro
  // This will be enforced by the Circle Pro gate we implemented
  return true;
}

/**
 * Check if all Bundle seats are Pro-entitled.
 * This is a placeholder that will be implemented when Bundle seat
 * tracking is fully integrated.
 *
 * TODO: Integrate with actual Bundle seat data from backend
 */
export async function checkBundleAllSeatsPro(
  _bundleId: string | null
): Promise<boolean> {
  // For now, assume if user has Bundle, all seats are Pro
  // Bundles include Pro by definition
  return true;
}

// =============================================================================
// DEMO MODE CHECK
// =============================================================================

/**
 * Check if we're in a demo-only institutional mode.
 * CCI purchases should be hidden in these modes.
 */
export function isInstitutionalDemoMode(): boolean {
  // Check for Sentinel demo modes or other institutional demo contexts
  // This would typically check app state or route params
  // For now, return false as the demo mode is handled at the screen level
  return false;
}

// =============================================================================
// PRICING RESOLUTION
// =============================================================================

/**
 * Resolve CCI pricing tiers based on current entitlements.
 *
 * This is the canonical function for determining CCI pricing and eligibility.
 *
 * @param entitlements Current user entitlements
 * @param options Additional options for resolution
 * @returns Resolved pricing tiers with visibility and eligibility
 */
export async function resolveCCIPricing(
  entitlements: UserEntitlements,
  options: {
    /** Override demo mode check */
    forceDemoMode?: boolean;
    /** Circle members Pro status (if known) */
    circleMembersPro?: boolean;
    /** Bundle seats Pro status (if known) */
    bundleSeatsPro?: boolean;
  } = {}
): Promise<CCIPricingResult> {
  const {
    forceDemoMode = false,
    circleMembersPro,
    bundleSeatsPro,
  } = options;

  // Check demo mode
  const hiddenByDemoMode = forceDemoMode || isInstitutionalDemoMode();

  // Determine if user is "paid" (any paid subscription)
  const isPaid =
    entitlements.isPro ||
    entitlements.hasFamily ||
    entitlements.hasCircle ||
    entitlements.hasBundle;

  // Check Circle/Bundle Pro status
  const allCircleMembersPro =
    circleMembersPro ??
    (entitlements.hasCircle
      ? await checkCircleAllMembersPro(entitlements.circleId)
      : false);

  const allBundleSeatsPro =
    bundleSeatsPro ??
    (entitlements.hasBundle
      ? await checkBundleAllSeatsPro(entitlements.bundleId)
      : false);

  // Fetch CCI purchase states
  const circleCCIPurchased = entitlements.hasCircle
    ? await hasCircleCCIPurchased()
    : false;
  const bundleCCIPurchased = entitlements.hasBundle
    ? await hasBundleCCIPurchased()
    : false;

  // Build Individual tier
  const individualTier: CCIPricingTier = isPaid
    ? {
        id: 'individual_paid',
        label: 'Individual CCI',
        description: 'Clinical Capacity Instrument for your personal record',
        price: CCI_PRICING.proUser,
        scope: 'individual',
        productId: PRODUCT_IDS.CCI_PRO,
        visible: true,
        eligible: true,
        purchased: entitlements.hasCCIPurchased,
      }
    : {
        id: 'individual_free',
        label: 'Individual CCI',
        description: 'Clinical Capacity Instrument for your personal record',
        price: CCI_PRICING.freeUser,
        scope: 'individual',
        productId: PRODUCT_IDS.CCI_FREE,
        visible: true,
        eligible: true,
        purchased: entitlements.hasCCIPurchased,
      };

  // Build Circle tier
  const circleTier: CCIPricingTier = {
    id: 'circle',
    label: 'Circle CCI',
    description: 'One CCI covering all Circle members',
    price: CCI_GROUP_PRICING.circleAll,
    scope: 'circle',
    productId: PRODUCT_IDS.CCI_CIRCLE_ALL,
    visible: entitlements.hasCircle && allCircleMembersPro,
    eligible: entitlements.hasCircle && allCircleMembersPro && !circleCCIPurchased,
    reason: !entitlements.hasCircle
      ? 'Requires active Circle subscription'
      : !allCircleMembersPro
        ? 'All Circle members must have Pro'
        : circleCCIPurchased
          ? 'Already purchased'
          : undefined,
    purchased: circleCCIPurchased,
  };

  // Build Bundle tier
  const bundleTier: CCIPricingTier = {
    id: 'bundle',
    label: 'Bundle CCI',
    description: 'One CCI covering all Bundle seats',
    price: CCI_GROUP_PRICING.bundleAll,
    scope: 'bundle',
    productId: PRODUCT_IDS.CCI_BUNDLE_ALL,
    visible: entitlements.hasBundle && allBundleSeatsPro,
    eligible: entitlements.hasBundle && allBundleSeatsPro && !bundleCCIPurchased,
    reason: !entitlements.hasBundle
      ? 'Requires active Bundle subscription'
      : !allBundleSeatsPro
        ? 'All Bundle seats must be Pro-entitled'
        : bundleCCIPurchased
          ? 'Already purchased'
          : undefined,
    purchased: bundleCCIPurchased,
  };

  // Collect all tiers
  const tiers: CCIPricingTier[] = [individualTier];
  if (circleTier.visible) tiers.push(circleTier);
  if (bundleTier.visible) tiers.push(bundleTier);

  return {
    tiers,
    individualTier,
    circleTier,
    bundleTier,
    hiddenByDemoMode,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get the appropriate individual CCI price for display.
 */
export function getIndividualCCIPrice(isPaid: boolean): number {
  return isPaid ? CCI_PRICING.proUser : CCI_PRICING.freeUser;
}

/**
 * Get the appropriate individual CCI product ID.
 */
export function getIndividualCCIProductId(isPaid: boolean): ProductId {
  return isPaid ? PRODUCT_IDS.CCI_PRO : PRODUCT_IDS.CCI_FREE;
}

/**
 * Format CCI price for display with discount badge info.
 */
export function formatCCIPriceWithDiscount(
  isPaid: boolean
): { price: number; discount?: { amount: number; label: string } } {
  if (isPaid) {
    return {
      price: CCI_PRICING.proUser,
      discount: {
        amount: CCI_PRICING.freeUser - CCI_PRICING.proUser,
        label: 'PRO DISCOUNT',
      },
    };
  }
  return { price: CCI_PRICING.freeUser };
}
