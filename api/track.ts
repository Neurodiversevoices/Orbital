/**
 * Page Event Tracking API
 *
 * Vercel API route: POST /api/track
 *
 * Lightweight analytics — logs page views and button clicks
 * from the landing page into page_events table.
 *
 * Body: { event, page?, referrer?, utm_source?, utm_medium?, utm_campaign?, metadata? }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role not configured');
  return createClient(url, serviceKey);
}

const ALLOWED_EVENTS = [
  'page_view',
  'email_captured',
  'pricing_clicked',
  'download_clicked',
  'support_clicked',
  'privacy_clicked',
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

  const { event, page, referrer, utm_source, utm_medium, utm_campaign, metadata } = req.body || {};

  if (!event || !ALLOWED_EVENTS.includes(event)) {
    res.status(400).json({ error: 'Invalid event type' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('page_events')
      .insert({
        event,
        page: page || null,
        referrer: referrer || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        metadata: metadata || {},
      });

    if (error) {
      console.error('[track] Insert error:', error);
      res.status(500).json({ error: 'Failed to track event' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
