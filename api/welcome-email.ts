/**
 * Welcome Email — Day 0
 *
 * Vercel API route: POST /api/welcome-email
 *
 * Called immediately after a user successfully creates an account.
 * 1. Sends the Day 0 welcome email via Resend.
 * 2. Enrolls the user in email_sequence_log so the daily cron
 *    (api/email-sequences) knows to send Days 3/7/30/60/90.
 *
 * Body: { email: string, first_name: string }
 *
 * Errors are logged but never fail the caller — this is fire-and-forget
 * from the client side.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role not configured');
  return createClient(url, serviceKey);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Email HTML — Day 0
// ---------------------------------------------------------------------------

function buildDay0Html(firstName: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6">
  <div style="padding:32px 0;border-bottom:1px solid #eee">
    <h1 style="font-size:22px;font-weight:700;margin:0">Orbital</h1>
  </div>
  <div style="padding:24px 0">
    <p>${greeting}</p>
    <p>Welcome to Orbital.</p>
    <p>The only thing you need to do right now is your first check-in. Open the app, swipe the orb to where you actually are today — not where you want to be — and optionally tag one driver.</p>
    <p>That's it. That's day one.</p>
    <p>One check-in per day is all it takes. Most people tell me it takes less time than unlocking their phone.</p>
    <p>At 30 days you'll have your first real picture of your capacity patterns. At 90 days you can generate a CCI artifact — a structured summary of your longitudinal capacity data. Something worth keeping.</p>
    <p style="margin-top:32px">— Eric<br><span style="color:#666;font-size:14px">Orbital Health Intelligence Inc.</span></p>
  </div>
  <div style="padding:16px 0;border-top:1px solid #eee;font-size:12px;color:#999">
    <p>Orbital Health Intelligence, Inc.<br>You received this because you created an account at orbitalhealth.app</p>
  </div>
</div>`.trim();
}

// ---------------------------------------------------------------------------
// Resend send helper
// ---------------------------------------------------------------------------

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('[welcome-email] RESEND_API_KEY not set — skipping email');
    return;
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'eric@orbitalhealth.app';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: `Eric from Orbital <${fromAddress}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[welcome-email] Resend error:', res.status, body);
  } else {
    console.log('[welcome-email] Day 0 email sent to', to);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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

  const { email, first_name } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const firstName = first_name ? String(first_name).trim() : '';

  // Respond immediately — email send and DB enroll happen after.
  // This prevents the mobile app from waiting on Resend latency.
  res.status(200).json({ ok: true });

  try {
    // 1. Send Day 0 email
    await sendEmail(
      normalizedEmail,
      "You're in. Here's what happens next.",
      buildDay0Html(firstName),
    );

    // 2. Enroll in sequence log
    // Look up user_id by email via admin API (nullable — sequence works without it)
    const supabase = getSupabaseAdmin();
    let userId: string | null = null;

    try {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const match = users.find(u => u.email?.toLowerCase() === normalizedEmail);
      if (match) userId = match.id;
    } catch (err) {
      console.warn('[welcome-email] Could not resolve user_id:', err);
    }

    const { error: dbError } = await supabase
      .from('email_sequence_log')
      .upsert(
        {
          user_id: userId,
          email: normalizedEmail,
          first_name: firstName,
          enrolled_at: new Date().toISOString(),
          emails_sent: {},
        },
        { onConflict: 'email' },
      );

    if (dbError) {
      console.error('[welcome-email] Failed to enroll in sequence:', dbError);
    } else {
      console.log('[welcome-email] Enrolled', normalizedEmail, 'in sequence');
    }
  } catch (err) {
    // Never propagates to client — response already sent above
    console.error('[welcome-email] Error after response:', err);
  }
}
