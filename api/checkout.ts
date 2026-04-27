import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStripe } from '../lib/server/stripe';
import { getSupabaseAdmin } from '../lib/server/supabase-admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const { email: rawEmail, source } = req.body || {};
  if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
    res.status(400).json({ ok: false, error: 'Valid email required' });
    return;
  }

  const email = rawEmail.toLowerCase().trim();
  const supabase = getSupabaseAdmin();

  // Check sold-out
  const { count, error: countError } = await supabase
    .from('founders')
    .select('*', { count: 'exact', head: true })
    .eq('is_paid', true);

  if (countError) {
    console.error('[checkout] Count error:', countError);
    res.status(500).json({ ok: false, error: 'Server error' });
    return;
  }

  if ((count ?? 0) >= 100) {
    res.status(200).json({ ok: false, reason: 'sold_out' });
    return;
  }

  // UPSERT founder row
  const { error: upsertError } = await supabase
    .from('founders')
    .upsert({ email, source: source || 'landing' }, { onConflict: 'email' });

  if (upsertError) {
    console.error('[checkout] Upsert error:', upsertError);
    res.status(500).json({ ok: false, error: 'Server error' });
    return;
  }

  const priceId = process.env.STRIPE_PRICE_FOUNDER_ORBITAL_99;
  if (!priceId) {
    res.status(500).json({ ok: false, error: 'Founder price not configured' });
    return;
  }

  const stripe = getStripe();
  const origin = req.headers.origin || 'https://orbitalhealth.app';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: `${origin}/founder/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
    metadata: {
      product: 'orbital_founder_year_99',
      founder_email: email,
      source: source || 'landing',
    },
  });

  // Store checkout session ID
  await supabase
    .from('founders')
    .update({ stripe_checkout_session_id: session.id })
    .eq('email', email);

  res.status(200).json({ ok: true, checkout_url: session.url });
}
