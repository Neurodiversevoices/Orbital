/**
 * Stripe Integration for Web Payments
 *
 * SECURITY MODEL:
 * - Entitlements are ONLY granted server-side after Stripe confirms payment
 * - Client NEVER grants entitlements directly
 * - Uses Stripe Checkout for PCI-compliant payment collection
 *
 * TEST MODE: Uses test API keys and test price IDs
 * Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in environment
 */

import { Platform } from 'react-native';
import { ProductId, PRODUCT_IDS } from '../subscription/pricing';

// =============================================================================
// STRIPE CONFIGURATION
// =============================================================================

/**
 * Stripe publishable key (public, safe for client)
 * Test mode key starts with pk_test_
 */
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return Platform.OS === 'web' && STRIPE_PUBLISHABLE_KEY.length > 0;
}

// =============================================================================
// STRIPE PRICE IDS (TEST MODE)
// =============================================================================

/**
 * Mapping from Orbital product IDs to Stripe Price IDs
 *
 * IMPORTANT: Replace these with your actual Stripe Price IDs from dashboard
 * Test mode prices start with price_test_ (or just price_ in test mode)
 *
 * To create prices in Stripe:
 * 1. Go to Products in Stripe Dashboard
 * 2. Create products for each tier
 * 3. Add monthly/annual prices
 * 4. Copy the price IDs here
 */
export const STRIPE_PRICE_IDS: Record<ProductId, string> = {
  // Pro Subscription
  [PRODUCT_IDS.PRO_MONTHLY]: 'price_pro_monthly_test', // Replace with actual
  [PRODUCT_IDS.PRO_ANNUAL]: 'price_pro_annual_test',   // Replace with actual

  // Family Add-on (requires Pro)
  [PRODUCT_IDS.FAMILY_MONTHLY]: 'price_family_monthly_test',
  [PRODUCT_IDS.FAMILY_ANNUAL]: 'price_family_annual_test',

  // Family Extra Seat
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY]: 'price_family_seat_monthly_test',
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL]: 'price_family_seat_annual_test',

  // Circle (requires Pro)
  [PRODUCT_IDS.CIRCLE_MONTHLY]: 'price_circle_monthly_test',
  [PRODUCT_IDS.CIRCLE_ANNUAL]: 'price_circle_annual_test',

  // Bundle (annual only, includes Pro)
  [PRODUCT_IDS.BUNDLE_10_ANNUAL]: 'price_bundle_10_annual_test',
  [PRODUCT_IDS.BUNDLE_15_ANNUAL]: 'price_bundle_15_annual_test',
  [PRODUCT_IDS.BUNDLE_20_ANNUAL]: 'price_bundle_20_annual_test',

  // Admin Add-on (requires Circle or Bundle)
  [PRODUCT_IDS.ADMIN_ADDON_MONTHLY]: 'price_admin_monthly_test',
  [PRODUCT_IDS.ADMIN_ADDON_ANNUAL]: 'price_admin_annual_test',

  // CCI Artifact Purchases (one-time)
  [PRODUCT_IDS.CCI_FREE]: 'price_cci_free_test',           // $199 for free users
  [PRODUCT_IDS.CCI_PRO]: 'price_cci_pro_test',             // $149 for Pro users
  [PRODUCT_IDS.CCI_CIRCLE_ALL]: 'price_cci_circle_test',   // $399 for Circle
  [PRODUCT_IDS.CCI_BUNDLE_ALL]: 'price_cci_bundle_test',   // $999 for Bundle
};

// =============================================================================
// ENTITLEMENT MAPPING
// =============================================================================

/**
 * Maps product IDs to the entitlement they grant
 */
export const PRODUCT_ENTITLEMENTS: Record<ProductId, string> = {
  [PRODUCT_IDS.PRO_MONTHLY]: 'pro_access',
  [PRODUCT_IDS.PRO_ANNUAL]: 'pro_access',
  [PRODUCT_IDS.FAMILY_MONTHLY]: 'family_access',
  [PRODUCT_IDS.FAMILY_ANNUAL]: 'family_access',
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY]: 'family_extra_seat',
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL]: 'family_extra_seat',
  [PRODUCT_IDS.CIRCLE_MONTHLY]: 'circle_access',
  [PRODUCT_IDS.CIRCLE_ANNUAL]: 'circle_access',
  [PRODUCT_IDS.BUNDLE_10_ANNUAL]: 'bundle_10_access',
  [PRODUCT_IDS.BUNDLE_15_ANNUAL]: 'bundle_15_access',
  [PRODUCT_IDS.BUNDLE_20_ANNUAL]: 'bundle_20_access',
  [PRODUCT_IDS.ADMIN_ADDON_MONTHLY]: 'admin_addon',
  [PRODUCT_IDS.ADMIN_ADDON_ANNUAL]: 'admin_addon',
  [PRODUCT_IDS.CCI_FREE]: 'cci_purchased',
  [PRODUCT_IDS.CCI_PRO]: 'cci_purchased',
  [PRODUCT_IDS.CCI_CIRCLE_ALL]: 'cci_circle_purchased',
  [PRODUCT_IDS.CCI_BUNDLE_ALL]: 'cci_bundle_purchased',
};

// =============================================================================
// CHECKOUT SESSION TYPES
// =============================================================================

export interface CheckoutSessionRequest {
  productId: ProductId;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
}

export interface VerifySessionRequest {
  sessionId: string;
}

export interface VerifySessionResponse {
  success: boolean;
  paymentStatus: 'paid' | 'unpaid' | 'no_payment_required';
  entitlementGranted?: string;
  error?: string;
}

// =============================================================================
// CLIENT-SIDE CHECKOUT FUNCTIONS
// =============================================================================

/**
 * Create a Stripe Checkout session and redirect to payment
 *
 * This calls our API route which creates the session server-side,
 * then redirects the user to Stripe's hosted checkout page.
 */
export async function initiateStripeCheckout(
  productId: ProductId,
  userId: string
): Promise<{ checkoutUrl: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: 'Stripe is not configured. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.' };
  }

  const successUrl = `${window.location.origin}/upgrade?session_id={CHECKOUT_SESSION_ID}&status=success`;
  const cancelUrl = `${window.location.origin}/upgrade?status=cancelled`;

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        userId,
        successUrl,
        cancelUrl,
      } satisfies CheckoutSessionRequest),
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to create checkout session' };
    }

    const data: CheckoutSessionResponse = await response.json();
    return { checkoutUrl: data.checkoutUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Verify a completed checkout session and grant entitlement
 *
 * Called after user returns from Stripe Checkout with session_id.
 * Only grants entitlement if Stripe confirms payment was successful.
 */
export async function verifyStripeSession(
  sessionId: string
): Promise<VerifySessionResponse> {
  try {
    const response = await fetch('/api/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId } satisfies VerifySessionRequest),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      paymentStatus: 'unpaid',
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Redirect to Stripe Checkout
 */
export function redirectToStripeCheckout(checkoutUrl: string): void {
  if (Platform.OS === 'web') {
    window.location.href = checkoutUrl;
  }
}
