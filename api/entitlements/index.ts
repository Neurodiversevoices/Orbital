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
 * SCALABILITY:
 * - Server-side caching (30s TTL) reduces DB load
 * - Shared Supabase client with connection pooling
 * - Metrics tracking for capacity monitoring
 *
 * Response:
 * {
 *   entitlements: string[];
 *   circleId?: string;
 *   bundleId?: string;
 *   updatedAt: string;
 *   cached?: boolean;
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseData, getSupabaseAuth } from '../_lib/supabaseClient';
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from '../_lib/rateLimit';
import { applyCors } from '../_lib/cors';
import {
  logSecurityEvent,
  logAuthFailure,
  logRateLimitExceeded,
} from '../_lib/securityAudit';
import {
  getCachedEntitlements,
  setCachedEntitlements,
  getCachedAuth,
  setCachedAuth,
} from '../_lib/cache';
import { startRequest, recordRequestEnd } from '../_lib/metrics';

// =============================================================================
// AUTH VALIDATION (with caching)
// =============================================================================

async function validateAuthToken(authHeader: string | undefined): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  // Check cache first (reduces DB load)
  const cached = getCachedAuth(token);
  if (cached) {
    return cached;
  }

  try {
    const supabase = getSupabaseAuth();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    const result = { userId: user.id };

    // Cache successful auth (short TTL for security)
    setCachedAuth(token, result);

    return result;
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

  // Start metrics tracking
  const metricsCtx = startRequest(ENDPOINT);

  try {
    // Check cache first (reduces DB load under burst traffic)
    const cachedEntitlements = getCachedEntitlements(userId);
    if (cachedEntitlements !== undefined) {
      recordRequestEnd(metricsCtx, 200);
      res.status(200).json({
        entitlements: cachedEntitlements,
        cached: true,
      });
      return;
    }

    // Cache miss - fetch from database
    const supabase = getSupabaseData();

    const { data, error } = await supabase
      .from('user_entitlements')
      .select('entitlements, circle_id, bundle_id, updated_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (not an error)
      console.error('[entitlements] Database error:', error);
      recordRequestEnd(metricsCtx, 500);
      res.status(500).json({ error: 'Failed to fetch entitlements' });
      return;
    }

    // Cache the result (even empty arrays)
    const entitlements = data?.entitlements || [];
    setCachedEntitlements(userId, entitlements);

    // Log successful fetch (fire and forget - don't block response)
    logSecurityEvent({
      event_type: 'ENTITLEMENT_FETCH_SUCCESS',
      user_id: userId,
      ip_address: ip,
      endpoint: ENDPOINT,
      method,
      status_code: 200,
      details: {
        entitlementCount: entitlements.length,
        cached: false,
      },
    }).catch(() => {}); // Don't fail request on logging error

    recordRequestEnd(metricsCtx, 200);

    if (!data) {
      res.status(200).json({
        entitlements: [],
        updatedAt: null,
        cached: false,
      });
      return;
    }

    res.status(200).json({
      entitlements: data.entitlements || [],
      circleId: data.circle_id || null,
      bundleId: data.bundle_id || null,
      updatedAt: data.updated_at,
      cached: false,
    });
  } catch (error) {
    console.error('[entitlements] Error:', error);
    recordRequestEnd(metricsCtx, 500);
    const message = error instanceof Error ? error.message : 'Failed to fetch entitlements';
    res.status(500).json({ error: message });
  }
}
