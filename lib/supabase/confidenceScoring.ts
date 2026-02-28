/**
 * Confidence Scoring Service
 *
 * Analyzes capacity logs and assigns confidence flags that indicate
 * data quality and logging consistency. Used for Phase 4 CCI reports.
 *
 * Flags per log:
 *   - consistent_pattern:  within 1 std dev of 14-day average
 *   - outlier:             more than 2 std dev from 14-day average
 *   - regular_logger:      user logged ≥ 5 of last 7 days
 *   - time_consistent:     gap between created_at and occurred_at < 2 hours
 *
 * Overall confidence score (0.0–1.0):
 *   - Logging consistency (40%): days logged in last 14 / 14
 *   - Pattern consistency (30%): % of logs within 1 std dev
 *   - Time integrity    (30%): % of logs with time_consistent = true
 */

import { getSupabase, isSupabaseConfigured } from './client';

// =============================================================================
// TYPES
// =============================================================================

export interface ConfidenceFlags {
  consistent_pattern: boolean;
  outlier: boolean;
  regular_logger: boolean;
  time_consistent: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Fetch capacity logs from the last `days` days for a user.
 * Returns only non-deleted logs with capacity_value.
 */
async function fetchRecentWithCapacity(
  userId: string,
  days: number,
): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('capacity_logs')
    .select('id, capacity_value, occurred_at, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('capacity_value', 'is', null)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: true });

  if (error) {
    if (__DEV__) console.error('[confidenceScoring] fetch failed:', error);
    return [];
  }

  return data || [];
}

// =============================================================================
// scoreLogConfidence
// =============================================================================

/**
 * Analyze a single capacity log entry and compute confidence flags.
 *
 * @param userId       The user who owns the log
 * @param logEntry     Object with at least: { capacity_value, occurred_at, created_at }
 */
export async function scoreLogConfidence(
  userId: string,
  logEntry: {
    capacity_value?: number | null;
    occurred_at?: string;
    created_at?: string;
  },
): Promise<ConfidenceFlags> {
  const defaults: ConfidenceFlags = {
    consistent_pattern: true,
    outlier: false,
    regular_logger: false,
    time_consistent: true,
  };

  if (logEntry.capacity_value == null) return defaults;

  const recentLogs = await fetchRecentWithCapacity(userId, 14);
  const values = recentLogs.map((l: any) => l.capacity_value as number);

  // ── consistent_pattern & outlier ────────────────────────────────────────
  if (values.length >= 2) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    const stdDev = Math.sqrt(
      squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1),
    );

    const cv = logEntry.capacity_value;
    const diff = Math.abs(cv - mean);

    defaults.consistent_pattern = diff <= stdDev;
    defaults.outlier = diff > 2 * stdDev;
  }

  // ── regular_logger ──────────────────────────────────────────────────────
  // Has the user logged at least 5 of the last 7 days?
  {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDayMs = sevenDaysAgo.getTime();

    const recentDays = new Set<string>();
    for (const log of recentLogs) {
      const ts = new Date(log.occurred_at).getTime();
      if (ts >= sevenDayMs) {
        recentDays.add((log.occurred_at as string).split('T')[0]);
      }
    }
    defaults.regular_logger = recentDays.size >= 5;
  }

  // ── time_consistent ────────────────────────────────────────────────────
  // Gap between created_at and occurred_at less than 2 hours
  if (logEntry.occurred_at && logEntry.created_at) {
    const occurredMs = new Date(logEntry.occurred_at).getTime();
    const createdMs = new Date(logEntry.created_at).getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    defaults.time_consistent = Math.abs(createdMs - occurredMs) < twoHoursMs;
  }

  return defaults;
}

// =============================================================================
// applyConfidenceFlags
// =============================================================================

/**
 * Update a capacity_log row with the computed confidence flags.
 */
export async function applyConfidenceFlags(
  logId: string,
  flags: ConfidenceFlags,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabase();

  const { error } = await supabase
    .from('capacity_logs')
    .update({ confidence_flags: flags as any })
    .eq('id', logId);

  if (error && __DEV__) {
    console.error('[confidenceScoring] applyConfidenceFlags failed:', error);
  }
}

// =============================================================================
// getConfidenceScore
// =============================================================================

/**
 * Compute an overall confidence score (0.0–1.0) for a user based on:
 *   - Logging consistency (40%): unique days in last 14 / 14
 *   - Pattern consistency (30%): % of logs within 1 std dev (consistent_pattern)
 *   - Time integrity (30%): % of logs where |created_at − occurred_at| < 2h
 */
export async function getConfidenceScore(
  userId: string,
): Promise<number> {
  const recentLogs = await fetchRecentWithCapacity(userId, 14);
  if (recentLogs.length === 0) return 0;

  // ── Logging consistency (40%) ──────────────────────────────────────────
  const uniqueDays = new Set<string>();
  for (const log of recentLogs) {
    uniqueDays.add((log.occurred_at as string).split('T')[0]);
  }
  const loggingConsistency = Math.min(uniqueDays.size / 14, 1.0);

  // ── Pattern consistency (30%) ──────────────────────────────────────────
  const values = recentLogs.map((l: any) => l.capacity_value as number);
  let patternConsistency = 1.0;

  if (values.length >= 2) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    const stdDev = Math.sqrt(
      squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1),
    );

    let withinOneSd = 0;
    for (const v of values) {
      if (Math.abs(v - mean) <= stdDev) withinOneSd++;
    }
    patternConsistency = withinOneSd / values.length;
  }

  // ── Time integrity (30%) ───────────────────────────────────────────────
  const twoHoursMs = 2 * 60 * 60 * 1000;
  let timeConsistentCount = 0;

  for (const log of recentLogs) {
    if (log.occurred_at && log.created_at) {
      const diff = Math.abs(
        new Date(log.created_at).getTime() - new Date(log.occurred_at).getTime(),
      );
      if (diff < twoHoursMs) timeConsistentCount++;
    } else {
      // If timestamps unavailable, count as consistent
      timeConsistentCount++;
    }
  }
  const timeIntegrity = timeConsistentCount / recentLogs.length;

  // ── Weighted score ─────────────────────────────────────────────────────
  const score =
    loggingConsistency * 0.4 +
    patternConsistency * 0.3 +
    timeIntegrity * 0.3;

  return round3(Math.min(score, 1.0));
}
