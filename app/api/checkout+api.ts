/**
 * Stripe Checkout Session API Route
 *
 * Creates a Stripe Checkout Session for the requested product.
 * This runs server-side (API route) to keep the secret key secure.
 *
 * POST /api/checkout
 * Body: { productId, userId, successUrl, cancelUrl }
 * Returns: { sessionId, checkoutUrl }
 *
 * SECURITY:
 * - Secret key is ONLY used server-side
 * - Session creation validates product exists
 * - User ID is stored in session metadata for verification
 */

import {
  STRIPE_PRICE_IDS,
  PRODUCT_ENTITLEMENTS,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
} from '../../lib/payments/stripe';
import { PRODUCT_CATALOG } from '../../lib/payments/mockCheckout';

// Stripe secret key (server-side only, never expose to client)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

/**
 * Determine Stripe mode based on product type
 * - Subscriptions: mode = 'subscription'
 * - One-time purchases (CCI): mode = 'payment'
 */
function getCheckoutMode(productId: string): 'subscription' | 'payment' {
  const product = PRODUCT_CATALOG[productId];
  if (!product) return 'payment';
  return product.billingCycle === 'one_time' ? 'payment' : 'subscription';
}

export async function POST(request: Request): Promise<Response> {
  // Check Stripe is configured
  if (!STRIPE_SECRET_KEY) {
    return Response.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 500 }
    );
  }

  try {
    const body: CheckoutSessionRequest = await request.json();
    const { productId, userId, successUrl, cancelUrl } = body;

    // Validate product exists
    const priceId = STRIPE_PRICE_IDS[productId];
    if (!priceId) {
      return Response.json(
        { error: `Invalid product ID: ${productId}` },
        { status: 400 }
      );
    }

    const entitlementId = PRODUCT_ENTITLEMENTS[productId];
    const mode = getCheckoutMode(productId);

    // Create Stripe Checkout Session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': mode,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': successUrl,
        'cancel_url': cancelUrl,
        'metadata[userId]': userId,
        'metadata[productId]': productId,
        'metadata[entitlementId]': entitlementId,
        // For subscriptions, allow customer to manage later
        ...(mode === 'subscription' && {
          'subscription_data[metadata][userId]': userId,
          'subscription_data[metadata][productId]': productId,
          'subscription_data[metadata][entitlementId]': entitlementId,
        }),
      }),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      console.error('[Checkout] Stripe error:', errorData);
      return Response.json(
        { error: errorData.error?.message || 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    const session = await stripeResponse.json();

    const response: CheckoutSessionResponse = {
      sessionId: session.id,
      checkoutUrl: session.url,
    };

    return Response.json(response);
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
