/**
 * Stripe Checkout Session API
 *
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session for the given product.
 * Returns the session URL for redirect.
 *
 * SECURITY:
 * - Rate limited (20 req/min)
 * - CORS restricted to allowed origins
 * - Auth required (Supabase JWT)
 * - Server-side SKU validation (no client trust)
 * - All events logged to security audit
 *
 * Request body:
 * {
 *   productId: string;      // Internal product ID (e.g., 'orbital_pro_annual')
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
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from '../_lib/rateLimit';
import { applyCors } from '../_lib/cors';
import { validateProductId, getEntitlementForProduct, isOneTimeProduct } from '../_lib/skuValidation';
import {
  logSecurityEvent,
  logAuthFailure,
  logRateLimitExceeded,
  logSkuValidationFailed,
} from '../_lib/securityAudit';

// =============================================================================
// SUPABASE AUTH VALIDATION
// =============================================================================

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey);
}

async function validateAuthToken(authHeader: string | undefined): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error('[auth] Supabase not configured');
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return { userId: user.id };
  } catch (error) {
    return null;
  }
}

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
// PRICE ID MAPPING
// =============================================================================

function getStripePriceId(productId: string): string | null {
  const mode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  const isLive = mode === 'live';

  // In production, use environment variables for price IDs
  const envKey = `STRIPE_PRICE_${productId.toUpperCase().replace(/-/g, '_')}${isLive ? '_LIVE' : '_TEST'}`;
  const envPrice = process.env[envKey];
  if (envPrice) {
    return envPrice;
  }

  // Fallback to hardcoded test/placeholder IDs
  const testPriceIds: Record<string, string> = {
    'orbital_pro_monthly': 'price_test_pro_monthly',
    'orbital_pro_annual': 'price_test_pro_annual',
    'orbital_family_monthly': 'price_test_family_monthly',
    'orbital_family_annual': 'price_test_family_annual',
    'orbital_family_extra_seat_monthly': 'price_test_family_extra_seat_monthly',
    'orbital_family_extra_seat_annual': 'price_test_family_extra_seat_annual',
    'orbital_circle_monthly': 'price_test_circle_monthly',
    'orbital_circle_annual': 'price_test_circle_annual',
    'orbital_bundle_10_annual': 'price_test_bundle_10_annual',
    'orbital_bundle_15_annual': 'price_test_bundle_15_annual',
    'orbital_bundle_20_annual': 'price_test_bundle_20_annual',
    'orbital_admin_addon_monthly': 'price_test_admin_addon_monthly',
    'orbital_admin_addon_annual': 'price_test_admin_addon_annual',
    'orbital_cci_free': 'price_test_cci_free_199',
    'orbital_cci_pro': 'price_test_cci_pro_149',
    'orbital_cci_circle_all': 'price_test_cci_circle_399',
    'orbital_cci_bundle_all': 'price_test_cci_bundle_999',
    'orbital_qcr_individual': 'price_test_qcr_individual_149',
    'orbital_qcr_circle': 'price_test_qcr_circle_299',
    'orbital_qcr_bundle': 'price_test_qcr_bundle_499',
  };

  return testPriceIds[productId] || null;
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

const ENDPOINT = '/api/stripe/create-checkout-session';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const ip = getClientIdentifier(req);
  const method = req.method || 'UNKNOWN';

  // 1) CORS check
  const corsOk = await applyCors(req, res, {
    endpoint: ENDPOINT,
    methods: ['POST', 'OPTIONS'],
  });
  if (!corsOk) return;

  // 2) Rate limiting
  if (!applyRateLimit(req, res, RATE_LIMITS.CHECKOUT)) {
    await logRateLimitExceeded(ip, ENDPOINT, method, 'checkout');
    return;
  }

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

  // 3) Auth validation
  const authResult = await validateAuthToken(req.headers.authorization);
  if (!authResult) {
    await logAuthFailure(ip, ENDPOINT, method, 'Invalid or missing auth token');
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const userId = authResult.userId;

  try {
    const {
      productId,
      circleId,
      bundleId,
      successUrl,
      cancelUrl,
    } = req.body as {
      productId: string;
      circleId?: string;
      bundleId?: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    // 4) Server-side SKU validation (NO CLIENT TRUST)
    if (!productId) {
      await logSecurityEvent({
        event_type: 'INVALID_REQUEST',
        user_id: userId,
        ip_address: ip,
        endpoint: ENDPOINT,
        method,
        status_code: 400,
        details: { reason: 'Missing productId' },
      });
      res.status(400).json({ error: 'Missing required field: productId' });
      return;
    }

    const validation = validateProductId(productId);
    if (!validation.valid) {
      await logSkuValidationFailed(userId, ip, ENDPOINT, productId, validation.error || 'Unknown product');
      res.status(400).json({ error: validation.error });
      return;
    }

    // Get Stripe price ID
    const priceId = getStripePriceId(productId);
    if (!priceId) {
      await logSkuValidationFailed(userId, ip, ENDPOINT, productId, 'No Stripe price configured');
      res.status(400).json({ error: `Product not configured: ${productId}` });
      return;
    }

    // Determine checkout mode from server-side catalog (not client)
    const isOneTime = isOneTimeProduct(productId);
    const mode: Stripe.Checkout.SessionCreateParams.Mode = isOneTime ? 'payment' : 'subscription';

    // Get entitlement from server-side catalog (not client)
    const entitlementId = getEntitlementForProduct(productId);

    // Build URLs
    const origin = req.headers.origin || process.env.EXPO_PUBLIC_APP_URL || 'https://orbital.health';
    const finalSuccessUrl = successUrl || `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${origin}/upgrade?canceled=true`;

    // Build metadata for webhook processing
    const metadata: Record<string, string> = {
      productId,
      userId,
      entitlementId: entitlementId || 'unknown',
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
      ...(mode === 'subscription' && {
        subscription_data: {
          metadata,
        },
      }),
      ...(mode === 'payment' && {
        payment_intent_data: {
          metadata,
        },
      }),
    });

    // Log successful checkout initiation
    await logSecurityEvent({
      event_type: 'PURCHASE_INITIATED',
      user_id: userId,
      ip_address: ip,
      endpoint: ENDPOINT,
      method,
      status_code: 200,
      details: {
        productId,
        sessionId: session.id,
        mode,
      },
    });

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[create-checkout-session] Error:', error);

    await logSecurityEvent({
      event_type: 'PURCHASE_FAILED',
      user_id: userId,
      ip_address: ip,
      endpoint: ENDPOINT,
      method,
      status_code: 500,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    res.status(500).json({ error: message });
  }
}
