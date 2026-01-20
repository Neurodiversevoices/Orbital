/**
 * Entitlements API
 *
 * GET /api/entitlements
 *
 * Returns the current entitlements for the authenticated user from the durable server-side store.
 * This is the source of truth for entitlements - client cache should sync from here.
 *
 * SECURITY: Requires valid Authorization header with Supabase JWT token.
 * User ID is extracted from token - users can ONLY access their own entitlements.
 *
 * Response:
 * {
 *   entitlements: string[];
 *   circleId?: string;
 *   bundleId?: string;
 *   updatedAt: string;
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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
      console.error('[entitlements] Token validation failed:', error?.message);
      return null;
    }

    return { userId: user.id };
  } catch (error) {
    console.error('[entitlements] Token validation error:', error);
    return null;
  }
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS - restrict to known origins in production
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://orbital.health'];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    // Allow any origin in development
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check payment mode - in demo mode, return empty entitlements from server
  const paymentMode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  if (paymentMode === 'demo' || !paymentMode) {
    // In demo mode, we don't have durable entitlements
    // Return empty array to indicate no server-side entitlements
    res.status(200).json({
      entitlements: [],
      isDemo: true,
      message: 'Payments in demo mode - no durable entitlements',
    });
    return;
  }

  // SECURITY: Validate auth token (required in test/live mode)
  const authResult = await validateAuthToken(req.headers.authorization);
  if (!authResult) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  // User can ONLY access their own entitlements
  const userId = authResult.userId;

  try {
    const supabase = getSupabase();

    // Fetch user entitlements (using authenticated user ID from token)
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (not an error)
      console.error('[entitlements] Database error:', error);
      res.status(500).json({ error: 'Failed to fetch entitlements' });
      return;
    }

    if (!data) {
      // User has no entitlements yet
      res.status(200).json({
        entitlements: [],
        updatedAt: null,
      });
      return;
    }

    res.status(200).json({
      entitlements: data.entitlements || [],
      circleId: data.circle_id || null,
      bundleId: data.bundle_id || null,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('[entitlements] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch entitlements';
    res.status(500).json({ error: message });
  }
}
