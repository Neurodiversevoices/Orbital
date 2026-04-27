import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/server/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('founders_public_count')
    .select('paid_count, slots_remaining')
    .single();

  if (error) {
    console.error('[founders/count] Error:', error);
    res.status(500).json({ error: 'Server error' });
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.status(200).json({
    paid_count: data.paid_count ?? 0,
    slots_remaining: data.slots_remaining ?? 100,
  });
}
