/**
 * Stripe Webhook Handler
 *
 * Vercel API route: POST /api/stripe-webhook
 *
 * Processes Stripe webhook events to grant/revoke entitlements in Supabase.
 * This is the ONLY path through which real payments become entitlements.
 *
 * Security:
 * - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
 * - Uses Supabase service role key (bypasses RLS) to write entitlements
 * - No user authentication required (Stripe calls this, not users)
 *
 * Events handled:
 * - checkout.session.completed → Grant entitlement
 * - customer.subscription.deleted → Revoke entitlement
 * - invoice.payment_failed → Flag account
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-01-28.clover' });
}

function getSupabaseAdmin() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role not configured');
  return createClient(url, serviceKey);
}

// =============================================================================
// PRODUCT → ENTITLEMENT MAPPING
// =============================================================================

/**
 * Maps Stripe Price IDs to entitlement IDs.
 * Set these in your Stripe product metadata OR maintain this map.
 *
 * Convention: Stripe product metadata.entitlement_id = 'pro_access'
 * Fallback: Use price ID → entitlement lookup here.
 */
const PRICE_TO_ENTITLEMENT: Record<string, string> = {
  // These will be populated from Stripe product metadata at runtime.
  // If metadata is missing, this static map is the fallback.
  // Add your Stripe Price IDs here after creating products:
  //
  // 'price_xxxxx': 'pro_access',        // Pro Monthly
  // 'price_xxxxx': 'pro_access',        // Pro Annual
  // 'price_xxxxx': 'cci_purchased',     // CCI Free
  // 'price_xxxxx': 'cci_purchased',     // CCI Pro
  // 'price_xxxxx': 'circle_access',     // Circle Monthly
  // 'price_xxxxx': 'circle_access',     // Circle Annual
  // 'price_xxxxx': 'cci_circle_purchased', // Circle CCI
  // 'price_xxxxx': 'cci_bundle_purchased', // Bundle CCI
};

/**
 * Resolve entitlement from a Stripe checkout session line item.
 * Priority: product metadata > price metadata > static map.
 */
async function resolveEntitlement(
  stripe: Stripe,
  lineItem: Stripe.LineItem,
): Promise<string | null> {
  // 1. Check product metadata
  if (lineItem.price?.product) {
    const productId = typeof lineItem.price.product === 'string'
      ? lineItem.price.product
      : lineItem.price.product.id;
    const product = await stripe.products.retrieve(productId);
    if (product.metadata?.entitlement_id) {
      return product.metadata.entitlement_id;
    }
  }

  // 2. Check price metadata
  if (lineItem.price?.metadata?.entitlement_id) {
    return lineItem.price.metadata.entitlement_id;
  }

  // 3. Static map fallback
  if (lineItem.price?.id && PRICE_TO_ENTITLEMENT[lineItem.price.id]) {
    return PRICE_TO_ENTITLEMENT[lineItem.price.id];
  }

  return null;
}

// =============================================================================
// ENTITLEMENT OPERATIONS
// =============================================================================

async function grantEntitlement(
  userId: string,
  entitlementId: string,
  source: string,
  purchaseId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('user_entitlements')
    .upsert(
      {
        user_id: userId,
        entitlement_id: entitlementId,
        source,
        purchase_id: purchaseId,
        metadata,
      },
      { onConflict: 'user_id,entitlement_id' },
    );

  if (error) {
    console.error('[stripe-webhook] Failed to grant entitlement:', error);
    throw new Error(`Failed to grant entitlement: ${error.message}`);
  }

  console.log(`[stripe-webhook] Granted ${entitlementId} to ${userId}`);
}

async function revokeEntitlement(
  userId: string,
  entitlementId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('user_entitlements')
    .delete()
    .eq('user_id', userId)
    .eq('entitlement_id', entitlementId);

  if (error) {
    console.error('[stripe-webhook] Failed to revoke entitlement:', error);
    throw new Error(`Failed to revoke entitlement: ${error.message}`);
  }

  console.log(`[stripe-webhook] Revoked ${entitlementId} from ${userId}`);
}

async function recordPurchase(
  userId: string,
  purchaseId: string,
  productId: string,
  productName: string,
  price: number,
  billingCycle: string,
  status: string,
  entitlementGranted: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('purchase_history')
    .upsert(
      {
        user_id: userId,
        purchase_id: purchaseId,
        product_id: productId,
        product_name: productName,
        price,
        billing_cycle: billingCycle,
        status,
        entitlement_granted: entitlementGranted,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      },
      { onConflict: 'purchase_id' },
    );

  if (error) {
    console.error('[stripe-webhook] Failed to record purchase:', error);
    // Non-fatal: entitlement was already granted
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) {
    console.error('[stripe-webhook] No supabase_user_id in session metadata');
    return;
  }

  // Expand line items to get product/price details
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });

  for (const item of lineItems.data) {
    const entitlementId = await resolveEntitlement(stripe, item);

    if (!entitlementId) {
      console.warn('[stripe-webhook] Could not resolve entitlement for line item:', item.id);
      continue;
    }

    await grantEntitlement(
      userId,
      entitlementId,
      'stripe',
      session.id,
      {
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        price_id: item.price?.id,
        amount_total: item.amount_total,
      },
    );

    const billingCycle = session.mode === 'subscription' ? 'recurring' : 'one_time';
    await recordPurchase(
      userId,
      session.id,
      item.price?.product
        ? (typeof item.price.product === 'string' ? item.price.product : item.price.product.id)
        : 'unknown',
      item.description || 'Orbital Purchase',
      (item.amount_total || 0) / 100,
      billingCycle,
      'completed',
      entitlementId,
    );
  }
}

async function handleSubscriptionDeleted(
  session: Stripe.Subscription,
): Promise<void> {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) {
    console.error('[stripe-webhook] No supabase_user_id in subscription metadata');
    return;
  }

  // Revoke all entitlements granted by this subscription
  const supabase = getSupabaseAdmin();
  const { data: entitlements } = await supabase
    .from('user_entitlements')
    .select('entitlement_id')
    .eq('user_id', userId)
    .eq('source', 'stripe')
    .contains('metadata', { stripe_subscription_id: session.id });

  if (entitlements) {
    for (const ent of entitlements) {
      await revokeEntitlement(userId, ent.entitlement_id);
    }
  }

  console.log(`[stripe-webhook] Subscription ${session.id} deleted for ${userId}`);
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  console.error(
    `[stripe-webhook] Payment failed for customer ${customerId}, invoice ${invoice.id}`,
  );

  // Record in purchase_history for audit trail
  const userId = invoice.subscription_details?.metadata?.supabase_user_id
    || invoice.metadata?.supabase_user_id;

  if (userId) {
    await recordPurchase(
      userId,
      `failed_${invoice.id}`,
      'invoice_payment',
      'Payment Failed',
      (invoice.amount_due || 0) / 100,
      'recurring',
      'failed',
      null,
    );
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  // Verify webhook signature
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    // Vercel provides raw body as Buffer when Content-Type is not JSON-parsed
    const rawBody = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe-webhook] Signature verification failed:', message);
    res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
    return;
  }

  // Process event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[stripe-webhook] Error processing ${event.type}:`, message);
    res.status(500).json({ error: message });
  }
}
