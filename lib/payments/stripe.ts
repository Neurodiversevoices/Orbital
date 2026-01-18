/**
 * Stripe Integration for Web Payments
 *
 * SECURITY MODEL:
 * - Entitlements are ONLY granted server-side after Stripe confirms payment
 * - Client NEVER grants entitlements directly
 * - Uses Stripe Checkout for PCI-compliant payment collection
 *
 * PRICE ID CONFIGURATION:
 * - Read from env vars (preferred for production)
 * - Fall back to placeholder values (dev convenience only)
 * - BLOCKS checkout if placeholder IDs detected in production
 *
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

/**
 * Check if we're in production (live Stripe key)
 */
export function isProductionStripe(): boolean {
  return STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_');
}

// =============================================================================
// STRIPE PRICE ID CONFIGURATION
// =============================================================================

/**
 * REQUIRED ENV VARS for production deployment:
 *
 * Subscriptions (recurring):
 * - STRIPE_PRICE_PRO_MONTHLY
 * - STRIPE_PRICE_PRO_ANNUAL
 * - STRIPE_PRICE_FAMILY_MONTHLY
 * - STRIPE_PRICE_FAMILY_ANNUAL
 * - STRIPE_PRICE_FAMILY_EXTRA_SEAT_MONTHLY
 * - STRIPE_PRICE_FAMILY_EXTRA_SEAT_ANNUAL
 * - STRIPE_PRICE_CIRCLE_MONTHLY
 * - STRIPE_PRICE_CIRCLE_ANNUAL
 * - STRIPE_PRICE_BUNDLE_10_ANNUAL
 * - STRIPE_PRICE_BUNDLE_15_ANNUAL
 * - STRIPE_PRICE_BUNDLE_20_ANNUAL
 * - STRIPE_PRICE_ADMIN_ADDON_MONTHLY
 * - STRIPE_PRICE_ADMIN_ADDON_ANNUAL
 *
 * One-time (CCI artifacts):
 * - STRIPE_PRICE_CCI_FREE
 * - STRIPE_PRICE_CCI_PRO
 * - STRIPE_PRICE_CCI_CIRCLE
 * - STRIPE_PRICE_CCI_BUNDLE
 */

// Placeholder prefix for detection
const PLACEHOLDER_PREFIX = 'price_' as const;
const PLACEHOLDER_SUFFIX = '_test' as const;

/**
 * Helper to get price ID from env with fallback
 */
function getPriceId(envVar: string, fallback: string): string {
  return process.env[envVar] || fallback;
}

/**
 * Check if a price ID is a placeholder (not a real Stripe ID)
 * Real Stripe price IDs look like: price_1ABC123...
 */
export function isPlaceholderPriceId(priceId: string): boolean {
  // Placeholder format: price_*_test
  if (priceId.endsWith(PLACEHOLDER_SUFFIX)) {
    return true;
  }
  // Real Stripe IDs are longer and contain alphanumeric after price_
  // e.g., price_1OxyzABC123def456
  if (priceId.startsWith('price_') && priceId.length < 20) {
    return true;
  }
  // Legacy/disabled marker
  if (priceId === 'LEGACY_NOT_PURCHASABLE') {
    return true;
  }
  return false;
}

/**
 * Mapping from Orbital product IDs to Stripe Price IDs
 *
 * Configuration priority:
 * 1. Environment variable (production)
 * 2. Fallback placeholder (development only)
 *
 * To configure for production:
 * 1. Go to Products in Stripe Dashboard
 * 2. Create products for each tier
 * 3. Add monthly/annual prices
 * 4. Copy the price IDs to your .env file
 */
export const STRIPE_PRICE_IDS: Record<ProductId, string> = {
  // =========================================================================
  // ACTIVE PRODUCTS — Configure these env vars for production
  // =========================================================================

  // Pro Subscription
  [PRODUCT_IDS.PRO_MONTHLY]: getPriceId('STRIPE_PRICE_PRO_MONTHLY', 'price_pro_monthly_test'),
  [PRODUCT_IDS.PRO_ANNUAL]: getPriceId('STRIPE_PRICE_PRO_ANNUAL', 'price_pro_annual_test'),

  // Family Add-on (requires Pro)
  [PRODUCT_IDS.FAMILY_MONTHLY]: getPriceId('STRIPE_PRICE_FAMILY_MONTHLY', 'price_family_monthly_test'),
  [PRODUCT_IDS.FAMILY_ANNUAL]: getPriceId('STRIPE_PRICE_FAMILY_ANNUAL', 'price_family_annual_test'),

  // Family Extra Seat
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY]: getPriceId('STRIPE_PRICE_FAMILY_EXTRA_SEAT_MONTHLY', 'price_family_seat_monthly_test'),
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL]: getPriceId('STRIPE_PRICE_FAMILY_EXTRA_SEAT_ANNUAL', 'price_family_seat_annual_test'),

  // Circle (requires Pro)
  [PRODUCT_IDS.CIRCLE_MONTHLY]: getPriceId('STRIPE_PRICE_CIRCLE_MONTHLY', 'price_circle_monthly_test'),
  [PRODUCT_IDS.CIRCLE_ANNUAL]: getPriceId('STRIPE_PRICE_CIRCLE_ANNUAL', 'price_circle_annual_test'),

  // Bundle (annual only, includes Pro)
  [PRODUCT_IDS.BUNDLE_10_ANNUAL]: getPriceId('STRIPE_PRICE_BUNDLE_10_ANNUAL', 'price_bundle_10_annual_test'),
  [PRODUCT_IDS.BUNDLE_15_ANNUAL]: getPriceId('STRIPE_PRICE_BUNDLE_15_ANNUAL', 'price_bundle_15_annual_test'),
  [PRODUCT_IDS.BUNDLE_20_ANNUAL]: getPriceId('STRIPE_PRICE_BUNDLE_20_ANNUAL', 'price_bundle_20_annual_test'),

  // Admin Add-on (requires Circle or Bundle)
  [PRODUCT_IDS.ADMIN_ADDON_MONTHLY]: getPriceId('STRIPE_PRICE_ADMIN_ADDON_MONTHLY', 'price_admin_monthly_test'),
  [PRODUCT_IDS.ADMIN_ADDON_ANNUAL]: getPriceId('STRIPE_PRICE_ADMIN_ADDON_ANNUAL', 'price_admin_annual_test'),

  // CCI Artifact Purchases (one-time)
  [PRODUCT_IDS.CCI_FREE]: getPriceId('STRIPE_PRICE_CCI_FREE', 'price_cci_free_test'),           // $199 for free users
  [PRODUCT_IDS.CCI_PRO]: getPriceId('STRIPE_PRICE_CCI_PRO', 'price_cci_pro_test'),             // $149 for Pro users
  [PRODUCT_IDS.CCI_CIRCLE_ALL]: getPriceId('STRIPE_PRICE_CCI_CIRCLE', 'price_cci_circle_test'),   // $399 for Circle
  [PRODUCT_IDS.CCI_BUNDLE_ALL]: getPriceId('STRIPE_PRICE_CCI_BUNDLE', 'price_cci_bundle_test'),   // $999 for Bundle

  // =========================================================================
  // LEGACY PRODUCTS — Not purchasable, kept for type compatibility
  // =========================================================================
  [PRODUCT_IDS.INDIVIDUAL_MONTHLY]: 'LEGACY_NOT_PURCHASABLE',
  [PRODUCT_IDS.INDIVIDUAL_ANNUAL]: 'LEGACY_NOT_PURCHASABLE',
  [PRODUCT_IDS.BUNDLE_10_MONTHLY]: 'LEGACY_NOT_PURCHASABLE',
  [PRODUCT_IDS.BUNDLE_25_MONTHLY]: 'LEGACY_NOT_PURCHASABLE',
  [PRODUCT_IDS.BUNDLE_25_ANNUAL]: 'LEGACY_NOT_PURCHASABLE',
  [PRODUCT_IDS.QCR_INDIVIDUAL]: 'LEGACY_NOT_PURCHASABLE',
  [PRODUCT_IDS.QCR_CIRCLE]: 'LEGACY_NOT_PURCHASABLE',
  [PRODUCT_IDS.QCR_BUNDLE]: 'LEGACY_NOT_PURCHASABLE',
};

// =============================================================================
// PRICE VALIDATION GUARD
// =============================================================================

/**
 * Validate that a product can be purchased with real Stripe price ID
 *
 * BLOCKS checkout if:
 * - Price ID is a placeholder AND we're in production
 * - Price ID is marked as legacy/not purchasable
 *
 * Returns error message if invalid, null if valid
 */
export function validatePriceId(productId: ProductId): string | null {
  const priceId = STRIPE_PRICE_IDS[productId];

  // Block legacy products
  if (priceId === 'LEGACY_NOT_PURCHASABLE') {
    return `Product "${productId}" is no longer available for purchase.`;
  }

  // Block placeholder IDs in production
  if (isProductionStripe() && isPlaceholderPriceId(priceId)) {
    return `Payment configuration error: Price ID for "${productId}" is not configured. Contact support.`;
  }

  return null; // Valid
}

/**
 * Get all missing price configurations (for deployment checks)
 */
export function getMissingPriceConfigs(): string[] {
  const missing: string[] = [];

  // Only check active products
  const activeProducts = [
    PRODUCT_IDS.PRO_MONTHLY,
    PRODUCT_IDS.PRO_ANNUAL,
    PRODUCT_IDS.FAMILY_MONTHLY,
    PRODUCT_IDS.FAMILY_ANNUAL,
    PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY,
    PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL,
    PRODUCT_IDS.CIRCLE_MONTHLY,
    PRODUCT_IDS.CIRCLE_ANNUAL,
    PRODUCT_IDS.BUNDLE_10_ANNUAL,
    PRODUCT_IDS.BUNDLE_15_ANNUAL,
    PRODUCT_IDS.BUNDLE_20_ANNUAL,
    PRODUCT_IDS.ADMIN_ADDON_MONTHLY,
    PRODUCT_IDS.ADMIN_ADDON_ANNUAL,
    PRODUCT_IDS.CCI_FREE,
    PRODUCT_IDS.CCI_PRO,
    PRODUCT_IDS.CCI_CIRCLE_ALL,
    PRODUCT_IDS.CCI_BUNDLE_ALL,
  ];

  for (const productId of activeProducts) {
    const priceId = STRIPE_PRICE_IDS[productId];
    if (isPlaceholderPriceId(priceId)) {
      missing.push(productId);
    }
  }

  return missing;
}

// =============================================================================
// ENTITLEMENT MAPPING
// =============================================================================

/**
 * Maps product IDs to the entitlement they grant
 */
export const PRODUCT_ENTITLEMENTS: Record<ProductId, string> = {
  // Active products
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

  // Legacy products (no entitlement)
  [PRODUCT_IDS.INDIVIDUAL_MONTHLY]: 'legacy_not_supported',
  [PRODUCT_IDS.INDIVIDUAL_ANNUAL]: 'legacy_not_supported',
  [PRODUCT_IDS.BUNDLE_10_MONTHLY]: 'legacy_not_supported',
  [PRODUCT_IDS.BUNDLE_25_MONTHLY]: 'legacy_not_supported',
  [PRODUCT_IDS.BUNDLE_25_ANNUAL]: 'legacy_not_supported',
  [PRODUCT_IDS.QCR_INDIVIDUAL]: 'legacy_not_supported',
  [PRODUCT_IDS.QCR_CIRCLE]: 'legacy_not_supported',
  [PRODUCT_IDS.QCR_BUNDLE]: 'legacy_not_supported',
};

// =============================================================================
// CHECKOUT SESSION TYPES
// =============================================================================

/**
 * CCI purchase metadata for tracking and duplicate prevention
 */
export interface CCIPurchaseMetadata {
  /** Type of CCI purchase: individual (single person) or group (circle/bundle) */
  purchase_type: 'individual' | 'group';
  /** Scope of the CCI: individual, circle, or bundle */
  scope: 'individual' | 'circle' | 'bundle';
  /** Number of seats (for group CCI) */
  seats?: number;
  /** Group ID (for group CCI duplicate prevention) */
  group_id?: string;
}

export interface CheckoutSessionRequest {
  productId: ProductId;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  /** Optional CCI-specific metadata */
  cciMetadata?: CCIPurchaseMetadata;
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
 *
 * VALIDATION: Blocks checkout if price ID is invalid/placeholder in production
 */
export async function initiateStripeCheckout(
  productId: ProductId,
  userId: string,
  cciMetadata?: CCIPurchaseMetadata
): Promise<{ checkoutUrl: string } | { error: string }> {
  // Check Stripe is configured
  if (!isStripeConfigured()) {
    return { error: 'Stripe is not configured. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.' };
  }

  // VALIDATION GUARD: Block invalid price IDs
  const validationError = validatePriceId(productId);
  if (validationError) {
    console.error('[Stripe] Checkout blocked:', validationError);
    return { error: validationError };
  }

  const successUrl = `${window.location.origin}/upgrade?session_id={CHECKOUT_SESSION_ID}&status=success`;
  const cancelUrl = `${window.location.origin}/upgrade?status=cancelled`;

  try {
    const request: CheckoutSessionRequest = {
      productId,
      userId,
      successUrl,
      cancelUrl,
      ...(cciMetadata && { cciMetadata }),
    };

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
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

// =============================================================================
// CUSTOMER PORTAL TYPES AND FUNCTIONS
// =============================================================================

export interface CustomerPortalRequest {
  userId: string;
  returnUrl: string;
}

export interface CustomerPortalResponse {
  success: boolean;
  portalUrl?: string;
  error?: string;
}

/**
 * Create a Stripe Customer Portal session for subscription management
 *
 * Allows users to:
 * - View and update payment methods
 * - View invoice history
 * - Cancel subscription (at period end)
 */
export async function createCustomerPortalSession(
  userId: string
): Promise<{ portalUrl: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: 'Stripe is not configured.' };
  }

  const returnUrl = `${window.location.origin}/upgrade`;

  try {
    const response = await fetch('/api/customer-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        returnUrl,
      } satisfies CustomerPortalRequest),
    });

    const data: CustomerPortalResponse = await response.json();

    if (!data.success || !data.portalUrl) {
      return { error: data.error || 'Failed to create portal session' };
    }

    return { portalUrl: data.portalUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Redirect to Stripe Customer Portal
 */
export function redirectToCustomerPortal(portalUrl: string): void {
  if (Platform.OS === 'web') {
    window.location.href = portalUrl;
  }
}

// =============================================================================
// ENV VAR DOCUMENTATION (for deployment scripts)
// =============================================================================

/**
 * Required environment variables for Stripe integration:
 *
 * Client-side (EXPO_PUBLIC_ prefix):
 * - EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: Stripe publishable key (pk_test_ or pk_live_)
 *
 * Server-side:
 * - STRIPE_SECRET_KEY: Stripe secret key (sk_test_ or sk_live_)
 *
 * Price IDs (set these in Stripe Dashboard → Products):
 * - STRIPE_PRICE_PRO_MONTHLY
 * - STRIPE_PRICE_PRO_ANNUAL
 * - STRIPE_PRICE_FAMILY_MONTHLY
 * - STRIPE_PRICE_FAMILY_ANNUAL
 * - STRIPE_PRICE_FAMILY_EXTRA_SEAT_MONTHLY
 * - STRIPE_PRICE_FAMILY_EXTRA_SEAT_ANNUAL
 * - STRIPE_PRICE_CIRCLE_MONTHLY
 * - STRIPE_PRICE_CIRCLE_ANNUAL
 * - STRIPE_PRICE_BUNDLE_10_ANNUAL
 * - STRIPE_PRICE_BUNDLE_15_ANNUAL
 * - STRIPE_PRICE_BUNDLE_20_ANNUAL
 * - STRIPE_PRICE_ADMIN_ADDON_MONTHLY
 * - STRIPE_PRICE_ADMIN_ADDON_ANNUAL
 * - STRIPE_PRICE_CCI_FREE
 * - STRIPE_PRICE_CCI_PRO
 * - STRIPE_PRICE_CCI_CIRCLE
 * - STRIPE_PRICE_CCI_BUNDLE
 */
export const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_PRO_ANNUAL',
  'STRIPE_PRICE_FAMILY_MONTHLY',
  'STRIPE_PRICE_FAMILY_ANNUAL',
  'STRIPE_PRICE_FAMILY_EXTRA_SEAT_MONTHLY',
  'STRIPE_PRICE_FAMILY_EXTRA_SEAT_ANNUAL',
  'STRIPE_PRICE_CIRCLE_MONTHLY',
  'STRIPE_PRICE_CIRCLE_ANNUAL',
  'STRIPE_PRICE_BUNDLE_10_ANNUAL',
  'STRIPE_PRICE_BUNDLE_15_ANNUAL',
  'STRIPE_PRICE_BUNDLE_20_ANNUAL',
  'STRIPE_PRICE_ADMIN_ADDON_MONTHLY',
  'STRIPE_PRICE_ADMIN_ADDON_ANNUAL',
  'STRIPE_PRICE_CCI_FREE',
  'STRIPE_PRICE_CCI_PRO',
  'STRIPE_PRICE_CCI_CIRCLE',
  'STRIPE_PRICE_CCI_BUNDLE',
] as const;
