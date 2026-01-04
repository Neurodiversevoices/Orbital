/**
 * Orbital Subscription Types
 *
 * Single entitlement: individual_pro
 * - $9/month beta pricing
 * - Unlocks: unlimited signals + full pattern history
 *
 * IMPORTANT:
 * - Org modes (employer, school_district, university, healthcare) bypass all subscription checks
 * - Personal/caregiver/demo modes respect subscription gating
 */

// RevenueCat entitlement identifier
export const ENTITLEMENT_ID = 'individual_pro';

// RevenueCat product identifiers (set up in RevenueCat dashboard)
export const PRODUCT_ID_MONTHLY = 'orbital_pro_monthly_beta';

// Free tier limits
export const FREE_TIER_LIMITS = {
  /** Maximum signals per month for free users */
  maxSignalsPerMonth: 30,
  /** Maximum pattern history days for free users */
  maxPatternHistoryDays: 7,
};

// Subscription status
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
