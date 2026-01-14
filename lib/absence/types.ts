/**
 * Absence As Signal - Types
 *
 * Types for gap detection and coverage analysis per ABSENCE_AS_SIGNAL_SPEC.md.
 *
 * Key principles:
 * - Absence is data, not failure
 * - Gaps are NEVER stored, always derived at query time
 * - Only shown in 90+ day views
 * - Neutral language always ("No signals recorded" not "Missing")
 */

/**
 * Gap category based on duration
 * - short: 1-3 days - Common, expected variation
 * - medium: 4-14 days - Notable but unremarkable
 * - extended: 15+ days - Significant absence period
 */
export type GapCategory = 'short' | 'medium' | 'extended';

/**
 * A derived gap between signals.
 * NEVER stored - computed at query time from signal timestamps.
 */
export interface DerivedGap {
  /** Timestamp of the previous signal (end of signal day) */
  startTimestamp: number;
  /** Timestamp of the next signal (start of next signal day) */
  endTimestamp: number;
  /** Duration in whole days only */
  durationDays: number;
  /** Gap category based on duration */
  category: GapCategory;
}

/**
 * Coverage metrics for a time period.
 * Computed, never stored.
 */
export interface CoverageMetric {
  /** Total days in the analysis window */
  periodDays: number;
  /** Number of days with at least one signal */
  signalDays: number;
  /** Coverage percentage: signalDays / periodDays * 100 */
  coveragePercent: number;
  /** Number of gaps > 1 day */
  gapCount: number;
  /** Maximum gap duration in days */
  longestGapDays: number;
}

/**
 * Gap summary for longitudinal views (90+ days only)
 */
export interface GapSummary {
  /** All detected gaps */
  gaps: DerivedGap[];
  /** Coverage metrics */
  coverage: CoverageMetric;
  /** Count by category */
  byCategory: {
    short: number;
    medium: number;
    extended: number;
  };
}

/**
 * Signal input for gap detection.
 * Minimal interface to work with any signal-like data.
 */
export interface SignalLike {
  /** Timestamp in milliseconds */
  timestamp: number;
}
