/**
 * Entitlements API
 *
 * GET /api/entitlements
 *
 * Returns the current entitlements for the authenticated user from the durable server-side store.
 * This is the source of truth for entitlements - client cache should sync from here.
 *
 * SECURITY:
 * - Rate limited (60 req/min)
 * - CORS restricted to allowed origins
 * - Auth required (Supabase JWT)
 * - User ID extracted from token (users can ONLY access own entitlements)
 * - All events logged to security audit
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
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from '../_lib/rateLimit';
import { applyCors } from '../_lib/cors';
import {
  logSecurityEvent,
  logAuthFailure,
  logRateLimitExceeded,
} from '../_lib/securityAudit';

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
      return null;
    }

    return { userId: user.id };
  } catch (error) {
    return null;
  }
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

const ENDPOINT = '/api/entitlements';

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
  if (!applyRateLimit(req, res, RATE_LIMITS.ENTITLEMENTS)) {
    await logRateLimitExceeded(ip, ENDPOINT, method, 'entitlements');
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
    res.status(200).json({
      entitlements: [],
      isDemo: true,
      message: 'Payments in demo mode - no durable entitlements',
    });
    return;
  }

  // 3) Auth validation (required in test/live mode)
  const authResult = await validateAuthToken(req.headers.authorization);
  if (!authResult) {
    await logAuthFailure(ip, ENDPOINT, method, 'Invalid or missing auth token');
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

    // Log successful fetch
    await logSecurityEvent({
      event_type: 'ENTITLEMENT_FETCH_SUCCESS',
      user_id: userId,
      ip_address: ip,
      endpoint: ENDPOINT,
      method,
      status_code: 200,
      details: {
        entitlementCount: data?.entitlements?.length || 0,
      },
    });

    if (!data) {
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
