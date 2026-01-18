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
 * - Creates or retrieves Stripe customer for subscription management
 */

import {
  STRIPE_PRICE_IDS,
  PRODUCT_ENTITLEMENTS,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
} from '../../lib/payments/stripe';
import { PRODUCT_CATALOG } from '../../lib/payments/mockCheckout';
import { getCustomerId, setCustomerId } from '../../lib/payments/customerStore';

// Stripe secret key (server-side only, never expose to client)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

/**
 * Get or create a Stripe customer for the given userId
 */
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  // Check if we already have a customer ID for this user
  const existingCustomerId = getCustomerId(userId);
  if (existingCustomerId) {
    return existingCustomerId;
  }

  // Search for existing customer in Stripe by metadata
  try {
    const searchResponse = await fetch(
      `https://api.stripe.com/v1/customers/search?query=metadata['userId']:'${userId}'`,
      {
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.data && searchData.data.length > 0) {
        const customerId = searchData.data[0].id;
        setCustomerId(userId, customerId);
        return customerId;
      }
    }
  } catch (error) {
    console.warn('[Checkout] Customer search failed, creating new customer:', error);
  }

  // Create a new customer
  const createResponse = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'metadata[userId]': userId,
      'description': `Orbital user: ${userId}`,
    }),
  });

  if (!createResponse.ok) {
    throw new Error('Failed to create Stripe customer');
  }

  const customer = await createResponse.json();
  setCustomerId(userId, customer.id);
  return customer.id;
}

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
    const { productId, userId, successUrl, cancelUrl, cciMetadata } = body;

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

    // Get or create Stripe customer (required for Customer Portal later)
    const customerId = await getOrCreateStripeCustomer(userId);
    console.log(`[Checkout] Using customer ${customerId} for user ${userId}`);

    // Build metadata including CCI-specific fields
    const metadata: Record<string, string> = {
      userId,
      productId,
      entitlementId,
    };

    // Add CCI metadata if present (for purchase tracking and duplicate prevention)
    if (cciMetadata) {
      metadata.cci_purchase_type = cciMetadata.purchase_type;
      metadata.cci_scope = cciMetadata.scope;
      if (cciMetadata.seats) {
        metadata.cci_seats = String(cciMetadata.seats);
      }
      if (cciMetadata.group_id) {
        metadata.cci_group_id = cciMetadata.group_id;
      }
    }

    // Build request body
    const bodyParams: Record<string, string> = {
      'mode': mode,
      'customer': customerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
    };

    // Add metadata fields
    Object.entries(metadata).forEach(([key, value]) => {
      bodyParams[`metadata[${key}]`] = value;
    });

    // For subscriptions, also add metadata to subscription_data
    if (mode === 'subscription') {
      Object.entries(metadata).forEach(([key, value]) => {
        bodyParams[`subscription_data[metadata][${key}]`] = value;
      });
    }

    // Create Stripe Checkout Session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams),
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
