/**
 * Admin: Create Sponsor Code
 *
 * Vercel API route: POST /api/admin/create-code
 *
 * Creates a new sponsor/promo code. Admin email gated.
 *
 * Body: { code, entitlement_id, max_uses?, expires_at? }
 * Auth: Supabase access token in Authorization header
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS: string[] = [
  'erparris@gmail.com',
];

function getSupabaseAdmin() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role not configured');
  return createClient(url, serviceKey);
}

function getSupabaseAuth() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase not configured');
  return createClient(url, anonKey);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Authenticate admin
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const supabaseAuth = getSupabaseAuth();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

  if (authError || !user || !user.email) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  const { code, entitlement_id, max_uses, expires_at } = req.body || {};

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'code is required' });
    return;
  }
  if (!entitlement_id || typeof entitlement_id !== 'string') {
    res.status(400).json({ error: 'entitlement_id is required' });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('sponsor_codes')
      .insert({
        code: normalizedCode,
        entitlement_id,
        max_uses: max_uses || 1,
        expires_at: expires_at || null,
        created_by: user.email,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Code already exists' });
        return;
      }
      console.error('[admin/create-code] Insert error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ ok: true, code: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin/create-code] Error:', message);
    res.status(500).json({ error: message });
  }
}
