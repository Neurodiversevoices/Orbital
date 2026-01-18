/**
 * Stripe Session Verification API Route
 *
 * Verifies a completed Checkout Session and grants entitlement
 * ONLY if Stripe confirms payment was successful.
 *
 * POST /api/verify-session
 * Body: { sessionId }
 * Returns: { success, paymentStatus, entitlementGranted?, error? }
 *
 * SECURITY:
 * - NEVER grants entitlement without Stripe verification
 * - Checks payment_status from Stripe, not client-provided data
 * - Stores granted entitlements server-side
 */

import {
  VerifySessionRequest,
  VerifySessionResponse,
} from '../../lib/payments/stripe';
import { grantEntitlement } from '../../lib/payments/mockCheckout';

// Stripe secret key (server-side only)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Track verified sessions to prevent double-granting
const verifiedSessions = new Set<string>();

export async function POST(request: Request): Promise<Response> {
  if (!STRIPE_SECRET_KEY) {
    return Response.json({
      success: false,
      paymentStatus: 'unpaid',
      error: 'Stripe is not configured',
    } satisfies VerifySessionResponse);
  }

  try {
    const body: VerifySessionRequest = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return Response.json({
        success: false,
        paymentStatus: 'unpaid',
        error: 'Missing session ID',
      } satisfies VerifySessionResponse);
    }

    // Prevent double-verification
    if (verifiedSessions.has(sessionId)) {
      return Response.json({
        success: true,
        paymentStatus: 'paid',
        error: 'Session already verified',
      } satisfies VerifySessionResponse);
    }

    // Retrieve session from Stripe
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      return Response.json({
        success: false,
        paymentStatus: 'unpaid',
        error: errorData.error?.message || 'Failed to retrieve session',
      } satisfies VerifySessionResponse);
    }

    const session = await stripeResponse.json();

    // Check payment status
    const paymentStatus = session.payment_status as 'paid' | 'unpaid' | 'no_payment_required';

    if (paymentStatus !== 'paid') {
      return Response.json({
        success: false,
        paymentStatus,
        error: 'Payment not completed',
      } satisfies VerifySessionResponse);
    }

    // Payment confirmed! Grant entitlement
    const entitlementId = session.metadata?.entitlementId;
    const productId = session.metadata?.productId;

    if (!entitlementId) {
      return Response.json({
        success: false,
        paymentStatus: 'paid',
        error: 'No entitlement specified in session',
      } satisfies VerifySessionResponse);
    }

    // Grant the entitlement (this uses the existing mock storage for now)
    // In production, this would write to a real database
    await grantEntitlement(entitlementId);

    // For bundled upgrades: grant Pro with Family/Circle
    if (entitlementId === 'family_access' || entitlementId === 'circle_access') {
      await grantEntitlement('pro_access');
    }

    // For Bundle purchases: grant Pro
    if (entitlementId.startsWith('bundle_')) {
      await grantEntitlement('pro_access');
    }

    // Mark session as verified
    verifiedSessions.add(sessionId);

    console.log(`[VerifySession] Granted ${entitlementId} for product ${productId}`);

    return Response.json({
      success: true,
      paymentStatus: 'paid',
      entitlementGranted: entitlementId,
    } satisfies VerifySessionResponse);
  } catch (error) {
    console.error('[VerifySession] Error:', error);
    return Response.json({
      success: false,
      paymentStatus: 'unpaid',
      error: error instanceof Error ? error.message : 'Verification failed',
    } satisfies VerifySessionResponse);
  }
}
