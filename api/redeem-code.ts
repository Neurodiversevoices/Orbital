/**
 * Redeem Sponsor/Promo Code API
 *
 * Vercel API route: POST /api/redeem-code
 *
 * Validates a sponsor code, checks uses/expiry, and grants the
 * associated entitlement to the authenticated user.
 *
 * Body: { code }
 * Auth: Supabase access token in Authorization header
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

  // Authenticate user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const supabaseAuth = getSupabaseAuth();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Code required' });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    const supabase = getSupabaseAdmin();

    // Look up the code
    const { data: codeRow, error: lookupError } = await supabase
      .from('sponsor_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (lookupError || !codeRow) {
      res.status(404).json({ error: 'Invalid code' });
      return;
    }

    // Check expiry
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      res.status(410).json({ error: 'Code has expired' });
      return;
    }

    // Check uses
    if (codeRow.current_uses >= codeRow.max_uses) {
      res.status(410).json({ error: 'Code has been fully redeemed' });
      return;
    }

    // Check if user already has this entitlement from this code
    const { data: existing } = await supabase
      .from('user_entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('entitlement_id', codeRow.entitlement_id)
      .eq('source', 'sponsor_code')
      .maybeSingle();

    if (existing) {
      res.status(409).json({ error: 'You already redeemed a code for this entitlement' });
      return;
    }

    // Grant entitlement
    const { error: grantError } = await supabase
      .from('user_entitlements')
      .upsert(
        {
          user_id: user.id,
          entitlement_id: codeRow.entitlement_id,
          source: 'sponsor_code',
          purchase_id: `code_${normalizedCode}_${user.id}`,
          metadata: {
            code: normalizedCode,
            sponsor_code_id: codeRow.id,
          },
        },
        { onConflict: 'user_id,entitlement_id' },
      );

    if (grantError) {
      console.error('[redeem-code] Grant error:', grantError);
      res.status(500).json({ error: 'Failed to grant entitlement' });
      return;
    }

    // Increment uses
    await supabase
      .from('sponsor_codes')
      .update({ current_uses: codeRow.current_uses + 1 })
      .eq('id', codeRow.id);

    res.status(200).json({
      ok: true,
      entitlement_id: codeRow.entitlement_id,
      message: 'Code redeemed successfully',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[redeem-code] Error:', message);
    res.status(500).json({ error: message });
  }
}
