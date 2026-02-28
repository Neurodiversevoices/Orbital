/**
 * Enhanced Capacity Baseline Computation
 *
 * Queries the last 60 days of capacity_logs for a user and computes
 * a comprehensive baseline profile including:
 *   1. baseline_capacity   – mean capacity_value (nulls skipped)
 *   2. variability_index   – standard deviation of capacity_value
 *   3. sensory_tolerance   – average "sensory" value from driver_data
 *   4. cognitive_resilience – avg days to recover from capacity < 0.3 to > 0.6
 *   5. dominant_drivers     – frequency count of each driver key
 *   6. recovery_pattern     – JSONB: { avg_recovery_days, fastest, slowest }
 *   7. confidence_score     – unique_days / 60, capped at 1.0
 *
 * Returns null when fewer than 7 unique days of data exist.
 */

import { getSupabase, isSupabaseConfigured } from './client';
import { CapacityBaseline } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const WINDOW_DAYS = 60;
const MIN_DAYS_REQUIRED = 7;

/** Capacity threshold to count as "depleted" (start of a recovery episode). */
const DEPLETED_THRESHOLD = 0.3;
/** Capacity threshold to count as "recovered". */
const RECOVERED_THRESHOLD = 0.6;

// =============================================================================
// HELPERS
// =============================================================================

/** Round to 3 decimal places. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Extract date string (YYYY-MM-DD) from an ISO timestamp. */
function toDateKey(iso: string): string {
  return iso.split('T')[0];
}

// =============================================================================
// MAIN COMPUTATION
// =============================================================================

export async function computeBaseline(
  userId: string,
): Promise<CapacityBaseline | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();

  // Define 60-day window
  const windowEnd = new Date();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

  // ------------------------------------------------------------------
  // Fetch capacity logs within the window
  // ------------------------------------------------------------------
  const { data: rawLogs, error: fetchError } = await supabase
    .from('capacity_logs')
    .select('capacity_value, driver_data, occurred_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', windowStart.toISOString())
    .lte('occurred_at', windowEnd.toISOString())
    .order('occurred_at', { ascending: true });

  if (fetchError) {
    if (__DEV__) console.error('[computeBaseline] Fetch logs failed:', fetchError);
    return null;
  }

  const allLogs = rawLogs || [];

  // ------------------------------------------------------------------
  // Gate: need at least MIN_DAYS_REQUIRED unique days
  // ------------------------------------------------------------------
  const uniqueDays = new Set<string>();
  for (const log of allLogs) {
    const day = toDateKey((log as any).occurred_at);
    if (day) uniqueDays.add(day);
  }

  if (uniqueDays.size < MIN_DAYS_REQUIRED) {
    if (__DEV__) {
      console.log(
        `[computeBaseline] Only ${uniqueDays.size} unique days (need ${MIN_DAYS_REQUIRED}). Returning null.`,
      );
    }
    return null;
  }

  // Filter to logs with a capacity_value for numeric computations
  const validLogs = allLogs.filter((log: any) => log.capacity_value != null);
  const logCount = validLogs.length;

  // ------------------------------------------------------------------
  // 1. baseline_capacity – mean of capacity_value
  // ------------------------------------------------------------------
  let baselineCapacity: number | null = null;
  let mean = 0;

  if (logCount > 0) {
    const values = validLogs.map((log: any) => log.capacity_value as number);
    const sum = values.reduce((a, b) => a + b, 0);
    mean = sum / logCount;
    baselineCapacity = round3(mean);
  }

  // ------------------------------------------------------------------
  // 2. variability_index – standard deviation of capacity_value
  // ------------------------------------------------------------------
  let variabilityIndex: number | null = null;

  if (logCount > 1) {
    const values = validLogs.map((log: any) => log.capacity_value as number);
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (logCount - 1);
    variabilityIndex = round3(Math.sqrt(variance));
  } else if (logCount === 1) {
    variabilityIndex = 0;
  }

  // ------------------------------------------------------------------
  // 3. sensory_tolerance – average "sensory" value from driver_data
  // ------------------------------------------------------------------
  let sensoryTolerance: number | null = null;
  {
    const sensoryValues: number[] = [];
    for (const log of allLogs) {
      const dd = (log as any).driver_data;
      if (dd && typeof dd === 'object' && dd.sensory != null) {
        sensoryValues.push(dd.sensory as number);
      }
    }
    if (sensoryValues.length > 0) {
      const sum = sensoryValues.reduce((a, b) => a + b, 0);
      sensoryTolerance = round3(sum / sensoryValues.length);
    }
  }

  // ------------------------------------------------------------------
  // 4 & 6. cognitive_resilience + recovery_pattern
  //
  // Walk through logs ordered by occurred_at. Track "episodes":
  //   - Episode starts when capacity_value < DEPLETED_THRESHOLD
  //   - Episode ends when capacity_value > RECOVERED_THRESHOLD
  //   - Recovery days = calendar days between start and end
  // ------------------------------------------------------------------
  let cognitiveResilience: number | null = null;
  const recoveryPattern: {
    avg_recovery_days: number | null;
    fastest: number | null;
    slowest: number | null;
  } = {
    avg_recovery_days: null,
    fastest: null,
    slowest: null,
  };

  {
    const recoveryDays: number[] = [];
    let episodeStartDate: string | null = null;

    for (const log of validLogs) {
      const cv = (log as any).capacity_value as number;
      const day = toDateKey((log as any).occurred_at);

      if (episodeStartDate === null) {
        // Not in an episode – look for depletion
        if (cv < DEPLETED_THRESHOLD) {
          episodeStartDate = day;
        }
      } else {
        // Currently in an episode – look for recovery
        if (cv > RECOVERED_THRESHOLD) {
          const startMs = new Date(episodeStartDate).getTime();
          const endMs = new Date(day).getTime();
          const daysDiff = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
          recoveryDays.push(daysDiff);
          episodeStartDate = null;
        }
      }
    }

    if (recoveryDays.length > 0) {
      const sum = recoveryDays.reduce((a, b) => a + b, 0);
      const avg = sum / recoveryDays.length;
      cognitiveResilience = round3(avg);

      recoveryPattern.avg_recovery_days = round3(avg);
      recoveryPattern.fastest = Math.min(...recoveryDays);
      recoveryPattern.slowest = Math.max(...recoveryDays);
    }
  }

  // ------------------------------------------------------------------
  // 5. dominant_drivers – frequency count of each driver key
  //    Counts each key in driver_data where value > 0
  // ------------------------------------------------------------------
  const dominantDrivers: Record<string, number> = {};
  for (const log of allLogs) {
    const dd = (log as any).driver_data;
    if (dd && typeof dd === 'object') {
      for (const [key, value] of Object.entries(dd)) {
        if (typeof value === 'number' && value > 0) {
          dominantDrivers[key] = (dominantDrivers[key] || 0) + 1;
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // 7. confidence_score – unique_days / 60, capped at 1.0
  // ------------------------------------------------------------------
  const confidenceScore = round3(Math.min(uniqueDays.size / WINDOW_DAYS, 1.0));

  // ------------------------------------------------------------------
  // INSERT into capacity_baselines
  // ------------------------------------------------------------------
  const { data: baseline, error: insertError } = await supabase
    .from('capacity_baselines')
    .insert({
      user_id: userId,
      data_window_start: windowStart.toISOString(),
      data_window_end: windowEnd.toISOString(),
      log_count: logCount,
      baseline_capacity: baselineCapacity,
      variability_index: variabilityIndex,
      sensory_tolerance: sensoryTolerance,
      cognitive_resilience: cognitiveResilience,
      recovery_pattern: recoveryPattern,
      dominant_drivers: dominantDrivers,
      confidence_score: confidenceScore,
      version: '2.0',
    })
    .select()
    .single();

  if (insertError) {
    if (__DEV__) console.error('[computeBaseline] Insert failed:', insertError);
    return null;
  }

  if (__DEV__) {
    console.log('[computeBaseline] Baseline computed:', {
      logCount,
      uniqueDays: uniqueDays.size,
      baselineCapacity,
      variabilityIndex,
      sensoryTolerance,
      cognitiveResilience,
      recoveryPattern,
      confidenceScore,
    });
  }

  return baseline;
}
