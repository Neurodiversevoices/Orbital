/**
 * Stripe Price ID Mapping
 *
 * Maps all purchasable SKUs to Stripe Price IDs for test and live modes.
 *
 * SETUP REQUIRED:
 * 1. Create products in Stripe Dashboard (or via API)
 * 2. Create prices for each product (monthly/annual/one-time)
 * 3. Copy the price IDs here
 *
 * Price ID format: price_XXXXXXXXXXXXXXXXXXXXXXXXXX
 */

import { PRODUCT_IDS, type ProductId } from '../subscription/pricing';
import { getPaymentMode } from './paymentMode';

// =============================================================================
// STRIPE PRICE ID CONFIGURATION
// =============================================================================

/**
 * Stripe Price IDs for TEST mode
 * Replace with your actual test price IDs from Stripe Dashboard
 */
const STRIPE_PRICE_IDS_TEST: Record<string, string> = {
  // Pro Subscription
  [PRODUCT_IDS.PRO_MONTHLY]: 'price_test_pro_monthly',
  [PRODUCT_IDS.PRO_ANNUAL]: 'price_test_pro_annual',

  // Family Add-on
  [PRODUCT_IDS.FAMILY_MONTHLY]: 'price_test_family_monthly',
  [PRODUCT_IDS.FAMILY_ANNUAL]: 'price_test_family_annual',

  // Family Extra Seat
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY]: 'price_test_family_extra_seat_monthly',
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL]: 'price_test_family_extra_seat_annual',

  // Circle
  [PRODUCT_IDS.CIRCLE_MONTHLY]: 'price_test_circle_monthly',
  [PRODUCT_IDS.CIRCLE_ANNUAL]: 'price_test_circle_annual',

  // Bundles (Annual-only)
  [PRODUCT_IDS.BUNDLE_10_ANNUAL]: 'price_test_bundle_10_annual',
  [PRODUCT_IDS.BUNDLE_15_ANNUAL]: 'price_test_bundle_15_annual',
  [PRODUCT_IDS.BUNDLE_20_ANNUAL]: 'price_test_bundle_20_annual',

  // Admin Add-on
  [PRODUCT_IDS.ADMIN_ADDON_MONTHLY]: 'price_test_admin_addon_monthly',
  [PRODUCT_IDS.ADMIN_ADDON_ANNUAL]: 'price_test_admin_addon_annual',

  // CCI Individual (one-time)
  [PRODUCT_IDS.CCI_FREE]: 'price_test_cci_free_199',
  [PRODUCT_IDS.CCI_PRO]: 'price_test_cci_pro_149',

  // CCI Group (one-time)
  [PRODUCT_IDS.CCI_CIRCLE_ALL]: 'price_test_cci_circle_399',
  [PRODUCT_IDS.CCI_BUNDLE_ALL]: 'price_test_cci_bundle_999',

  // QCR Products (one-time)
  [PRODUCT_IDS.QCR_INDIVIDUAL]: 'price_test_qcr_individual_149',
  [PRODUCT_IDS.QCR_CIRCLE]: 'price_test_qcr_circle_299',
  [PRODUCT_IDS.QCR_BUNDLE]: 'price_test_qcr_bundle_499',
};

/**
 * Stripe Price IDs for LIVE mode
 * Replace with your actual live price IDs from Stripe Dashboard
 */
const STRIPE_PRICE_IDS_LIVE: Record<string, string> = {
  // Pro Subscription
  [PRODUCT_IDS.PRO_MONTHLY]: 'price_live_pro_monthly',
  [PRODUCT_IDS.PRO_ANNUAL]: 'price_live_pro_annual',

  // Family Add-on
  [PRODUCT_IDS.FAMILY_MONTHLY]: 'price_live_family_monthly',
  [PRODUCT_IDS.FAMILY_ANNUAL]: 'price_live_family_annual',

  // Family Extra Seat
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY]: 'price_live_family_extra_seat_monthly',
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL]: 'price_live_family_extra_seat_annual',

  // Circle
  [PRODUCT_IDS.CIRCLE_MONTHLY]: 'price_live_circle_monthly',
  [PRODUCT_IDS.CIRCLE_ANNUAL]: 'price_live_circle_annual',

  // Bundles (Annual-only)
  [PRODUCT_IDS.BUNDLE_10_ANNUAL]: 'price_live_bundle_10_annual',
  [PRODUCT_IDS.BUNDLE_15_ANNUAL]: 'price_live_bundle_15_annual',
  [PRODUCT_IDS.BUNDLE_20_ANNUAL]: 'price_live_bundle_20_annual',

  // Admin Add-on
  [PRODUCT_IDS.ADMIN_ADDON_MONTHLY]: 'price_live_admin_addon_monthly',
  [PRODUCT_IDS.ADMIN_ADDON_ANNUAL]: 'price_live_admin_addon_annual',

  // CCI Individual (one-time)
  [PRODUCT_IDS.CCI_FREE]: 'price_live_cci_free_199',
  [PRODUCT_IDS.CCI_PRO]: 'price_live_cci_pro_149',

  // CCI Group (one-time)
  [PRODUCT_IDS.CCI_CIRCLE_ALL]: 'price_live_cci_circle_399',
  [PRODUCT_IDS.CCI_BUNDLE_ALL]: 'price_live_cci_bundle_999',

  // QCR Products (one-time)
  [PRODUCT_IDS.QCR_INDIVIDUAL]: 'price_live_qcr_individual_149',
  [PRODUCT_IDS.QCR_CIRCLE]: 'price_live_qcr_circle_299',
  [PRODUCT_IDS.QCR_BUNDLE]: 'price_live_qcr_bundle_499',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Stripe Price ID for a product
 * Returns null if in demo mode or product not found
 */
export function getStripePriceId(productId: ProductId): string | null {
  const mode = getPaymentMode();

  if (mode === 'demo') {
    return null;
  }

  const priceIds = mode === 'live' ? STRIPE_PRICE_IDS_LIVE : STRIPE_PRICE_IDS_TEST;
  return priceIds[productId] || null;
}

/**
 * Check if a product has a configured Stripe price
 */
export function hasStripePriceId(productId: ProductId): boolean {
  return getStripePriceId(productId) !== null;
}

/**
 * Get all configured Stripe price IDs for current mode
 */
export function getAllStripePriceIds(): Record<string, string> {
  const mode = getPaymentMode();
  if (mode === 'demo') {
    return {};
  }
  return mode === 'live' ? STRIPE_PRICE_IDS_LIVE : STRIPE_PRICE_IDS_TEST;
}

/**
 * Billing mode for Stripe Checkout
 */
export type StripeBillingMode = 'subscription' | 'payment';

/**
 * Get billing mode for a product (subscription vs one-time payment)
 */
export function getStripeBillingMode(productId: ProductId): StripeBillingMode {
  // One-time products
  const oneTimeProducts: ProductId[] = [
    PRODUCT_IDS.CCI_FREE,
    PRODUCT_IDS.CCI_PRO,
    PRODUCT_IDS.CCI_CIRCLE_ALL,
    PRODUCT_IDS.CCI_BUNDLE_ALL,
    PRODUCT_IDS.QCR_INDIVIDUAL,
    PRODUCT_IDS.QCR_CIRCLE,
    PRODUCT_IDS.QCR_BUNDLE,
  ];

  return oneTimeProducts.includes(productId) ? 'payment' : 'subscription';
}

/**
 * Product metadata for Stripe session
 */
export interface StripeProductMetadata {
  productId: ProductId;
  entitlementId: string;
  scope?: 'individual' | 'circle' | 'bundle';
  circleId?: string;
  bundleId?: string;
}

/**
 * Get entitlement ID for a product
 * Used to grant entitlements after successful checkout
 */
export function getEntitlementForProduct(productId: ProductId): string {
  const entitlementMap: Record<string, string> = {
    // Pro
    [PRODUCT_IDS.PRO_MONTHLY]: 'pro_access',
    [PRODUCT_IDS.PRO_ANNUAL]: 'pro_access',

    // Family
    [PRODUCT_IDS.FAMILY_MONTHLY]: 'family_access',
    [PRODUCT_IDS.FAMILY_ANNUAL]: 'family_access',
    [PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY]: 'family_extra_seat',
    [PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL]: 'family_extra_seat',

    // Circle
    [PRODUCT_IDS.CIRCLE_MONTHLY]: 'circle_access',
    [PRODUCT_IDS.CIRCLE_ANNUAL]: 'circle_access',

    // Bundles
    [PRODUCT_IDS.BUNDLE_10_ANNUAL]: 'bundle_10_access',
    [PRODUCT_IDS.BUNDLE_15_ANNUAL]: 'bundle_15_access',
    [PRODUCT_IDS.BUNDLE_20_ANNUAL]: 'bundle_20_access',

    // Admin
    [PRODUCT_IDS.ADMIN_ADDON_MONTHLY]: 'admin_addon',
    [PRODUCT_IDS.ADMIN_ADDON_ANNUAL]: 'admin_addon',

    // CCI
    [PRODUCT_IDS.CCI_FREE]: 'cci_purchased',
    [PRODUCT_IDS.CCI_PRO]: 'cci_purchased',
    [PRODUCT_IDS.CCI_CIRCLE_ALL]: 'cci_circle_purchased',
    [PRODUCT_IDS.CCI_BUNDLE_ALL]: 'cci_bundle_purchased',

    // QCR
    [PRODUCT_IDS.QCR_INDIVIDUAL]: 'qcr_individual',
    [PRODUCT_IDS.QCR_CIRCLE]: 'qcr_circle',
    [PRODUCT_IDS.QCR_BUNDLE]: 'qcr_bundle',
  };

  return entitlementMap[productId] || 'unknown';
}
