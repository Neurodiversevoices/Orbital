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
 * Check if all Circle members have active Pro subscriptions.
 *
 * Queries the circles and circle_members Supabase tables, then verifies
 * every active member has 'individual_pro' in user_entitlements.
 *
 * If ANY member lacks Pro, returns false — the Circle CCI tier is blocked.
 */
export async function checkCircleAllMembersPro(
  circleId: string | null
): Promise<boolean> {
  if (!circleId) return false;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return false;

    const supabase = createClient(url, key);

    // Get all active members of this circle
    const { data: members, error: membersError } = await supabase
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', circleId)
      .eq('status', 'active');

    if (membersError || !members || members.length === 0) return false;

    // Check each member has individual_pro entitlement
    const userIds = members.map((m: { user_id: string }) => m.user_id);

    const { data: entitlements, error: entError } = await supabase
      .from('user_entitlements')
      .select('user_id')
      .in('user_id', userIds)
      .eq('entitlement_id', 'individual_pro');

    if (entError) return false;

    const proUserIds = new Set(
      (entitlements || []).map((e: { user_id: string }) => e.user_id)
    );

    // Every member must have Pro
    return userIds.every((id: string) => proUserIds.has(id));
  } catch {
    // If Supabase is not configured or query fails, block the purchase
    return false;
  }
}

/**
 * Check if all Bundle seats are Pro-entitled.
 *
 * Queries the bundle_seats table, then verifies every active seat holder
 * has 'individual_pro' in user_entitlements.
 *
 * Bundles include Pro by design, but this checks enforcement in case
 * a subscription lapsed.
 */
export async function checkBundleAllSeatsPro(
  bundleId: string | null
): Promise<boolean> {
  if (!bundleId) return false;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return false;

    const supabase = createClient(url, key);

    // Get all active seats with assigned users
    const { data: seats, error: seatsError } = await supabase
      .from('bundle_seats')
      .select('user_id')
      .eq('bundle_id', bundleId)
      .eq('status', 'active')
      .not('user_id', 'is', null);

    if (seatsError || !seats || seats.length === 0) return false;

    const userIds = seats.map((s: { user_id: string }) => s.user_id);

    const { data: entitlements, error: entError } = await supabase
      .from('user_entitlements')
      .select('user_id')
      .in('user_id', userIds)
      .eq('entitlement_id', 'individual_pro');

    if (entError) return false;

    const proUserIds = new Set(
      (entitlements || []).map((e: { user_id: string }) => e.user_id)
    );

    return userIds.every((id: string) => proUserIds.has(id));
  } catch {
    return false;
  }
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

  // Build Individual tier
  const individualTier: CCIPricingTier = isPaid
    ? {
        id: 'individual_paid',
        label: 'Individual CCI',
        description: 'Structured capacity artifact for your personal record',
        price: CCI_PRICING.sixtyDay,
        scope: 'individual',
        productId: PRODUCT_IDS.CCI_90_PRO,
        visible: true,
        eligible: true,
        purchased: entitlements.hasCCIPurchased,
      }
    : {
        id: 'individual_free',
        label: 'Individual CCI',
        description: 'Structured capacity artifact for your personal record',
        price: CCI_PRICING.ninetyDay,
        scope: 'individual',
        productId: PRODUCT_IDS.CCI_90,
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
    eligible: entitlements.hasCircle && allCircleMembersPro,
    reason: !entitlements.hasCircle
      ? 'Requires active Circle subscription'
      : !allCircleMembersPro
        ? 'All Circle members must have Pro'
        : undefined,
    purchased: false, // TODO: Track Circle CCI purchase state
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
    eligible: entitlements.hasBundle && allBundleSeatsPro,
    reason: !entitlements.hasBundle
      ? 'Requires active Bundle subscription'
      : !allBundleSeatsPro
        ? 'All Bundle seats must be Pro-entitled'
        : undefined,
    purchased: false, // TODO: Track Bundle CCI purchase state
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
  return isPaid ? CCI_PRICING.sixtyDay : CCI_PRICING.ninetyDay;
}

/**
 * Get the appropriate individual CCI product ID.
 */
export function getIndividualCCIProductId(isPaid: boolean): ProductId {
  return isPaid ? PRODUCT_IDS.CCI_90_PRO : PRODUCT_IDS.CCI_90;
}

/**
 * Format CCI price for display with discount badge info.
 */
export function formatCCIPriceWithDiscount(
  isPaid: boolean
): { price: number; discount?: { amount: number; label: string } } {
  if (isPaid) {
    return {
      price: CCI_PRICING.sixtyDay,
      discount: {
        amount: CCI_PRICING.ninetyDay - CCI_PRICING.sixtyDay,
        label: 'PRO DISCOUNT',
      },
    };
  }
  return { price: CCI_PRICING.ninetyDay };
}
