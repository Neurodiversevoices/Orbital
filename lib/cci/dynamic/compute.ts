/**
 * Dynamic CCI v1 — Compute Layer
 *
 * Pure functions. No side effects. No async. No DOM.
 * Input:  CapacityLog[], CCIComputeConfig
 * Output: CCIDynamicData | null
 */

import { CapacityLog, CapacityState } from '../../../types';
import { getUniqueDates } from '../../baselineUtils';
import { downsampleTo6Points } from '../summaryChart';
import {
  CCIComputeConfig,
  CCIDynamicData,
  CCIMonthlyBreakdown,
} from './types';

// =============================================================================
// LOCAL UTILITY FUNCTIONS
// =============================================================================
// Re-implemented locally because trajectoryReports.ts functions are module-private.
// These are trivial (3-5 lines each).

function stateToPercent(state: CapacityState): number {
  switch (state) {
    case 'resourced': return 100;
    case 'stretched': return 50;
    case 'depleted': return 0;
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function volatility(values: number[]): number {
  if (values.length < 2) return 0;
  let totalChange = 0;
  for (let i = 1; i < values.length; i++) {
    totalChange += Math.abs(values[i] - values[i - 1]);
  }
  return totalChange / (values.length - 1);
}

function getLocalDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Count calendar days between two YYYY-MM-DD strings, inclusive. */
function calendarDaysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/** Get 3-character month abbreviation from YYYY-MM-DD. */
function monthAbbrev(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = parseInt(dateStr.substring(5, 7), 10) - 1;
  return months[monthIndex] || '???';
}

// =============================================================================
// COMPUTE FUNCTIONS
// =============================================================================

/**
 * Determine actual observation window from logs within config bounds.
 */
export function computeObservationWindow(
  logs: CapacityLog[],
  config: CCIComputeConfig,
): { start: string; end: string } {
  const windowLogs = logs.filter(log => {
    const d = log.localDate || getLocalDate(log.timestamp);
    return d >= config.windowStart && d <= config.windowEnd;
  });

  if (windowLogs.length === 0) {
    return { start: config.windowStart, end: config.windowEnd };
  }

  const dates = windowLogs.map(l => l.localDate || getLocalDate(l.timestamp)).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

/**
 * Compute tracking continuity: days with entries / total days in window.
 */
export function computeTrackingContinuity(
  logs: CapacityLog[],
  start: string,
  end: string,
): {
  percent: number;
  rating: 'high' | 'moderate' | 'low';
  daysWithEntries: number;
  totalDays: number;
} {
  const windowLogs = logs.filter(log => {
    const d = log.localDate || getLocalDate(log.timestamp);
    return d >= start && d <= end;
  });

  const uniqueDates = getUniqueDates(windowLogs);
  const daysWithEntries = uniqueDates.size;
  const totalDays = calendarDaysBetween(start, end);

  const percent = totalDays > 0
    ? Math.round((daysWithEntries / totalDays) * 100)
    : 0;

  const clampedPercent = Math.max(0, Math.min(100, percent));

  let rating: 'high' | 'moderate' | 'low';
  if (clampedPercent >= 70) rating = 'high';
  else if (clampedPercent >= 40) rating = 'moderate';
  else rating = 'low';

  return { percent: clampedPercent, rating, daysWithEntries, totalDays };
}

/**
 * Compute pattern stability from daily normalized values.
 * stability = 100 - normalized volatility (clamped 0-100).
 */
export function computePatternStability(
  dailyValues: number[],
): { stabilityPercent: number; volatilityRaw: number } {
  const vol = volatility(dailyValues);
  const maxPossibleVolatility = 100;
  const normalizedVolatility = Math.min(100, (vol / maxPossibleVolatility) * 100);
  const stabilityPercent = Math.round(100 - normalizedVolatility);

  return {
    stabilityPercent: Math.max(0, Math.min(100, stabilityPercent)),
    volatilityRaw: Math.round(vol * 100) / 100,
  };
}

/**
 * Deterministic verdict from stability + continuity.
 */
export function computeVerdict(
  stabilityPercent: number,
  continuityPercent: number,
): string {
  if (continuityPercent < 40) return 'Insufficient Observation';
  if (stabilityPercent >= 80) {
    return continuityPercent >= 70
      ? 'Interpretable Capacity Trends'
      : 'Partial Capacity Trends';
  }
  if (stabilityPercent >= 50) {
    return continuityPercent >= 70
      ? 'Variable Capacity Patterns'
      : 'Partial Capacity Patterns';
  }
  return continuityPercent >= 70
    ? 'Highly Variable Capacity'
    : 'Insufficient Stability';
}

/**
 * Aggregate logs into daily normalized values, then downsample to 6 points.
 * Missing days are excluded (null gaps policy).
 */
export function computeChartValues(
  logs: CapacityLog[],
  start: string,
  end: string,
): number[] {
  const windowLogs = logs.filter(log => {
    const d = log.localDate || getLocalDate(log.timestamp);
    return d >= start && d <= end;
  });

  // Group by localDate, compute daily mean
  const dailyMap = new Map<string, number[]>();
  for (const log of windowLogs) {
    const d = log.localDate || getLocalDate(log.timestamp);
    if (!dailyMap.has(d)) dailyMap.set(d, []);
    dailyMap.get(d)!.push(stateToPercent(log.state));
  }

  // Sort dates chronologically, compute mean per day
  const sortedDates = Array.from(dailyMap.keys()).sort();
  const dailyValues = sortedDates.map(d => mean(dailyMap.get(d)!));

  if (dailyValues.length === 0) return [50, 50, 50, 50, 50, 50];

  const downsampled = downsampleTo6Points(dailyValues, 6);

  // Clamp each value to 0-100
  return downsampled.map(v => Math.max(0, Math.min(100, Math.round(v))));
}

/**
 * Compute per-calendar-month breakdown.
 */
export function computeMonthlyBreakdown(
  logs: CapacityLog[],
  start: string,
  end: string,
): CCIMonthlyBreakdown[] {
  const windowLogs = logs.filter(log => {
    const d = log.localDate || getLocalDate(log.timestamp);
    return d >= start && d <= end;
  });

  // Group by YYYY-MM
  const monthMap = new Map<string, CapacityLog[]>();
  for (const log of windowLogs) {
    const d = log.localDate || getLocalDate(log.timestamp);
    const month = d.substring(0, 7); // YYYY-MM
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(log);
  }

  const sortedMonths = Array.from(monthMap.keys()).sort();

  return sortedMonths.map(month => {
    const monthLogs = monthMap.get(month)!;

    // Daily values for this month
    const dailyMap = new Map<string, number[]>();
    for (const log of monthLogs) {
      const d = log.localDate || getLocalDate(log.timestamp);
      if (!dailyMap.has(d)) dailyMap.set(d, []);
      dailyMap.get(d)!.push(stateToPercent(log.state));
    }
    const dailyValues = Array.from(dailyMap.keys()).sort().map(d => mean(dailyMap.get(d)!));

    const { stabilityPercent, volatilityRaw } = computePatternStability(dailyValues);

    const resourced = monthLogs.filter(l => l.state === 'resourced').length;
    const stretched = monthLogs.filter(l => l.state === 'stretched').length;
    const depleted = monthLogs.filter(l => l.state === 'depleted').length;

    return {
      month,
      signalCount: monthLogs.length,
      stability: stabilityPercent,
      volatility: Math.round(volatilityRaw),
      distribution: { resourced, stretched, depleted },
    };
  });
}

/**
 * Generate deterministic anonymized patient ID from seed.
 * Format: NNNNN-AAA (5 digits, dash, 3 uppercase letters).
 */
export function generateAnonymizedPatientId(seed: string): string {
  // Simple deterministic hash — not cryptographic, just consistent
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  // Ensure positive
  const positive = Math.abs(hash);

  // 5 digits
  const digits = String(positive % 100000).padStart(5, '0');

  // 3 letters: use different bit ranges of the hash
  const letters = [
    String.fromCharCode(65 + (positive % 26)),
    String.fromCharCode(65 + (Math.abs((hash >> 8) | 0) % 26)),
    String.fromCharCode(65 + (Math.abs((hash >> 16) | 0) % 26)),
  ].join('');

  return `${digits}-${letters}`;
}

/**
 * Derive 3 x-axis month labels from the observation window.
 */
function computeChartXLabels(start: string, end: string): [string, string, string] {
  const startMonth = parseInt(start.substring(5, 7), 10);
  const endMonth = parseInt(end.substring(5, 7), 10);
  const startYear = parseInt(start.substring(0, 4), 10);
  const endYear = parseInt(end.substring(0, 4), 10);

  // Collect all months in the window
  const months: string[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-01`;
    months.push(monthAbbrev(dateStr));
    m++;
    if (m > 12) { m = 1; y++; }
  }

  if (months.length <= 3) {
    while (months.length < 3) months.push(months[months.length - 1] || '???');
    return [months[0], months[1], months[2]];
  }

  // More than 3 months: first, middle, last
  const mid = Math.floor(months.length / 2);
  return [months[0], months[mid], months[months.length - 1]];
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Compute all dynamic CCI data from CapacityLog entries.
 * Returns null if insufficient unique logging days (Phase 3 gate).
 */
export function computeCCIDynamicData(
  logs: CapacityLog[],
  config: CCIComputeConfig,
): CCIDynamicData | null {
  // Filter to window
  const windowLogs = logs.filter(log => {
    const d = log.localDate || getLocalDate(log.timestamp);
    return d >= config.windowStart && d <= config.windowEnd;
  });

  // Phase 3 gate: require minimumDays unique days with ≥1 entry
  const uniqueLoggingDays = getUniqueDates(windowLogs);
  if (uniqueLoggingDays.size < config.minimumDays) {
    return null;
  }

  const { start, end } = computeObservationWindow(logs, config);

  // Determine if window is closed (end date is in the past)
  const today = getLocalDate(Date.now());
  const windowStatus: 'open' | 'closed' = end < today ? 'closed' : 'open';

  // Patient ID
  const patientId = generateAnonymizedPatientId(config.patientIdSeed || 'default');

  // Tracking continuity
  const continuity = computeTrackingContinuity(windowLogs, start, end);

  // Daily values for stability computation
  const dailyMap = new Map<string, number[]>();
  for (const log of windowLogs) {
    const d = log.localDate || getLocalDate(log.timestamp);
    if (!dailyMap.has(d)) dailyMap.set(d, []);
    dailyMap.get(d)!.push(stateToPercent(log.state));
  }
  const dailyValues = Array.from(dailyMap.keys()).sort().map(d => mean(dailyMap.get(d)!));

  // Stability
  const stability = computePatternStability(dailyValues);

  // Verdict
  const verdict = computeVerdict(stability.stabilityPercent, continuity.percent);

  // Chart
  const chartValues = computeChartValues(windowLogs, start, end);
  const chartXLabels = computeChartXLabels(start, end);

  // Monthly breakdown
  const monthlyBreakdown = computeMonthlyBreakdown(windowLogs, start, end);

  // Overall distribution
  const resourced = windowLogs.filter(l => l.state === 'resourced').length;
  const stretched = windowLogs.filter(l => l.state === 'stretched').length;
  const depleted = windowLogs.filter(l => l.state === 'depleted').length;

  return {
    observationStart: start,
    observationEnd: end,
    windowStatus,
    patientId,
    totalDaysInWindow: continuity.totalDays,
    daysWithEntries: continuity.daysWithEntries,
    trackingContinuityPercent: continuity.percent,
    trackingContinuityRating: continuity.rating,
    patternStabilityPercent: stability.stabilityPercent,
    volatilityRaw: stability.volatilityRaw,
    verdict,
    chartValues,
    chartXLabels,
    monthlyBreakdown,
    overallDistribution: {
      resourced,
      stretched,
      depleted,
      total: windowLogs.length,
    },
    totalSignals: windowLogs.length,
  };
}
