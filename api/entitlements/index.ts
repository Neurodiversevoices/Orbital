/**
 * Entitlements API
 *
 * GET /api/entitlements?user_id=xxx
 *
 * Returns the current entitlements for a user from the durable server-side store.
 * This is the source of truth for entitlements - client cache should sync from here.
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
// REQUEST HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user_id } = req.query;

    if (!user_id || typeof user_id !== 'string') {
      res.status(400).json({ error: 'Missing user_id parameter' });
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

    const supabase = getSupabase();

    // Fetch user entitlements
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', user_id)
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
