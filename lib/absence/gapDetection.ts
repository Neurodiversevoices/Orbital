/**
 * Gap Detection Algorithm
 *
 * Per ABSENCE_AS_SIGNAL_SPEC.md:
 * - Gaps are derived at query time, never stored
 * - Gap duration calculated as: next_signal_timestamp - previous_signal_timestamp
 * - Gaps less than 24 hours are not classified as absence
 * - Categories: Short (1-3 days), Medium (4-14 days), Extended (15+ days)
 *
 * Rules enforced:
 * - ABS-001: Absence is never stored as an explicit record
 * - ABS-002: Absence is derived at query time from signal timestamps
 * - ABS-003: Gap duration is calculated as: next_signal_timestamp - previous_signal_timestamp
 * - ABS-004: Gaps less than 24 hours are not classified as absence
 * - ABS-005: Gaps are categorized: Short (1-3 days), Medium (4-14 days), Extended (15+ days)
 */

import type { DerivedGap, GapCategory, SignalLike } from './types';

/** Milliseconds in a day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Categorize a gap based on duration in days.
 * Per ABS-005: Short (1-3), Medium (4-14), Extended (15+)
 *
 * @param days - Gap duration in days
 * @returns Gap category
 */
export function categorizeGap(days: number): GapCategory {
  if (days < 4) return 'short';
  if (days < 15) return 'medium';
  return 'extended';
}

/**
 * Detect gaps between signals.
 *
 * Per ABSENCE_AS_SIGNAL_SPEC.md section 3.1:
 * - Signals are sorted by timestamp
 * - Gap duration = next_signal - previous_signal
 * - Only gaps >= 1 day are returned (ABS-004)
 *
 * @param signals - Array of signal-like objects with timestamps
 * @returns Array of derived gaps (never stored, computed at query time)
 */
export function detectGaps<T extends SignalLike>(signals: T[]): DerivedGap[] {
  if (signals.length < 2) {
    return [];
  }

  const gaps: DerivedGap[] = [];

  // Sort by timestamp ascending
  const sortedSignals = [...signals].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < sortedSignals.length; i++) {
    const gapMs = sortedSignals[i].timestamp - sortedSignals[i - 1].timestamp;
    const gapDays = gapMs / MS_PER_DAY;

    // Per ABS-004: Only classify gaps >= 1 day
    if (gapDays >= 1) {
      gaps.push({
        startTimestamp: sortedSignals[i - 1].timestamp,
        endTimestamp: sortedSignals[i].timestamp,
        durationDays: Math.floor(gapDays),
        category: categorizeGap(Math.floor(gapDays)),
      });
    }
  }

  return gaps;
}

/**
 * Get the longest gap from a list of gaps.
 *
 * @param gaps - Array of derived gaps
 * @returns The longest gap, or null if no gaps
 */
export function getLongestGap(gaps: DerivedGap[]): DerivedGap | null {
  if (gaps.length === 0) return null;

  return gaps.reduce((longest, current) =>
    current.durationDays > longest.durationDays ? current : longest
  );
}

/**
 * Count gaps by category.
 *
 * @param gaps - Array of derived gaps
 * @returns Count of gaps in each category
 */
export function countGapsByCategory(gaps: DerivedGap[]): {
  short: number;
  medium: number;
  extended: number;
} {
  const counts = { short: 0, medium: 0, extended: 0 };

  for (const gap of gaps) {
    counts[gap.category]++;
  }

  return counts;
}

/**
 * Filter gaps by minimum duration.
 *
 * @param gaps - Array of derived gaps
 * @param minDays - Minimum gap duration to include
 * @returns Filtered array of gaps
 */
export function filterGapsByDuration(
  gaps: DerivedGap[],
  minDays: number
): DerivedGap[] {
  return gaps.filter((gap) => gap.durationDays >= minDays);
}

/**
 * Filter gaps by category.
 *
 * @param gaps - Array of derived gaps
 * @param categories - Categories to include
 * @returns Filtered array of gaps
 */
export function filterGapsByCategory(
  gaps: DerivedGap[],
  categories: GapCategory[]
): DerivedGap[] {
  return gaps.filter((gap) => categories.includes(gap.category));
}
