/**
 * Baseline Progress Tracker
 *
 * Checks how many unique days a user has logged capacity signals
 * in the last 60 days, and reports readiness for baseline computation.
 */

import { getSupabase, isSupabaseConfigured } from './client';

// =============================================================================
// CONSTANTS
// =============================================================================

const WINDOW_DAYS = 60;
const DAYS_REQUIRED = 30;

// =============================================================================
// TYPES
// =============================================================================

export interface BaselineProgress {
  /** Number of unique days with at least one capacity log in the window. */
  daysLogged: number;
  /** Minimum days required before a baseline can be computed. */
  daysRequired: number;
  /** True when daysLogged >= daysRequired. */
  ready: boolean;
  /** 0–100 percentage toward readiness. */
  percentComplete: number;
}

// =============================================================================
// MAIN
// =============================================================================

/**
 * Get baseline readiness progress for a user.
 *
 * Counts unique days with at least one non-deleted capacity log
 * in the trailing 60-day window.
 */
export async function getBaselineProgress(
  userId: string,
): Promise<BaselineProgress> {
  const result: BaselineProgress = {
    daysLogged: 0,
    daysRequired: DAYS_REQUIRED,
    ready: false,
    percentComplete: 0,
  };

  if (!isSupabaseConfigured()) return result;

  const supabase = getSupabase();

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  const { data: logs, error } = await supabase
    .from('capacity_logs')
    .select('occurred_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', windowStart.toISOString())
    .order('occurred_at', { ascending: true });

  if (error) {
    if (__DEV__) console.error('[baselineProgress] Query failed:', error);
    return result;
  }

  // Count unique days by date portion of occurred_at
  const uniqueDays = new Set<string>();
  for (const log of logs || []) {
    const day = ((log as any).occurred_at as string)?.split('T')[0];
    if (day) uniqueDays.add(day);
  }

  result.daysLogged = uniqueDays.size;
  result.ready = result.daysLogged >= DAYS_REQUIRED;
  result.percentComplete = Math.min(
    Math.round((result.daysLogged / DAYS_REQUIRED) * 100),
    100,
  );

  return result;
}
