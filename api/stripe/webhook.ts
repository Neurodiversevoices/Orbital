/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for:
 * - checkout.session.completed: Grant entitlements after successful payment
 * - customer.subscription.deleted: Revoke subscription entitlements
 * - customer.subscription.updated: Handle subscription changes
 *
 * IMPORTANT: This endpoint must receive the raw body for signature verification.
 * Configure Vercel to not parse the body for this route.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing for raw webhook payload
export const config = {
  api: {
    bodyParser: false,
  },
};

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

function getWebhookSecret(): string {
  const mode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  if (mode === 'live') {
    return process.env.STRIPE_WEBHOOK_SECRET_LIVE || '';
  }
  return process.env.STRIPE_WEBHOOK_SECRET_TEST || '';
}

function getStripe(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
}

// =============================================================================
// SUPABASE CONFIGURATION
// =============================================================================

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase not configured');
  }

  return createClient(url, serviceKey);
}

// =============================================================================
// HELPER: READ RAW BODY
// =============================================================================

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// =============================================================================
// ENTITLEMENT MANAGEMENT
// =============================================================================

async function grantEntitlement(
  userId: string,
  entitlementId: string,
  metadata: Record<string, string>
): Promise<void> {
  const supabase = getSupabase();

  // Get current entitlements
  const { data: existing } = await supabase
    .from('user_entitlements')
    .select('entitlements')
    .eq('user_id', userId)
    .single();

  const currentEntitlements: string[] = existing?.entitlements || [];

  // Add new entitlement if not already present
  if (!currentEntitlements.includes(entitlementId)) {
    currentEntitlements.push(entitlementId);
  }

  // Handle bundled upgrades: Family/Circle purchases grant Pro automatically
  if (
    (entitlementId === 'family_access' || entitlementId === 'circle_access') &&
    !currentEntitlements.includes('pro_access')
  ) {
    currentEntitlements.push('pro_access');
  }

  // Upsert entitlements
  await supabase
    .from('user_entitlements')
    .upsert({
      user_id: userId,
      entitlements: currentEntitlements,
      updated_at: new Date().toISOString(),
      circle_id: metadata.circleId || null,
      bundle_id: metadata.bundleId || null,
    }, {
      onConflict: 'user_id',
    });

  console.log(`[webhook] Granted entitlement ${entitlementId} to user ${userId}`);
}

async function revokeEntitlement(
  userId: string,
  entitlementId: string
): Promise<void> {
  const supabase = getSupabase();

  // Get current entitlements
  const { data: existing } = await supabase
    .from('user_entitlements')
    .select('entitlements')
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return;
  }

  const currentEntitlements: string[] = existing.entitlements || [];
  const updatedEntitlements = currentEntitlements.filter(e => e !== entitlementId);

  // Update entitlements
  await supabase
    .from('user_entitlements')
    .update({
      entitlements: updatedEntitlements,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  console.log(`[webhook] Revoked entitlement ${entitlementId} from user ${userId}`);
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const metadata = session.metadata || {};
  const userId = metadata.userId || session.client_reference_id;
  const entitlementId = metadata.entitlementId;
  const productId = metadata.productId;

  if (!userId || !entitlementId) {
    console.error('[webhook] Missing userId or entitlementId in session metadata');
    return;
  }

  const supabase = getSupabase();

  // IDEMPOTENCY: Check if this session was already processed
  const { data: existingPurchase } = await supabase
    .from('purchase_history')
    .select('id')
    .eq('stripe_session_id', session.id)
    .single();

  if (existingPurchase) {
    console.log(`[webhook] Session ${session.id} already processed, skipping`);
    return;
  }

  // Record purchase in history (UNIQUE constraint prevents duplicates)
  const { error: insertError } = await supabase
    .from('purchase_history')
    .insert({
      user_id: userId,
      product_id: productId || 'unknown',
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
      entitlement_granted: entitlementId,
      amount_cents: session.amount_total,
      currency: session.currency || 'usd',
      status: 'completed',
      metadata: metadata,
    });

  if (insertError) {
    // If duplicate key error, session was already processed (race condition)
    if (insertError.code === '23505') {
      console.log(`[webhook] Session ${session.id} already processed (race), skipping`);
      return;
    }
    console.error('[webhook] Failed to record purchase:', insertError);
    // Continue to grant entitlement even if history insert fails
  }

  await grantEntitlement(userId, entitlementId, metadata);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const metadata = subscription.metadata || {};
  const userId = metadata.userId;
  const entitlementId = metadata.entitlementId;

  if (!userId || !entitlementId) {
    console.error('[webhook] Missing userId or entitlementId in subscription metadata');
    return;
  }

  await revokeEntitlement(userId, entitlementId);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const metadata = subscription.metadata || {};
  const userId = metadata.userId;
  const entitlementId = metadata.entitlementId;

  if (!userId || !entitlementId) {
    return;
  }

  // Check if subscription is still active
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await grantEntitlement(userId, entitlementId, metadata);
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    await revokeEntitlement(userId, entitlementId);
  }
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

  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    console.error('[webhook] Webhook secret not configured');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // Verify webhook signature
    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[webhook] Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
