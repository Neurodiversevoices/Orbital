/**
 * Admin Login API
 *
 * Vercel API route: POST /api/admin-login
 *
 * Proxies Supabase authentication server-side so the admin dashboard
 * doesn't need hardcoded Supabase credentials in the client HTML.
 *
 * Flow:
 * 1. Client sends email + password
 * 2. Server authenticates with Supabase using env vars
 * 3. Checks email against ADMIN_EMAILS allowlist
 * 4. Returns the Supabase access token (or error)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS: string[] = [
  'erparris@gmail.com',
];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  // Check admin allowlist before even attempting auth
  if (!ADMIN_EMAILS.includes(email.toLowerCase().trim())) {
    res.status(403).json({ error: 'Not an admin email' });
    return;
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    res.status(500).json({ error: 'Supabase not configured' });
    return;
  }

  try {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      res.status(401).json({ error: error?.message || 'Authentication failed' });
      return;
    }

    res.status(200).json({
      access_token: data.session.access_token,
      email: data.user?.email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
