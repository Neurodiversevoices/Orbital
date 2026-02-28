/**
 * Capacity Insights Service
 *
 * Utility functions that compute analytics from raw capacity_logs:
 *  - getDailyCapacity    — daily avg capacity over last N days
 *  - getDriverFrequency  — driver selection counts
 *  - getCapacityTrend    — 7-day vs prior 7-day comparison
 *  - getVolatility       — std dev of capacity_value
 *
 * All functions handle nulls, empty results, and return sensible defaults.
 */

import { getSupabase, isSupabaseConfigured } from './client';

// =============================================================================
// TYPES
// =============================================================================

export interface DailyCapacity {
  date: string;
  avgCapacity: number;
  logCount: number;
}

export interface DriverFrequency {
  [driver: string]: number;
}

export interface CapacityTrend {
  direction: 'improving' | 'declining' | 'stable';
  /** Absolute change: current7d − previous7d */
  delta: number;
  current7d: number | null;
  previous7d: number | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Fetch capacity_logs for a user within the last `days` days. */
async function fetchRecentLogs(
  userId: string,
  days: number,
): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('capacity_logs')
    .select('occurred_at, capacity_value, driver_data, state')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: true });

  if (error) {
    if (__DEV__) console.error('[capacityInsights] fetchRecentLogs failed:', error);
    return [];
  }

  return data || [];
}

// =============================================================================
// getDailyCapacity
// =============================================================================

/**
 * Returns daily average capacity and log count for the last N days.
 * Days with no logs are omitted from the result.
 */
export async function getDailyCapacity(
  userId: string,
  days: number = 30,
): Promise<DailyCapacity[]> {
  const logs = await fetchRecentLogs(userId, days);
  if (logs.length === 0) return [];

  // Group by date
  const byDate = new Map<string, number[]>();
  for (const log of logs) {
    const day = (log.occurred_at as string).split('T')[0];
    const cv = log.capacity_value as number | null;
    if (cv == null) continue;

    if (!byDate.has(day)) byDate.set(day, []);
    byDate.get(day)!.push(cv);
  }

  const result: DailyCapacity[] = [];
  for (const [date, values] of byDate) {
    const sum = values.reduce((a, b) => a + b, 0);
    result.push({
      date,
      avgCapacity: round3(sum / values.length),
      logCount: values.length,
    });
  }

  // Sort chronologically
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

// =============================================================================
// getDriverFrequency
// =============================================================================

/**
 * Returns how many times each driver was selected (value > 0 in driver_data)
 * over the last N days.
 */
export async function getDriverFrequency(
  userId: string,
  days: number = 30,
): Promise<DriverFrequency> {
  const logs = await fetchRecentLogs(userId, days);
  const freq: DriverFrequency = {};

  for (const log of logs) {
    const dd = log.driver_data;
    if (dd && typeof dd === 'object') {
      for (const [key, value] of Object.entries(dd)) {
        if (typeof value === 'number' && value > 0) {
          freq[key] = (freq[key] || 0) + 1;
        }
      }
    }
  }

  return freq;
}

// =============================================================================
// getCapacityTrend
// =============================================================================

/**
 * Compares the last 7 days' average capacity vs the previous 7 days.
 * Returns direction (improving / declining / stable) and the delta.
 *
 * "Stable" threshold: |delta| < 0.05
 */
export async function getCapacityTrend(
  userId: string,
): Promise<CapacityTrend> {
  const DEFAULT: CapacityTrend = {
    direction: 'stable',
    delta: 0,
    current7d: null,
    previous7d: null,
  };

  // Fetch 14 days of logs to cover both windows
  const logs = await fetchRecentLogs(userId, 14);
  if (logs.length === 0) return DEFAULT;

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const currentCutoff = now - sevenDaysMs;
  const previousCutoff = now - 2 * sevenDaysMs;

  const currentValues: number[] = [];
  const previousValues: number[] = [];

  for (const log of logs) {
    const cv = log.capacity_value as number | null;
    if (cv == null) continue;

    const ts = new Date(log.occurred_at).getTime();
    if (ts >= currentCutoff) {
      currentValues.push(cv);
    } else if (ts >= previousCutoff) {
      previousValues.push(cv);
    }
  }

  const current7d =
    currentValues.length > 0
      ? round3(currentValues.reduce((a, b) => a + b, 0) / currentValues.length)
      : null;

  const previous7d =
    previousValues.length > 0
      ? round3(previousValues.reduce((a, b) => a + b, 0) / previousValues.length)
      : null;

  if (current7d == null || previous7d == null) {
    return { direction: 'stable', delta: 0, current7d, previous7d };
  }

  const delta = round3(current7d - previous7d);
  const STABLE_THRESHOLD = 0.05;

  let direction: 'improving' | 'declining' | 'stable';
  if (delta > STABLE_THRESHOLD) {
    direction = 'improving';
  } else if (delta < -STABLE_THRESHOLD) {
    direction = 'declining';
  } else {
    direction = 'stable';
  }

  return { direction, delta, current7d, previous7d };
}

// =============================================================================
// getVolatility
// =============================================================================

/**
 * Standard deviation of capacity_value over the last N days.
 * Returns 0 for single-value sets, null if no data.
 */
export async function getVolatility(
  userId: string,
  days: number = 30,
): Promise<number | null> {
  const logs = await fetchRecentLogs(userId, days);

  const values: number[] = [];
  for (const log of logs) {
    const cv = log.capacity_value as number | null;
    if (cv != null) values.push(cv);
  }

  if (values.length === 0) return null;
  if (values.length === 1) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance =
    squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);

  return round3(Math.sqrt(variance));
}
