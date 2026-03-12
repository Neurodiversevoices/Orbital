/**
 * CCI Founding Counter
 *
 * Vercel API route: GET /api/cci-counter
 *
 * Returns the number of CCI founding spots sold and remaining.
 * Queries purchase_history for completed CCI founding purchases.
 * Falls back gracefully if table doesn't exist or query fails.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const TOTAL_SPOTS = 100;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const fallback = { sold: 0, remaining: TOTAL_SPOTS, total: TOTAL_SPOTS };

  try {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      res.status(200).json(fallback);
      return;
    }

    const supabase = createClient(url, serviceKey);

    // Count completed CCI founding purchases
    const { count, error } = await supabase
      .from('purchase_history')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('entitlement_granted', 'cci_founding');

    if (error) {
      console.error('[cci-counter] Query error:', error.message);
      res.status(200).json(fallback);
      return;
    }

    const sold = count || 0;
    res.status(200).json({
      sold,
      remaining: Math.max(0, TOTAL_SPOTS - sold),
      total: TOTAL_SPOTS,
    });
  } catch (err) {
    console.error('[cci-counter] Error:', err);
    res.status(200).json(fallback);
  }
}
