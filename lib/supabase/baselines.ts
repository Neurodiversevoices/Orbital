/**
 * Capacity Baselines Service
 *
 * Computes and retrieves capacity baselines from the last 60 days
 * of capacity_logs. Baselines summarise a user's typical capacity
 * profile including average capacity, variability, and dominant drivers.
 */

import { getSupabase, isSupabaseConfigured } from './client';
import { CapacityBaseline } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const WINDOW_DAYS = 60;
const DAYS_REQUIRED = 30;

// =============================================================================
// COMPUTE
// =============================================================================

/**
 * Compute a new baseline from the last 60 days of capacity logs.
 *
 * Skips any log where capacity_value is null.
 * Calculates:
 *  - baseline_capacity: mean of capacity_value
 *  - variability_index: standard deviation of capacity_value
 *  - dominant_drivers: frequency count from driver_data keys
 *  - confidence_score: log_count / 60
 *
 * Inserts the result into capacity_baselines and returns it.
 */
export async function computeBaseline(
  userId: string
): Promise<CapacityBaseline | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();

  const windowEnd = new Date();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  // Fetch capacity logs from the last 60 days
  const { data: logs, error: logsError } = await supabase
    .from('capacity_logs')
    .select('capacity_value, driver_data, occurred_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', windowStart.toISOString())
    .lte('occurred_at', windowEnd.toISOString())
    .order('occurred_at', { ascending: true });

  if (logsError) {
    if (__DEV__) console.error('[Baselines] Fetch logs failed:', logsError);
    return null;
  }

  // Filter to logs that have a capacity_value
  const validLogs = (logs || []).filter(
    (log: any) => log.capacity_value != null
  );

  const logCount = validLogs.length;

  // Calculate baseline_capacity (mean)
  let baselineCapacity: number | null = null;
  let variabilityIndex: number | null = null;

  if (logCount > 0) {
    const values = validLogs.map((log: any) => log.capacity_value as number);
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    const mean = sum / logCount;
    baselineCapacity = Math.round(mean * 1000) / 1000;

    // Calculate variability_index (standard deviation)
    if (logCount > 1) {
      const squaredDiffs = values.map((v: number) => (v - mean) ** 2);
      const variance =
        squaredDiffs.reduce((a: number, b: number) => a + b, 0) / (logCount - 1);
      variabilityIndex = Math.round(Math.sqrt(variance) * 1000) / 1000;
    } else {
      variabilityIndex = 0;
    }
  }

  // Calculate dominant_drivers (frequency count from driver_data)
  const driverFrequency: Record<string, number> = {};
  for (const log of validLogs) {
    const driverData = (log as any).driver_data;
    if (driverData && typeof driverData === 'object') {
      for (const key of Object.keys(driverData)) {
        driverFrequency[key] = (driverFrequency[key] || 0) + 1;
      }
    }
  }

  // confidence_score = log_count / 60, capped at 1.0
  const confidenceScore =
    Math.round(Math.min(logCount / WINDOW_DAYS, 1.0) * 1000) / 1000;

  // Insert baseline
  const { data: baseline, error: insertError } = await supabase
    .from('capacity_baselines')
    .insert({
      user_id: userId,
      data_window_start: windowStart.toISOString(),
      data_window_end: windowEnd.toISOString(),
      log_count: logCount,
      baseline_capacity: baselineCapacity,
      variability_index: variabilityIndex,
      dominant_drivers: driverFrequency,
      confidence_score: confidenceScore,
    })
    .select()
    .single();

  if (insertError) {
    if (__DEV__) console.error('[Baselines] Insert failed:', insertError);
    return null;
  }

  return baseline;
}

// =============================================================================
// READ
// =============================================================================

/**
 * Get the most recent baseline for a user.
 */
export async function getLatestBaseline(
  userId: string
): Promise<CapacityBaseline | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('capacity_baselines')
    .select('*')
    .eq('user_id', userId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.error('[Baselines] Get latest failed:', error);
    return null;
  }

  return data;
}

/**
 * Check how many unique days the user has logged in the last 60 days.
 * Returns readiness info for baseline computation.
 */
export async function getBaselineProgress(
  userId: string
): Promise<{ daysLogged: number; daysRequired: number; ready: boolean }> {
  const result = { daysLogged: 0, daysRequired: DAYS_REQUIRED, ready: false };

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
    if (__DEV__) console.error('[Baselines] Progress check failed:', error);
    return result;
  }

  // Count unique days (by date portion of occurred_at)
  const uniqueDays = new Set<string>();
  for (const log of logs || []) {
    const day = (log as any).occurred_at?.split('T')[0];
    if (day) uniqueDays.add(day);
  }

  result.daysLogged = uniqueDays.size;
  result.ready = result.daysLogged >= DAYS_REQUIRED;
  return result;
}
