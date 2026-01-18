/**
 * Stripe Customer Portal API Route
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Users can:
 * - View and update payment methods
 * - View invoice history
 * - Cancel subscription (at period end by default)
 *
 * POST /api/customer-portal
 * Body: { userId, returnUrl }
 * Returns: { success, portalUrl?, error? }
 *
 * SECURITY:
 * - Portal session is created server-side with secret key
 * - User can only manage their own subscriptions
 */

import {
  CustomerPortalRequest,
  CustomerPortalResponse,
} from '../../lib/payments/stripe';
import { getCustomerId, setCustomerId } from '../../lib/payments/customerStore';

// Stripe secret key (server-side only)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

/**
 * Find Stripe customer for the given userId
 * Returns null if no customer exists (user hasn't purchased anything)
 */
async function findStripeCustomer(userId: string): Promise<string | null> {
  // Check if we already have a customer ID cached
  const existingCustomerId = getCustomerId(userId);
  if (existingCustomerId) {
    return existingCustomerId;
  }

  // Try to find existing customer in Stripe by metadata
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
    console.warn('[CustomerPortal] Customer search failed:', error);
  }

  // No existing customer found
  return null;
}

export async function POST(request: Request): Promise<Response> {
  if (!STRIPE_SECRET_KEY) {
    return Response.json({
      success: false,
      error: 'Stripe is not configured',
    } satisfies CustomerPortalResponse);
  }

  try {
    const body: CustomerPortalRequest = await request.json();
    const { userId, returnUrl } = body;

    if (!userId) {
      return Response.json({
        success: false,
        error: 'Missing user ID',
      } satisfies CustomerPortalResponse);
    }

    // Get the Stripe customer ID for this user
    const customerId = await findStripeCustomer(userId);

    if (!customerId) {
      return Response.json({
        success: false,
        error: 'No subscription found. Please purchase a subscription first.',
      } satisfies CustomerPortalResponse);
    }

    // Create a Customer Portal session
    const portalResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'customer': customerId,
        'return_url': returnUrl,
      }),
    });

    if (!portalResponse.ok) {
      const errorData = await portalResponse.json();
      console.error('[CustomerPortal] Stripe error:', errorData);
      return Response.json({
        success: false,
        error: errorData.error?.message || 'Failed to create portal session',
      } satisfies CustomerPortalResponse);
    }

    const session = await portalResponse.json();

    return Response.json({
      success: true,
      portalUrl: session.url,
    } satisfies CustomerPortalResponse);
  } catch (error) {
    console.error('[CustomerPortal] Error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal error',
    } satisfies CustomerPortalResponse);
  }
}
