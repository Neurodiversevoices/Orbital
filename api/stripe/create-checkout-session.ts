/**
 * Stripe Checkout Session API
 *
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session for the given product.
 * Returns the session URL for redirect.
 *
 * Request body:
 * {
 *   productId: string;      // Internal product ID (e.g., 'orbital_pro_annual')
 *   userId: string;         // User identifier for entitlement tracking
 *   circleId?: string;      // For Circle/Circle-CCI purchases
 *   bundleId?: string;      // For Bundle/Bundle-CCI purchases
 *   successUrl?: string;    // Override success redirect URL
 *   cancelUrl?: string;     // Override cancel redirect URL
 * }
 *
 * Response:
 * {
 *   sessionId: string;
 *   url: string;
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

// =============================================================================
// STRIPE CONFIGURATION
// =============================================================================

function getStripeSecretKey(): string {
  const mode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  if (mode === 'live') {
    return process.env.STRIPE_SECRET_KEY_LIVE || '';
  }
  return process.env.STRIPE_SECRET_KEY_TEST || '';
}

function getStripe(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
}

// =============================================================================
// PRICE ID MAPPING (duplicated for serverless - no shared imports)
// =============================================================================

const PRODUCT_IDS = {
  PRO_MONTHLY: 'orbital_pro_monthly',
  PRO_ANNUAL: 'orbital_pro_annual',
  FAMILY_MONTHLY: 'orbital_family_monthly',
  FAMILY_ANNUAL: 'orbital_family_annual',
  FAMILY_EXTRA_SEAT_MONTHLY: 'orbital_family_extra_seat_monthly',
  FAMILY_EXTRA_SEAT_ANNUAL: 'orbital_family_extra_seat_annual',
  CIRCLE_MONTHLY: 'orbital_circle_monthly',
  CIRCLE_ANNUAL: 'orbital_circle_annual',
  BUNDLE_10_ANNUAL: 'orbital_bundle_10_annual',
  BUNDLE_15_ANNUAL: 'orbital_bundle_15_annual',
  BUNDLE_20_ANNUAL: 'orbital_bundle_20_annual',
  ADMIN_ADDON_MONTHLY: 'orbital_admin_addon_monthly',
  ADMIN_ADDON_ANNUAL: 'orbital_admin_addon_annual',
  CCI_FREE: 'orbital_cci_free',
  CCI_PRO: 'orbital_cci_pro',
  CCI_CIRCLE_ALL: 'orbital_cci_circle_all',
  CCI_BUNDLE_ALL: 'orbital_cci_bundle_all',
  QCR_INDIVIDUAL: 'orbital_qcr_individual',
  QCR_CIRCLE: 'orbital_qcr_circle',
  QCR_BUNDLE: 'orbital_qcr_bundle',
} as const;

type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

function getStripePriceId(productId: string): string | null {
  const mode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  const isLive = mode === 'live';

  // In production, use environment variables for price IDs
  const envKey = `STRIPE_PRICE_${productId.toUpperCase()}${isLive ? '_LIVE' : '_TEST'}`;
  const envPrice = process.env[envKey];
  if (envPrice) {
    return envPrice;
  }

  // Fallback to hardcoded test/placeholder IDs
  // IMPORTANT: Replace these with real Stripe price IDs before going live
  const testPriceIds: Record<string, string> = {
    [PRODUCT_IDS.PRO_MONTHLY]: 'price_test_pro_monthly',
    [PRODUCT_IDS.PRO_ANNUAL]: 'price_test_pro_annual',
    [PRODUCT_IDS.FAMILY_MONTHLY]: 'price_test_family_monthly',
    [PRODUCT_IDS.FAMILY_ANNUAL]: 'price_test_family_annual',
    [PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY]: 'price_test_family_extra_seat_monthly',
    [PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL]: 'price_test_family_extra_seat_annual',
    [PRODUCT_IDS.CIRCLE_MONTHLY]: 'price_test_circle_monthly',
    [PRODUCT_IDS.CIRCLE_ANNUAL]: 'price_test_circle_annual',
    [PRODUCT_IDS.BUNDLE_10_ANNUAL]: 'price_test_bundle_10_annual',
    [PRODUCT_IDS.BUNDLE_15_ANNUAL]: 'price_test_bundle_15_annual',
    [PRODUCT_IDS.BUNDLE_20_ANNUAL]: 'price_test_bundle_20_annual',
    [PRODUCT_IDS.ADMIN_ADDON_MONTHLY]: 'price_test_admin_addon_monthly',
    [PRODUCT_IDS.ADMIN_ADDON_ANNUAL]: 'price_test_admin_addon_annual',
    [PRODUCT_IDS.CCI_FREE]: 'price_test_cci_free_199',
    [PRODUCT_IDS.CCI_PRO]: 'price_test_cci_pro_149',
    [PRODUCT_IDS.CCI_CIRCLE_ALL]: 'price_test_cci_circle_399',
    [PRODUCT_IDS.CCI_BUNDLE_ALL]: 'price_test_cci_bundle_999',
    [PRODUCT_IDS.QCR_INDIVIDUAL]: 'price_test_qcr_individual_149',
    [PRODUCT_IDS.QCR_CIRCLE]: 'price_test_qcr_circle_299',
    [PRODUCT_IDS.QCR_BUNDLE]: 'price_test_qcr_bundle_499',
  };

  return testPriceIds[productId] || null;
}

function isOneTimeProduct(productId: string): boolean {
  const oneTimeProducts = [
    PRODUCT_IDS.CCI_FREE,
    PRODUCT_IDS.CCI_PRO,
    PRODUCT_IDS.CCI_CIRCLE_ALL,
    PRODUCT_IDS.CCI_BUNDLE_ALL,
    PRODUCT_IDS.QCR_INDIVIDUAL,
    PRODUCT_IDS.QCR_CIRCLE,
    PRODUCT_IDS.QCR_BUNDLE,
  ];
  return oneTimeProducts.includes(productId as ProductId);
}

function getEntitlementForProduct(productId: string): string {
  const entitlementMap: Record<string, string> = {
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
    [PRODUCT_IDS.QCR_INDIVIDUAL]: 'qcr_individual',
    [PRODUCT_IDS.QCR_CIRCLE]: 'qcr_circle',
    [PRODUCT_IDS.QCR_BUNDLE]: 'qcr_bundle',
  };
  return entitlementMap[productId] || 'unknown';
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check payment mode
  const paymentMode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  if (paymentMode === 'demo' || !paymentMode) {
    res.status(400).json({ error: 'Payments are in demo mode. No real checkout available.' });
    return;
  }

  try {
    const {
      productId,
      userId,
      circleId,
      bundleId,
      successUrl,
      cancelUrl,
    } = req.body as {
      productId: string;
      userId: string;
      circleId?: string;
      bundleId?: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    // Validate required fields
    if (!productId || !userId) {
      res.status(400).json({ error: 'Missing required fields: productId, userId' });
      return;
    }

    // Get Stripe price ID
    const priceId = getStripePriceId(productId);
    if (!priceId) {
      res.status(400).json({ error: `Unknown product: ${productId}` });
      return;
    }

    // Determine checkout mode
    const isOneTime = isOneTimeProduct(productId);
    const mode: Stripe.Checkout.SessionCreateParams.Mode = isOneTime ? 'payment' : 'subscription';

    // Build URLs
    const origin = req.headers.origin || process.env.EXPO_PUBLIC_APP_URL || 'https://orbital.health';
    const finalSuccessUrl = successUrl || `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${origin}/upgrade?canceled=true`;

    // Build metadata for webhook processing
    const metadata: Record<string, string> = {
      productId,
      userId,
      entitlementId: getEntitlementForProduct(productId),
    };

    if (circleId) {
      metadata.circleId = circleId;
    }
    if (bundleId) {
      metadata.bundleId = bundleId;
    }

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      client_reference_id: userId,
      metadata,
      // For subscriptions, allow customer to manage billing
      ...(mode === 'subscription' && {
        subscription_data: {
          metadata,
        },
      }),
      // For one-time payments, include metadata in payment intent
      ...(mode === 'payment' && {
        payment_intent_data: {
          metadata,
        },
      }),
    });

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[create-checkout-session] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    res.status(500).json({ error: message });
  }
}
