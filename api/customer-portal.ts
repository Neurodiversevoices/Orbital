/**
 * Stripe Customer Portal Session
 *
 * Vercel API route: POST /api/customer-portal
 *
 * Creates a Stripe Billing Portal session for subscription management.
 * Users can: view invoices, update payment method, cancel subscription.
 *
 * Request body:
 * {
 *   customer_email: string,    // Stripe customer lookup
 *   return_url?: string,       // Where to redirect after portal (default: /settings)
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2025-01-27.acacia' });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
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

  const { customer_email, return_url } = req.body || {};

  if (!customer_email) {
    res.status(400).json({ error: 'Missing required field: customer_email' });
    return;
  }

  try {
    const stripe = getStripe();

    // Find customer by email
    const customers = await stripe.customers.list({
      email: customer_email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      res.status(404).json({
        error: 'No Stripe customer found for this email. If you subscribed via the App Store or Google Play, manage your subscription there.',
      });
      return;
    }

    const origin = req.headers.origin || req.headers.referer || 'https://orbital-jet.vercel.app';
    const baseUrl = typeof origin === 'string' ? origin.replace(/\/$/, '') : '';
    const finalReturnUrl = return_url || `${baseUrl}/settings`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: finalReturnUrl,
    });

    res.status(200).json({ portal_url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[customer-portal] Error:', message);
    res.status(500).json({ error: message });
  }
}
