/**
 * Waitlist Signup API
 *
 * Vercel API route: POST /api/waitlist
 *
 * Inserts email into waitlist_signups table.
 * Sends founder welcome email via Resend if RESEND_API_KEY is configured.
 *
 * Body: { email, source?, utm_source?, utm_medium?, utm_campaign? }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role not configured');
  return createClient(url, serviceKey);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendWelcomeEmail(email: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('[waitlist] RESEND_API_KEY not set — skipping welcome email');
    return;
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'eric@orbitalhealth.app';

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6">
  <div style="padding:32px 0;border-bottom:1px solid #eee">
    <h1 style="font-size:22px;font-weight:700;margin:0">Welcome to Orbital</h1>
  </div>
  <div style="padding:24px 0">
    <p>Hey — Eric here, founder of Orbital.</p>
    <p>Thanks for signing up. You're now on the founding access list.</p>
    <p><strong>What Orbital does:</strong> It's a capacity tracking tool. You log how you're doing each day — resourced, stretched, or depleted — and over time, Orbital reveals your personal patterns. No journals, no long forms. Just a quick daily check-in.</p>
    <p>It's built for people whose capacity fluctuates in ways that standard tools don't capture — neurodivergent individuals, people with chronic conditions, caregivers, and anyone who wants to understand their own rhythms.</p>
    <p><strong>What's next:</strong></p>
    <ul style="padding-left:20px">
      <li>You'll get early access when we open the next cohort</li>
      <li>First 100 founding members get 3 months of Pro free with CCI purchase</li>
      <li>The app is available now on <a href="https://apps.apple.com/app/id6757295146" style="color:#0066cc">App Store</a> and <a href="https://play.google.com/store/apps/details?id=com.erparris.orbital" style="color:#0066cc">Google Play</a></li>
    </ul>
    <p>If you have any questions, just reply to this email.</p>
    <p style="margin-top:24px">— Eric<br><span style="color:#666;font-size:14px">Founder, Orbital Health Intelligence</span></p>
  </div>
  <div style="padding:16px 0;border-top:1px solid #eee;font-size:12px;color:#999">
    <p>Orbital Health Intelligence, Inc.<br>You received this because you signed up at orbitalhealth.app</p>
  </div>
</div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `Eric from Orbital <${fromAddress}>`,
        to: [email],
        subject: "Welcome to Orbital — here's what's next",
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[waitlist] Resend error:', res.status, body);
    } else {
      console.log('[waitlist] Welcome email sent to', email);
    }
  } catch (err) {
    console.error('[waitlist] Failed to send welcome email:', err);
  }
}

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

  const { email, source, utm_source, utm_medium, utm_campaign } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('waitlist_signups')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          source: source || 'hero',
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
        },
        { onConflict: 'email' },
      );

    if (error) {
      console.error('[waitlist] Insert error:', error);
      res.status(500).json({ error: 'Failed to save signup' });
      return;
    }

    // Fire-and-forget welcome email (don't block response)
    sendWelcomeEmail(email.toLowerCase().trim()).catch(() => {});

    res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[waitlist] Error:', message);
    res.status(500).json({ error: message });
  }
}
