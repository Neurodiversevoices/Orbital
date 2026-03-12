/**
 * Dashboard Config API Endpoint
 *
 * Returns Supabase URL and anon key for the therapist dashboard.
 * Runtime fallback when build-time meta-tag injection is empty.
 *
 * The anon key is a public key (same as what's embedded in the client JS bundle),
 * so exposing it here is safe.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase not configured on server' });
  }

  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({ supabaseUrl, supabaseKey });
}
