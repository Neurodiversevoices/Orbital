/**
 * Coverage Calculation
 *
 * Per ABSENCE_AS_SIGNAL_SPEC.md section 3.2:
 * - Coverage is computed at query time, never stored
 * - Calculated as: daysWithSignals / periodDays * 100
 *
 * Rules enforced:
 * - ABS-010: Absence SHALL NOT affect capacity averages
 * - ABS-011: Absence SHALL be represented in continuity metrics
 * - ABS-012: Absence periods MAY be included in longitudinal artifacts (90+ day views only)
 * - ABS-024: Absence MAY appear in annual summaries as "Coverage: X%"
 */

import type { CoverageMetric, GapSummary, SignalLike } from './types';
import { detectGaps, countGapsByCategory, getLongestGap } from './gapDetection';

/** Milliseconds in a day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Get the start of day (midnight) for a timestamp.
 *
 * @param timestamp - Timestamp in milliseconds
 * @returns Timestamp of midnight UTC for that day
 */
function getStartOfDay(timestamp: number): number {
  return Math.floor(timestamp / MS_PER_DAY) * MS_PER_DAY;
}

/**
 * Calculate coverage for a set of signals over a period.
 *
 * Per ABSENCE_AS_SIGNAL_SPEC.md section 3.2:
 * - Coverage = daysWithSignals / periodDays * 100
 * - Uses unique days (by day boundary, not 24-hour windows)
 *
 * @param signals - Array of signal-like objects with timestamps
 * @param periodDays - Number of days in the analysis window
 * @returns Coverage metric (computed, never stored)
 */
export function calculateCoverage<T extends SignalLike>(
  signals: T[],
  periodDays: number
): CoverageMetric {
  if (signals.length === 0 || periodDays <= 0) {
    return {
      periodDays: Math.max(0, periodDays),
      signalDays: 0,
      coveragePercent: 0,
      gapCount: 0,
      longestGapDays: 0,
    };
  }

  // Count unique days with at least one signal
  const uniqueDays = new Set(
    signals.map((s) => getStartOfDay(s.timestamp))
  );
  const signalDays = uniqueDays.size;

  // Detect gaps for gap metrics
  const gaps = detectGaps(signals);
  const longestGap = getLongestGap(gaps);

  return {
    periodDays,
    signalDays,
    coveragePercent: Math.round((signalDays / periodDays) * 100),
    gapCount: gaps.length,
    longestGapDays: longestGap?.durationDays ?? 0,
  };
}

/**
 * Calculate coverage based on the actual signal span.
 *
 * Uses the time between first and last signal as the period,
 * rather than a fixed window. Useful for user-specific analysis.
 *
 * @param signals - Array of signal-like objects with timestamps
 * @returns Coverage metric based on actual signal span
 */
export function calculateCoverageFromSignalSpan<T extends SignalLike>(
  signals: T[]
): CoverageMetric {
  if (signals.length === 0) {
    return {
      periodDays: 0,
      signalDays: 0,
      coveragePercent: 0,
      gapCount: 0,
      longestGapDays: 0,
    };
  }

  if (signals.length === 1) {
    return {
      periodDays: 1,
      signalDays: 1,
      coveragePercent: 100,
      gapCount: 0,
      longestGapDays: 0,
    };
  }

  // Sort and find span
  const sortedSignals = [...signals].sort((a, b) => a.timestamp - b.timestamp);
  const firstSignal = sortedSignals[0].timestamp;
  const lastSignal = sortedSignals[sortedSignals.length - 1].timestamp;

  const spanMs = lastSignal - firstSignal;
  const periodDays = Math.max(1, Math.ceil(spanMs / MS_PER_DAY));

  return calculateCoverage(signals, periodDays);
}

/**
 * Get a complete gap summary for longitudinal analysis.
 *
 * Per ABSENCE_AS_SIGNAL_SPEC.md:
 * - Only appropriate for 90+ day views (ABS-020)
 * - All data is derived, never stored
 *
 * @param signals - Array of signal-like objects with timestamps
 * @param periodDays - Number of days in the analysis window
 * @returns Complete gap summary with gaps and coverage metrics
 */
export function getGapSummary<T extends SignalLike>(
  signals: T[],
  periodDays: number
): GapSummary {
  const gaps = detectGaps(signals);
  const coverage = calculateCoverage(signals, periodDays);
  const byCategory = countGapsByCategory(gaps);

  return {
    gaps,
    coverage,
    byCategory,
  };
}

/**
 * Format coverage as allowed language per ABSENCE_AS_SIGNAL_SPEC.md.
 *
 * Permitted phrasings (section 4.1):
 * - "Coverage: 78% of days"
 * - "Signals present on 72 of 90 days"
 * - "No signals recorded" (for gaps)
 * - "Period without signals"
 *
 * @param coverage - Coverage metric
 * @returns Formatted string using permitted language
 */
export function formatCoverage(coverage: CoverageMetric): string {
  return `Signals present on ${coverage.signalDays} of ${coverage.periodDays} days (${coverage.coveragePercent}%)`;
}

/**
 * Get a short coverage label.
 *
 * @param coverage - Coverage metric
 * @returns Short percentage string
 */
export function formatCoverageShort(coverage: CoverageMetric): string {
  return `${coverage.coveragePercent}% coverage`;
}
