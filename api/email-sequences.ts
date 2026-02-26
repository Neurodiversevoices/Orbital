/**
 * Email Sequence Processor
 *
 * Vercel cron route: GET /api/email-sequences
 * Schedule: daily at 14:00 UTC (09:00 EST) — configured in vercel.json
 *
 * Queries email_sequence_log for all enrolled users and sends any
 * sequence emails that are due but not yet sent.
 *
 * Sequence:
 *   Day  3 — Quick check-in nudge
 *   Day  7 — One week milestone
 *   Day 30 — 30-day CCI report available
 *   Day 60 — 60-day CCI report available
 *   Day 90 — 90-day CCI report available
 *
 * Emails are idempotent: emails_sent JSONB is checked before sending.
 * A missed cron run will catch up on the next run (>= threshold, not ==).
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

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('[email-sequences] RESEND_API_KEY not set — skipping');
    return false;
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'eric@orbitalhealth.app';

  try {
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
      console.error('[email-sequences] Resend error:', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email-sequences] Resend fetch failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Email HTML builders
// ---------------------------------------------------------------------------

const BASE_STYLES = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6`;

function wrapEmail(body: string): string {
  return `
<div style="${BASE_STYLES}">
  <div style="padding:32px 0;border-bottom:1px solid #eee">
    <h1 style="font-size:22px;font-weight:700;margin:0">Orbital</h1>
  </div>
  <div style="padding:24px 0">
    ${body}
  </div>
  <div style="padding:16px 0;border-top:1px solid #eee;font-size:12px;color:#999">
    <p>Orbital Health Intelligence, Inc.<br>You received this because you created an account at orbitalhealth.app</p>
  </div>
</div>`.trim();
}

function sig(name = 'Eric'): string {
  return `<p style="margin-top:32px">— ${name}</p>`;
}

// ---------------------------------------------------------------------------
// Day 3
// ---------------------------------------------------------------------------

function buildDay3Html(firstName: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return wrapEmail(`
    <p>${greeting}</p>
    <p>Three days in. How's it going?</p>
    <p>If you've been logging consistently — great. The data is already starting to build.</p>
    <p>If you've missed a day or two — that's completely normal. Orbital isn't about perfection. It's about honest signal over time. Log today and keep going.</p>
    <p>One thing that helps: log at the same time every day. End of day works well for most people.</p>
    ${sig()}
  `);
}

// ---------------------------------------------------------------------------
// Day 7
// ---------------------------------------------------------------------------

function buildDay7Html(firstName: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return wrapEmail(`
    <p>${greeting}</p>
    <p>You've been tracking for a week. That's more longitudinal capacity data than most people ever collect about themselves.</p>
    <p>By now you might be noticing your first patterns. Most people find one of three things surprising in week one:</p>
    <ol style="padding-left:20px">
      <li>Their capacity varies more than they thought</li>
      <li>One driver matters far more than they expected</li>
      <li>Their "bad days" actually have a predictable precursor</li>
    </ol>
    <p>Keep going. The next 23 days are where the real picture starts to form.</p>
    <p>At 30 days you'll have the option to generate your first CCI report.</p>
    ${sig()}
  `);
}

// ---------------------------------------------------------------------------
// Day 30
// ---------------------------------------------------------------------------

function buildDay30Html(firstName: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return wrapEmail(`
    <p>${greeting}</p>
    <p>You made it to 30 days. That matters.</p>
    <p>Your first Capacity Composite Index report is now available. It synthesizes your 30 days of tracking into a clinical document — state distribution, top drivers, baseline stability score, and early pattern identification.</p>
    <p>It's yours for $99. One-time purchase. No subscription required.</p>
    <p><strong>Open the app to generate your 30-day CCI report.</strong></p>
    <p>Keep tracking for 60 and 90-day milestones — the picture gets significantly more detailed at 90 days.</p>
    ${sig()}
  `);
}

// ---------------------------------------------------------------------------
// Day 60
// ---------------------------------------------------------------------------

function buildDay60Html(firstName: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return wrapEmail(`
    <p>${greeting}</p>
    <p>Two months of capacity data. Most people don't realize how rare that is until they see what it reveals.</p>
    <p>Your 60-day CCI is now available — $149, one-time. This report adds baseline shift analysis, driver correlation deepening, and recovery velocity scoring.</p>
    <p><strong>Open the app to generate your 60-day CCI report.</strong></p>
    <p>30 more days to the full 90-day credential.</p>
    ${sig()}
  `);
}

// ---------------------------------------------------------------------------
// Day 90
// ---------------------------------------------------------------------------

function buildDay90Html(firstName: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return wrapEmail(`
    <p>${greeting}</p>
    <p>90 days. You did it.</p>
    <p>The 90-day CCI is the most complete clinical picture Orbital generates. Full longitudinal synthesis, statistical confidence intervals, resilience scoring, and a provider-ready summary you can share with a doctor, therapist, or use for an accommodation request.</p>
    <p>This is the document worth having.</p>
    <p><strong>Open the app to generate your 90-day CCI — $199.</strong></p>
    <p>Thank you for trusting Orbital with your data. It's yours. It always has been.</p>
    ${sig('Eric Parrish')}
    <p style="color:#666;font-size:14px;margin-top:4px">Orbital Health Intelligence Inc.<br>orbitalhealth.app</p>
  `);
}

// ---------------------------------------------------------------------------
// Sequence definition
// ---------------------------------------------------------------------------

interface SequenceEmail {
  key: string;
  minDays: number;
  subject: string;
  buildHtml: (firstName: string) => string;
}

const SEQUENCE: SequenceEmail[] = [
  {
    key: 'day_3',
    minDays: 3,
    subject: "Quick check — how's the tracking going?",
    buildHtml: buildDay3Html,
  },
  {
    key: 'day_7',
    minDays: 7,
    subject: "One week. Here's what your data is starting to show.",
    buildHtml: buildDay7Html,
  },
  {
    key: 'day_30',
    minDays: 30,
    subject: '30 days. Your first CCI report is ready.',
    buildHtml: buildDay30Html,
  },
  {
    key: 'day_60',
    minDays: 60,
    subject: "60 days. You're halfway to the full picture.",
    buildHtml: buildDay60Html,
  },
  {
    key: 'day_90',
    minDays: 90,
    subject: '90 days. This is the one worth keeping.',
    buildHtml: buildDay90Html,
  },
];

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Vercel cron jobs call with GET and include Authorization: Bearer <CRON_SECRET>
  // when CRON_SECRET is set. Enforce it if configured.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const now = Date.now();
  const summary: { email: string; sent: string[] }[] = [];

  try {
    const supabase = getSupabaseAdmin();

    // Fetch all enrolled users
    const { data: rows, error } = await supabase
      .from('email_sequence_log')
      .select('id, email, first_name, enrolled_at, emails_sent');

    if (error) {
      console.error('[email-sequences] Failed to fetch sequence log:', error);
      res.status(500).json({ error: 'Failed to fetch sequence log' });
      return;
    }

    if (!rows || rows.length === 0) {
      res.status(200).json({ processed: 0, summary: [] });
      return;
    }

    for (const row of rows) {
      const emailsSent: Record<string, string> = row.emails_sent || {};
      const enrolledAt = new Date(row.enrolled_at).getTime();
      const daysSince = Math.floor((now - enrolledAt) / (1000 * 60 * 60 * 24));
      const sentThisRun: string[] = [];

      for (const step of SEQUENCE) {
        // Skip if not yet due, or already sent
        if (daysSince < step.minDays) continue;
        if (emailsSent[step.key]) continue;

        const html = step.buildHtml(row.first_name || '');
        const ok = await sendEmail(row.email, step.subject, html);

        if (ok) {
          emailsSent[step.key] = new Date().toISOString();
          sentThisRun.push(step.key);
          console.log(`[email-sequences] Sent ${step.key} to ${row.email}`);
        }
      }

      // Persist updates if any emails were sent
      if (sentThisRun.length > 0) {
        const { error: updateError } = await supabase
          .from('email_sequence_log')
          .update({ emails_sent: emailsSent })
          .eq('id', row.id);

        if (updateError) {
          console.error(`[email-sequences] Failed to update emails_sent for ${row.email}:`, updateError);
        }

        summary.push({ email: row.email, sent: sentThisRun });
      }
    }

    console.log(`[email-sequences] Run complete. Processed ${rows.length} users, sent ${summary.length} batches.`);
    res.status(200).json({ processed: rows.length, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[email-sequences] Error:', message);
    res.status(500).json({ error: message });
  }
}
