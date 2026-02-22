/**
 * CCI Projection Model — Weighted Linear Regression
 *
 * Takes the last 21-30 days of daily capacity scores,
 * fits a weighted linear regression (recent days weighted higher),
 * and projects forward 6 weeks (42 days).
 *
 * Pure functions. No side effects. No async. No DOM.
 */

import { CapacityLog, CapacityState } from '../../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface CCIProjectionResult {
  /** Projected daily values for the next 42 days (0-100 scale) */
  projectedPoints: number[];
  /** Weeks until projection crosses critical threshold (33/100), null if never */
  weeksToCritical: number | null;
  /** Rate of change in points per week (negative = declining) */
  trendRate: number;
  /** Whether the projection shows overload risk */
  hasOverloadRisk: boolean;
  /** Regression slope (points per day) */
  slope: number;
  /** Regression intercept */
  intercept: number;
  /** Number of input days used */
  inputDays: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PROJECTION_DAYS = 42; // 6 weeks
const CRITICAL_THRESHOLD = 33; // Depleted zone boundary
const MIN_INPUT_DAYS = 14;
const MAX_INPUT_DAYS = 30;
const PREFERRED_INPUT_DAYS = 21;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function stateToPercent(state: CapacityState): number {
  switch (state) {
    case 'resourced': return 100;
    case 'stretched': return 50;
    case 'depleted': return 0;
  }
}

function getLocalDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// =============================================================================
// WEIGHTED LINEAR REGRESSION
// =============================================================================

/**
 * Fit a weighted linear regression where more recent days have higher weight.
 * Weight scheme: exponential decay from most recent (weight=1.0) to oldest.
 *
 * Returns { slope, intercept } where y = slope * x + intercept.
 * x is day index (0 = oldest input day, n-1 = most recent).
 */
function weightedLinearRegression(
  values: number[],
): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 50 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  // Exponential weights: most recent day (index n-1) gets weight 1.0,
  // oldest day (index 0) gets weight ~0.3 (decay factor 0.95^n)
  const decayFactor = 0.95;
  const weights = values.map((_, i) => Math.pow(decayFactor, n - 1 - i));

  let sumW = 0;
  let sumWX = 0;
  let sumWY = 0;
  let sumWXX = 0;
  let sumWXY = 0;

  for (let i = 0; i < n; i++) {
    const w = weights[i];
    const x = i;
    const y = values[i];
    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXX += w * x * x;
    sumWXY += w * x * y;
  }

  const denominator = sumW * sumWXX - sumWX * sumWX;
  if (Math.abs(denominator) < 1e-10) {
    return { slope: 0, intercept: mean(values) };
  }

  const slope = (sumW * sumWXY - sumWX * sumWY) / denominator;
  const intercept = (sumWY - slope * sumWX) / sumW;

  return { slope, intercept };
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Compute projection from capacity logs.
 *
 * Takes the most recent 21-30 days of daily capacity scores,
 * fits weighted linear regression, projects 42 days forward.
 *
 * Returns null if trend is flat or improving (no overload risk to show).
 */
export function computeProjection(
  logs: CapacityLog[],
  windowEnd?: string,
): CCIProjectionResult | null {
  // Determine the reference date (end of observation window or today)
  const refDate = windowEnd || getLocalDate(Date.now());

  // Build daily means from logs within the last MAX_INPUT_DAYS
  const cutoffDate = new Date(refDate + 'T00:00:00');
  cutoffDate.setDate(cutoffDate.getDate() - MAX_INPUT_DAYS);
  const cutoffStr = getLocalDate(cutoffDate.getTime());

  const dailyMap = new Map<string, number[]>();
  for (const log of logs) {
    const d = log.localDate || getLocalDate(log.timestamp);
    if (d > refDate || d < cutoffStr) continue;
    if (!dailyMap.has(d)) dailyMap.set(d, []);
    dailyMap.get(d)!.push(stateToPercent(log.state));
  }

  // Sort dates, compute daily means
  const sortedDates = Array.from(dailyMap.keys()).sort();
  if (sortedDates.length < MIN_INPUT_DAYS) return null;

  // Take the most recent PREFERRED_INPUT_DAYS (or up to MAX_INPUT_DAYS)
  const recentDates = sortedDates.slice(-PREFERRED_INPUT_DAYS);
  const dailyValues = recentDates.map(d => mean(dailyMap.get(d)!));

  // Fit weighted linear regression
  const { slope, intercept } = weightedLinearRegression(dailyValues);

  // If trend is flat or improving, no overload risk
  // "Flat" defined as slope > -0.15 pts/day (less than ~1 pt/week decline)
  if (slope > -0.15) return null;

  // Project forward from the last input day
  const lastInputIndex = dailyValues.length - 1;
  const projectedPoints: number[] = [];

  for (let i = 1; i <= PROJECTION_DAYS; i++) {
    const dayIndex = lastInputIndex + i;
    const projected = slope * dayIndex + intercept;
    projectedPoints.push(Math.max(0, Math.min(100, Math.round(projected))));
  }

  // Calculate weeks to critical
  let weeksToCritical: number | null = null;
  for (let i = 0; i < projectedPoints.length; i++) {
    if (projectedPoints[i] <= CRITICAL_THRESHOLD) {
      weeksToCritical = Math.round(((i + 1) / 7) * 10) / 10;
      break;
    }
  }

  // Trend rate in points per week
  const trendRate = Math.round(slope * 7 * 10) / 10;

  return {
    projectedPoints,
    weeksToCritical,
    trendRate,
    hasOverloadRisk: true,
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 10) / 10,
    inputDays: dailyValues.length,
  };
}
