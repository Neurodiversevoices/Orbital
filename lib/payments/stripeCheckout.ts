/**
 * Stripe Checkout Client
 *
 * Client-side service for initiating Stripe Checkout sessions.
 * Handles both subscription and one-time payment flows.
 */

import { Platform } from 'react-native';
import { PRODUCT_IDS, type ProductId } from '../subscription/pricing';
import {
  getPaymentMode,
  isDemoMode,
  shouldUseStripe,
  getApiBaseUrl,
  DEMO_MODE_BANNER,
} from './paymentMode';
import {
  getUserId,
  syncEntitlements,
  addCachedEntitlement,
} from '../entitlements/serverEntitlements';
import { getEntitlementForProduct } from './stripePriceIds';
import { getAccessToken } from '../auth';

// =============================================================================
// TYPES
// =============================================================================

export interface CheckoutResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  entitlement?: string;
  isDemo?: boolean;
  error?: string;
}

export interface CheckoutOptions {
  productId: ProductId;
  circleId?: string;
  bundleId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

// =============================================================================
// DEMO MODE CHECKOUT
// =============================================================================

/**
 * Simulate checkout in demo mode
 * Grants ephemeral entitlements (AsyncStorage only)
 */
async function executeDemoCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  const { productId } = options;

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Get entitlement ID for this product
  const entitlementId = getEntitlementForProduct(productId);

  // Handle bundled upgrades: Family/Circle grant Pro automatically
  if (entitlementId === 'family_access' || entitlementId === 'circle_access') {
    await addCachedEntitlement('pro_access');
  }

  // Grant the entitlement locally (demo mode - ephemeral)
  await addCachedEntitlement(entitlementId);

  return {
    success: true,
    entitlement: entitlementId,
    isDemo: true,
  };
}

// =============================================================================
// STRIPE CHECKOUT
// =============================================================================

/**
 * Create Stripe Checkout Session and redirect
 */
async function executeStripeCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  const { productId, circleId, bundleId, successUrl, cancelUrl } = options;

  // Get auth token for API authentication
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required. Please sign in.');
  }

  const baseUrl = getApiBaseUrl();

  // Call server to create checkout session
  const response = await fetch(`${baseUrl}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      productId,
      circleId,
      bundleId,
      successUrl,
      cancelUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Checkout failed: ${response.status}`);
  }

  const { sessionId, url } = await response.json();

  if (!url) {
    throw new Error('No checkout URL returned');
  }

  // On web, redirect to Stripe Checkout
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = url;
  }

  return {
    success: true,
    sessionId,
    url,
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Execute a purchase
 *
 * In demo mode: Simulates success and grants ephemeral entitlements
 * In test/live mode: Creates Stripe Checkout Session and redirects
 */
export async function executePurchase(options: CheckoutOptions): Promise<CheckoutResult> {
  try {
    if (isDemoMode()) {
      return executeDemoCheckout(options);
    }

    if (shouldUseStripe()) {
      return executeStripeCheckout(options);
    }

    // Fallback - should not reach here
    throw new Error('Payment mode not configured');
  } catch (error) {
    console.error('[stripeCheckout] Purchase failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Purchase failed',
    };
  }
}

/**
 * Verify checkout session after return from Stripe
 * Call this on the success page to confirm payment and sync entitlements
 */
export async function verifyCheckoutSession(sessionId: string): Promise<CheckoutResult> {
  if (isDemoMode()) {
    return { success: true, isDemo: true };
  }

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(
      `${baseUrl}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Verification failed');
    }

    const data = await response.json();

    if (data.success) {
      // Sync entitlements from server
      await syncEntitlements();
    }

    return {
      success: data.success,
      entitlement: data.productId,
      error: data.error,
    };
  } catch (error) {
    console.error('[stripeCheckout] Verification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Check if checkout is available
 */
export function isCheckoutAvailable(): boolean {
  // Checkout is available in all modes
  // Demo mode simulates, test/live use Stripe
  return true;
}

/**
 * Get demo mode indicator for UI
 */
export function getDemoModeIndicator(): string | null {
  return isDemoMode() ? DEMO_MODE_BANNER : null;
}

/**
 * Restore purchases from server
 */
export async function restorePurchases(): Promise<boolean> {
  if (isDemoMode()) {
    // In demo mode, nothing to restore from server
    return false;
  }

  try {
    const entitlements = await syncEntitlements();
    return entitlements.length > 0;
  } catch (error) {
    console.error('[stripeCheckout] Restore failed:', error);
    return false;
  }
}
