/**
 * Admin Analytics API
 *
 * Vercel API route: GET /api/admin-analytics
 *
 * Returns admin dashboard data: summary stats, user roster, age cohort analytics.
 * Gated behind a hardcoded admin email allowlist.
 *
 * Authentication flow:
 * 1. Client sends Supabase access token in Authorization header
 * 2. API validates the token and extracts user email
 * 3. Email is checked against ADMIN_EMAILS allowlist
 * 4. If authorized, queries are run via service_role (bypasses RLS)
 *
 * Query params:
 *   ?view=summary     → summary stats only
 *   ?view=roster      → user roster with optional filters
 *   ?view=cohorts     → age cohort breakdown
 *   ?view=all         → everything (default)
 *   &plan=pro         → filter roster by plan status
 *   &search=email     → search roster by email
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Hardcoded admin email allowlist.
 * Only these emails can access the admin dashboard.
 */
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

// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================

async function authenticateAdmin(
  req: VercelRequest
): Promise<{ authorized: boolean; email?: string; error?: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const token = authHeader.slice(7);
  const supabase = getSupabaseAuth();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user || !user.email) {
    return { authorized: false, error: 'Invalid or expired token' };
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    return { authorized: false, error: 'Unauthorized — not an admin' };
  }

  return { authorized: true, email: user.email };
}

// =============================================================================
// HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Authenticate
  const auth = await authenticateAdmin(req);
  if (!auth.authorized) {
    res.status(401).json({ error: auth.error });
    return;
  }

  const view = (req.query.view as string) || 'all';
  const planFilter = req.query.plan as string | undefined;
  const searchQuery = req.query.search as string | undefined;

  try {
    const supabase = getSupabaseAdmin();
    const result: Record<string, unknown> = {};

    // =========================================================================
    // Summary stats
    // =========================================================================
    if (view === 'summary' || view === 'all') {
      const { data, error } = await supabase.rpc('admin_get_summary_stats');

      if (error) {
        res.status(500).json({ error: `Summary stats failed: ${error.message}` });
        return;
      }

      result.summary = data?.[0] || null;
    }

    // =========================================================================
    // User roster
    // =========================================================================
    if (view === 'roster' || view === 'all') {
      const { data, error } = await supabase.rpc('admin_get_user_overview');

      if (error) {
        res.status(500).json({ error: `User roster failed: ${error.message}` });
        return;
      }

      let roster = data || [];

      // Apply plan filter
      if (planFilter) {
        roster = roster.filter(
          (u: Record<string, unknown>) => u.plan_status === planFilter
        );
      }

      // Apply search filter (email substring match)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        roster = roster.filter(
          (u: Record<string, unknown>) =>
            typeof u.email === 'string' && u.email.toLowerCase().includes(q)
        );
      }

      result.roster = roster;
      result.roster_count = roster.length;
    }

    // =========================================================================
    // Age cohort breakdown
    // =========================================================================
    if (view === 'cohorts' || view === 'all') {
      const { data, error } = await supabase.rpc('admin_get_capacity_by_age_cohort', {
        p_window_days: 90,
      });

      if (error) {
        res.status(500).json({ error: `Age cohorts failed: ${error.message}` });
        return;
      }

      result.cohorts = data || [];
    }

    result.generated_at = new Date().toISOString();
    result.admin = auth.email;

    res.status(200).json(result);

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin-analytics] Error:', message);
    res.status(500).json({ error: message });
  }
}
