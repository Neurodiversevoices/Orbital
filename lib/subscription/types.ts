/**
 * Orbital Subscription Types
 *
 * CANONICAL B2C PRICING — see lib/subscription/pricing.ts for source of truth
 *
 * PRO: $29/mo | $290/yr
 * FAMILY: $79/mo | $790/yr (includes 5 members) + $9/mo | $90/yr per additional
 * CIRCLES: $79/mo | $790/yr (up to 5 Pro users)
 * PRO BUNDLES: ANNUAL-ONLY (10=$2,700, 15=$4,000, 20=$5,200)
 * ADMIN ADD-ON: $29/mo | $290/yr
 * CCI-Q4: $199 (Free) | $149 (Pro/Family/Circle)
 *
 * IMPORTANT:
 * - Org modes (employer, school_district, university, healthcare) bypass all subscription checks
 * - Personal/caregiver/demo modes respect subscription gating
 * - UI should use "Starter" instead of "Free" for the limited tier
 */

import { ENTITLEMENTS, PRODUCT_IDS, STARTER_TIER } from './pricing';

// Primary entitlement for Pro tier (backwards compatible)
export const ENTITLEMENT_ID = ENTITLEMENTS.PRO;

// RevenueCat product identifiers — canonical IDs
export const PRODUCT_ID_MONTHLY = PRODUCT_IDS.PRO_MONTHLY;
export const PRODUCT_ID_ANNUAL = PRODUCT_IDS.PRO_ANNUAL;

// Starter tier limits (for display, not gating logic)
export const STARTER_TIER_LIMITS = STARTER_TIER.limits;

// Legacy export for backwards compatibility
export const FREE_TIER_LIMITS = STARTER_TIER_LIMITS;

// Subscription status - keeping backwards compatible types
export type SubscriptionStatus = 'free' | 'pro' | 'loading' | 'error';

export interface SubscriptionState {
  status: SubscriptionStatus;
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  /** Whether RevenueCat is available */
  isAvailable: boolean;
  /** Expiration date if subscribed */
  expirationDate: Date | null;
  /** Whether user is in trial */
  isInTrial: boolean;
}

export const DEFAULT_SUBSCRIPTION_STATE: SubscriptionState = {
  status: 'free',
  isPro: false,
  isLoading: true,
  error: null,
  isAvailable: false,
  expirationDate: null,
  isInTrial: false,
};

// Modes that bypass subscription checks entirely
export const SUBSCRIPTION_BYPASS_MODES = [
  'employer',
  'school_district',
  'university',
  'healthcare',
] as const;

export type SubscriptionBypassMode = typeof SUBSCRIPTION_BYPASS_MODES[number];

/**
 * Check if a mode bypasses subscription requirements
 */
export function shouldBypassSubscription(mode: string): boolean {
  return (SUBSCRIPTION_BYPASS_MODES as readonly string[]).includes(mode);
}
