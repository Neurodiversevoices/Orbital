/**
 * Stripe Session Verification API
 *
 * GET /api/stripe/verify-session?session_id=xxx
 *
 * Verifies a completed Stripe Checkout Session and grants entitlements.
 * Called on return from Stripe Checkout.
 *
 * SECURITY: Requires valid Authorization header with Supabase JWT token.
 * Authenticated user must match the session owner (metadata.userId).
 *
 * Response:
 * {
 *   success: boolean;
 *   entitlements: string[];
 *   error?: string;
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from '../_lib/rateLimit';
import { applyCors } from '../_lib/cors';
import {
  logSecurityEvent,
  logAuthFailure,
  logRateLimitExceeded,
  logSessionOwnerMismatch,
} from '../_lib/securityAudit';

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
// AUTH VALIDATION
// =============================================================================

async function validateAuthToken(authHeader: string | undefined): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[verify-session] Token validation failed:', error?.message);
      return null;
    }

    return { userId: user.id };
  } catch (error) {
    console.error('[verify-session] Token validation error:', error);
    return null;
  }
}

// =============================================================================
// ENTITLEMENT GRANTING
// =============================================================================

async function grantEntitlement(
  userId: string,
  entitlementId: string,
  metadata: Record<string, string>
): Promise<string[]> {
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
  const { error } = await supabase
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

  if (error) {
    console.error('[verify-session] Failed to grant entitlement:', error);
    throw new Error('Failed to grant entitlement');
  }

  return currentEntitlements;
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

const ENDPOINT = '/api/stripe/verify-session';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const ip = getClientIdentifier(req);
  const method = req.method || 'UNKNOWN';

  // 1) CORS check
  const corsOk = await applyCors(req, res, {
    endpoint: ENDPOINT,
    methods: ['GET', 'OPTIONS'],
  });
  if (!corsOk) return;

  // 2) Rate limiting
  if (!applyRateLimit(req, res, RATE_LIMITS.VERIFY)) {
    await logRateLimitExceeded(ip, ENDPOINT, method, 'verify');
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check payment mode
  const paymentMode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  if (paymentMode === 'demo' || !paymentMode) {
    res.status(400).json({ error: 'Payments are in demo mode' });
    return;
  }

  // 3) Auth validation (required in test/live mode)
  const authResult = await validateAuthToken(req.headers.authorization);
  if (!authResult) {
    await logAuthFailure(ip, ENDPOINT, method, 'Invalid or missing auth token');
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const authenticatedUserId = authResult.userId;

  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      res.status(400).json({ error: 'Missing session_id' });
      return;
    }

    // Retrieve session from Stripe
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'payment_intent'],
    });

    // Check session status
    if (session.payment_status !== 'paid') {
      res.status(400).json({
        success: false,
        error: 'Payment not completed',
        status: session.payment_status,
      });
      return;
    }

    // Extract metadata
    const metadata = session.metadata || {};
    const sessionUserId = metadata.userId || session.client_reference_id;
    const entitlementId = metadata.entitlementId;
    const productId = metadata.productId;

    if (!sessionUserId || !entitlementId) {
      res.status(400).json({
        success: false,
        error: 'Missing user or entitlement information',
      });
      return;
    }

    // SECURITY: Verify authenticated user matches session owner
    if (authenticatedUserId !== sessionUserId) {
      await logSessionOwnerMismatch(authenticatedUserId, sessionUserId, ip, ENDPOINT);
      res.status(403).json({
        success: false,
        error: 'Access denied. You can only verify your own checkout sessions.',
      });
      return;
    }

    // Use the verified user ID
    const userId = sessionUserId;

    const supabase = getSupabase();

    // IDEMPOTENCY: Check if already processed by webhook
    const { data: existingPurchase } = await supabase
      .from('purchase_history')
      .select('id')
      .eq('stripe_session_id', session_id)
      .single();

    let entitlements: string[];

    if (existingPurchase) {
      // Already processed by webhook, just fetch current entitlements
      console.log(`[verify-session] Session ${session_id} already processed by webhook`);
      const { data: userEnt } = await supabase
        .from('user_entitlements')
        .select('entitlements')
        .eq('user_id', userId)
        .single();
      entitlements = userEnt?.entitlements || [];
    } else {
      // Not yet processed, record and grant
      // (webhook might arrive later, UNIQUE constraint will prevent duplicate)
      const { error: insertError } = await supabase
        .from('purchase_history')
        .insert({
          user_id: userId,
          product_id: productId || 'unknown',
          stripe_session_id: session.id,
          stripe_payment_intent_id: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent as any)?.id,
          entitlement_granted: entitlementId,
          amount_cents: session.amount_total,
          currency: session.currency || 'usd',
          status: 'completed',
          metadata: metadata,
        });

      if (insertError && insertError.code !== '23505') {
        console.error('[verify-session] Failed to record purchase:', insertError);
      }

      // Grant entitlement
      entitlements = await grantEntitlement(userId, entitlementId, metadata);
    }

    res.status(200).json({
      success: true,
      entitlements,
      productId: metadata.productId,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('[verify-session] Error:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    res.status(500).json({ success: false, error: message });
  }
}
