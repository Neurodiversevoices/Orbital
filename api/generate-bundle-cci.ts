/**
 * Bundle CCI Generation — Server-Side Aggregate Report
 *
 * Vercel API route: POST /api/generate-bundle-cci
 *
 * Generates a Bundle CCI Report ($999) that aggregates capacity data across
 * ALL seats in a bundle. Runs server-side because it needs cross-user data
 * access (individual users can't read each other's capacity_logs).
 *
 * PRIVACY DOCTRINE:
 * - NO individual data exposed — only age-range patterns and workforce-level trends
 * - Minimum k-anonymity threshold: 5 (won't generate if fewer active seats)
 * - Output: aggregate percentages by state, weekly rhythm, trend direction
 * - Individual identities are NEVER included in the output
 *
 * Request body:
 * {
 *   bundle_id: string,          // Bundle UUID
 *   supabase_user_id: string,   // Must be the bundle owner
 * }
 *
 * Response:
 * {
 *   report: { ... },            // Aggregate analytics
 *   generated_at: string,
 *   bundle_id: string,
 *   seat_count: number,
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

function getSupabaseAdmin() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role not configured');
  return createClient(url, serviceKey);
}

// =============================================================================
// TYPES
// =============================================================================

interface AggregatePeriod {
  periodStart: string;
  periodEnd: string;
  greenPct: number;
  yellowPct: number;
  redPct: number;
  blackPct: number;
  totalSignals: number;
  contributorCount: number;
}

interface WeeklyRhythm {
  /** 0 = Sunday, 6 = Saturday */
  dayOfWeek: number;
  dayName: string;
  avgGreenPct: number;
  avgRedPct: number;
  avgSignalsPerPerson: number;
}

interface BundleCCIReport {
  /** Overall 90-day aggregate */
  overall: {
    greenPct: number;
    yellowPct: number;
    redPct: number;
    blackPct: number;
    totalSignals: number;
    uniqueDays: number;
    avgSignalsPerSeatPerDay: number;
  };
  /** Weekly aggregates (last 12 weeks) */
  weeklyTrend: AggregatePeriod[];
  /** Day-of-week rhythm */
  weeklyRhythm: WeeklyRhythm[];
  /** Trend direction over the 90-day window */
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    greenDelta: number; // change in green% first half vs second half
    description: string;
  };
  /** Seat participation stats (no individual IDs) */
  participation: {
    totalSeats: number;
    activeLoggers: number;
    avgDaysLogged: number;
    participationRate: number;
  };
}

// =============================================================================
// ANALYTICS FUNCTIONS
// =============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeWeeklyRhythm(
  logs: Array<{ occurred_at: string; state: string; user_id: string }>,
  seatCount: number
): WeeklyRhythm[] {
  const dayBuckets: Array<{ green: number; red: number; total: number }> = Array.from(
    { length: 7 },
    () => ({ green: 0, red: 0, total: 0 })
  );

  for (const log of logs) {
    const dow = new Date(log.occurred_at).getUTCDay();
    dayBuckets[dow].total++;
    if (log.state === 'green') dayBuckets[dow].green++;
    if (log.state === 'red' || log.state === 'black') dayBuckets[dow].red++;
  }

  return dayBuckets.map((bucket, i) => ({
    dayOfWeek: i,
    dayName: DAY_NAMES[i],
    avgGreenPct: bucket.total > 0 ? Math.round((bucket.green / bucket.total) * 100) : 0,
    avgRedPct: bucket.total > 0 ? Math.round((bucket.red / bucket.total) * 100) : 0,
    avgSignalsPerPerson: seatCount > 0 ? Math.round((bucket.total / seatCount) * 10) / 10 : 0,
  }));
}

function computeTrend(
  logs: Array<{ occurred_at: string; state: string }>,
  windowStart: Date,
  windowEnd: Date
): BundleCCIReport['trend'] {
  const midpoint = new Date((windowStart.getTime() + windowEnd.getTime()) / 2);

  const firstHalf = logs.filter(l => new Date(l.occurred_at) < midpoint);
  const secondHalf = logs.filter(l => new Date(l.occurred_at) >= midpoint);

  const greenPctFirst = firstHalf.length > 0
    ? (firstHalf.filter(l => l.state === 'green').length / firstHalf.length) * 100
    : 0;
  const greenPctSecond = secondHalf.length > 0
    ? (secondHalf.filter(l => l.state === 'green').length / secondHalf.length) * 100
    : 0;

  const delta = Math.round(greenPctSecond - greenPctFirst);

  let direction: 'improving' | 'declining' | 'stable';
  let description: string;

  if (delta > 5) {
    direction = 'improving';
    description = `Workforce capacity trending upward: green% increased by ${delta} points over the observation window.`;
  } else if (delta < -5) {
    direction = 'declining';
    description = `Workforce capacity trending downward: green% decreased by ${Math.abs(delta)} points over the observation window.`;
  } else {
    direction = 'stable';
    description = 'Workforce capacity is stable across the observation window.';
  }

  return { direction, greenDelta: delta, description };
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { bundle_id, supabase_user_id } = req.body || {};

  if (!bundle_id || !supabase_user_id) {
    res.status(400).json({ error: 'Missing required fields: bundle_id, supabase_user_id' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // =========================================================================
    // 1. Verify the requester owns this bundle
    // =========================================================================
    const { data: bundle, error: bundleError } = await supabase
      .from('bundles')
      .select('id, owner_id, bundle_type, max_seats, status')
      .eq('id', bundle_id)
      .single();

    if (bundleError || !bundle) {
      res.status(404).json({ error: 'Bundle not found' });
      return;
    }

    if (bundle.owner_id !== supabase_user_id) {
      res.status(403).json({ error: 'Only the bundle owner can generate a Bundle CCI' });
      return;
    }

    if (bundle.status !== 'active') {
      res.status(400).json({ error: 'Bundle is not active' });
      return;
    }

    // =========================================================================
    // 2. Get all active seat user IDs
    // =========================================================================
    const { data: seats } = await supabase
      .from('bundle_seats')
      .select('user_id')
      .eq('bundle_id', bundle_id)
      .eq('status', 'active')
      .not('user_id', 'is', null);

    const seatUserIds = (seats || [])
      .map(s => s.user_id)
      .filter((id): id is string => id != null);

    // k-anonymity check: minimum 5 active seats
    if (seatUserIds.length < 5) {
      res.status(400).json({
        error: `Insufficient active seats for aggregate report. Need at least 5, have ${seatUserIds.length}. This protects individual privacy.`,
      });
      return;
    }

    // =========================================================================
    // 3. Query capacity_logs for all seat holders (90-day window)
    // =========================================================================
    const windowEnd = new Date();
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 90);

    const { data: logs, error: logsError } = await supabase
      .from('capacity_logs')
      .select('user_id, occurred_at, state')
      .in('user_id', seatUserIds)
      .gte('occurred_at', windowStart.toISOString())
      .lte('occurred_at', windowEnd.toISOString())
      .is('deleted_at', null)
      .eq('is_demo', false);

    if (logsError) {
      res.status(500).json({ error: `Failed to query capacity logs: ${logsError.message}` });
      return;
    }

    const allLogs = logs || [];

    if (allLogs.length === 0) {
      res.status(400).json({ error: 'No capacity logs found in the 90-day window' });
      return;
    }

    // =========================================================================
    // 4. Compute aggregate analytics (NO individual data in output)
    // =========================================================================

    // Overall stats
    const green = allLogs.filter(l => l.state === 'green').length;
    const yellow = allLogs.filter(l => l.state === 'yellow').length;
    const red = allLogs.filter(l => l.state === 'red').length;
    const black = allLogs.filter(l => l.state === 'black').length;
    const total = allLogs.length;

    const uniqueDays = new Set(allLogs.map(l => l.occurred_at.slice(0, 10))).size;
    const uniqueLoggers = new Set(allLogs.map(l => l.user_id)).size;

    // Per-user day counts for participation
    const userDayCounts = new Map<string, Set<string>>();
    for (const log of allLogs) {
      const day = log.occurred_at.slice(0, 10);
      if (!userDayCounts.has(log.user_id)) userDayCounts.set(log.user_id, new Set());
      userDayCounts.get(log.user_id)!.add(day);
    }
    const avgDaysLogged = userDayCounts.size > 0
      ? Math.round(
          Array.from(userDayCounts.values()).reduce((sum, s) => sum + s.size, 0) /
          userDayCounts.size
        )
      : 0;

    // Weekly trend (last 12 weeks)
    const weeklyTrend: AggregatePeriod[] = [];
    for (let w = 11; w >= 0; w--) {
      const weekEnd = new Date(windowEnd);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekLogs = allLogs.filter(l => {
        const d = new Date(l.occurred_at);
        return d >= weekStart && d < weekEnd;
      });

      const wTotal = weekLogs.length;
      const contributors = new Set(weekLogs.map(l => l.user_id)).size;

      weeklyTrend.push({
        periodStart: weekStart.toISOString().slice(0, 10),
        periodEnd: weekEnd.toISOString().slice(0, 10),
        greenPct: wTotal > 0 ? Math.round((weekLogs.filter(l => l.state === 'green').length / wTotal) * 100) : 0,
        yellowPct: wTotal > 0 ? Math.round((weekLogs.filter(l => l.state === 'yellow').length / wTotal) * 100) : 0,
        redPct: wTotal > 0 ? Math.round((weekLogs.filter(l => l.state === 'red').length / wTotal) * 100) : 0,
        blackPct: wTotal > 0 ? Math.round((weekLogs.filter(l => l.state === 'black').length / wTotal) * 100) : 0,
        totalSignals: wTotal,
        contributorCount: contributors,
      });
    }

    // Weekly rhythm
    const weeklyRhythm = computeWeeklyRhythm(allLogs, seatUserIds.length);

    // Trend
    const trend = computeTrend(allLogs, windowStart, windowEnd);

    // =========================================================================
    // 5. Build report (aggregate only — no individual identifiers)
    // =========================================================================
    const report: BundleCCIReport = {
      overall: {
        greenPct: Math.round((green / total) * 100),
        yellowPct: Math.round((yellow / total) * 100),
        redPct: Math.round((red / total) * 100),
        blackPct: Math.round((black / total) * 100),
        totalSignals: total,
        uniqueDays,
        avgSignalsPerSeatPerDay: uniqueDays > 0
          ? Math.round((total / seatUserIds.length / uniqueDays) * 10) / 10
          : 0,
      },
      weeklyTrend,
      weeklyRhythm,
      trend,
      participation: {
        totalSeats: seatUserIds.length,
        activeLoggers: uniqueLoggers,
        avgDaysLogged,
        participationRate: Math.round((uniqueLoggers / seatUserIds.length) * 100),
      },
    };

    res.status(200).json({
      report,
      generated_at: new Date().toISOString(),
      bundle_id,
      seat_count: seatUserIds.length,
      observation_window: {
        start: windowStart.toISOString().slice(0, 10),
        end: windowEnd.toISOString().slice(0, 10),
      },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate-bundle-cci] Error:', message);
    res.status(500).json({ error: message });
  }
}
