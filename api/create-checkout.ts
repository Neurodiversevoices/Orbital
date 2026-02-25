/**
 * Stripe Checkout Session Creator
 *
 * Vercel API route: POST /api/create-checkout
 *
 * Creates a Stripe Checkout Session for web purchases.
 * Mobile purchases continue through RevenueCat (unchanged).
 *
 * Request body:
 * {
 *   product_id: string,        // From PRODUCT_IDS (e.g. 'orbital_pro_monthly')
 *   supabase_user_id: string,  // Authenticated user ID
 *   customer_email: string,    // For Stripe receipt
 *   success_url?: string,      // Redirect after payment (default: /upgrade?success=1)
 *   cancel_url?: string,       // Redirect on cancel (default: /upgrade)
 * }
 *
 * Security:
 * - Validates product_id against known catalog
 * - Embeds supabase_user_id in session metadata (webhook reads it)
 * - Does NOT require Supabase auth (stateless — user provides their ID)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

// =============================================================================
// CONFIGURATION
// =============================================================================

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2025-01-27.acacia' });
}

// =============================================================================
// PRODUCT CATALOG → STRIPE MAPPING
// =============================================================================

interface StripeProduct {
  /** Stripe Price ID — set after creating products in Stripe Dashboard */
  stripePriceId: string;
  /** Entitlement to grant on purchase */
  entitlementId: string;
  /** 'subscription' or 'payment' (one-time) */
  mode: 'subscription' | 'payment';
  /** Display name */
  name: string;
}

/**
 * Map Orbital product IDs to Stripe Price IDs.
 *
 * SETUP: After creating products in Stripe Dashboard, replace the
 * 'price_REPLACE_...' placeholders with your actual Stripe Price IDs.
 *
 * You can also set these via environment variables:
 * STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
 */
function getProductMap(): Record<string, StripeProduct> {
  return {
    orbital_pro_monthly: {
      stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
      entitlementId: 'pro_access',
      mode: 'subscription',
      name: 'Pro (Monthly)',
    },
    orbital_pro_annual: {
      stripePriceId: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
      entitlementId: 'pro_access',
      mode: 'subscription',
      name: 'Pro (Annual)',
    },
    orbital_cci_free: {
      stripePriceId: process.env.STRIPE_PRICE_CCI_FREE || '',
      entitlementId: 'cci_purchased',
      mode: 'payment',
      name: 'CCI-Q4 Issuance',
    },
    orbital_cci_pro: {
      stripePriceId: process.env.STRIPE_PRICE_CCI_PRO || '',
      entitlementId: 'cci_purchased',
      mode: 'payment',
      name: 'CCI-Q4 Issuance (Pro)',
    },
    orbital_circle_monthly: {
      stripePriceId: process.env.STRIPE_PRICE_CIRCLE_MONTHLY || '',
      entitlementId: 'circle_access',
      mode: 'subscription',
      name: 'Circle (Monthly)',
    },
    orbital_circle_annual: {
      stripePriceId: process.env.STRIPE_PRICE_CIRCLE_ANNUAL || '',
      entitlementId: 'circle_access',
      mode: 'subscription',
      name: 'Circle (Annual)',
    },
    orbital_cci_circle_all: {
      stripePriceId: process.env.STRIPE_PRICE_CCI_CIRCLE || '',
      entitlementId: 'cci_circle_purchased',
      mode: 'payment',
      name: 'Circle CCI',
    },
    orbital_cci_bundle_all: {
      stripePriceId: process.env.STRIPE_PRICE_CCI_BUNDLE || '',
      entitlementId: 'cci_bundle_purchased',
      mode: 'payment',
      name: 'Bundle CCI',
    },
    orbital_bundle_10_annual: {
      stripePriceId: process.env.STRIPE_PRICE_BUNDLE_10 || '',
      entitlementId: 'bundle_10_access',
      mode: 'subscription',
      name: '10-Seat Bundle (Annual)',
    },
    orbital_bundle_15_annual: {
      stripePriceId: process.env.STRIPE_PRICE_BUNDLE_15 || '',
      entitlementId: 'bundle_15_access',
      mode: 'subscription',
      name: '15-Seat Bundle (Annual)',
    },
    orbital_bundle_20_annual: {
      stripePriceId: process.env.STRIPE_PRICE_BUNDLE_20 || '',
      entitlementId: 'bundle_20_access',
      mode: 'subscription',
      name: '20-Seat Bundle (Annual)',
    },
  };
}

// =============================================================================
// HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // CORS for web client
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const {
    product_id,
    supabase_user_id,
    customer_email,
    success_url,
    cancel_url,
  } = req.body || {};

  // Validate required fields
  if (!product_id || !supabase_user_id || !customer_email) {
    res.status(400).json({
      error: 'Missing required fields: product_id, supabase_user_id, customer_email',
    });
    return;
  }

  // Look up product
  const productMap = getProductMap();
  const product = productMap[product_id];
  if (!product) {
    res.status(400).json({ error: `Unknown product: ${product_id}` });
    return;
  }

  if (!product.stripePriceId) {
    res.status(503).json({
      error: `Stripe Price ID not configured for ${product_id}. Set STRIPE_PRICE_* env vars.`,
    });
    return;
  }

  // Determine URLs
  const origin = req.headers.origin || req.headers.referer || 'https://orbitalhealth.app';
  const baseUrl = typeof origin === 'string' ? origin.replace(/\/$/, '') : '';
  const finalSuccessUrl = success_url || `${baseUrl}/upgrade?success=1&session_id={CHECKOUT_SESSION_ID}`;
  const finalCancelUrl = cancel_url || `${baseUrl}/upgrade?cancelled=1`;

  try {
    const stripe = getStripe();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: product.mode,
      customer_email,
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        supabase_user_id,
        orbital_product_id: product_id,
        entitlement_id: product.entitlementId,
      },
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
    };

    // For subscriptions, pass metadata to the subscription too
    // so cancellation webhook can find the user
    if (product.mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          supabase_user_id,
          orbital_product_id: product_id,
          entitlement_id: product.entitlementId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.status(200).json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[create-checkout] Error creating session:', message);
    res.status(500).json({ error: message });
  }
}
