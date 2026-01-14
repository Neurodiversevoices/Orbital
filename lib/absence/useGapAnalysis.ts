/**
 * Gap Analysis Hook
 *
 * React hook for gap detection and coverage analysis.
 *
 * Per ABSENCE_AS_SIGNAL_SPEC.md:
 * - ABS-020: Absence SHALL NOT appear in any view shorter than 90 days
 * - ABS-021: When displayed, absence uses neutral visual treatment
 * - ABS-022: Absence label SHALL be "No signals recorded"
 * - ABS-023: Absence SHALL NOT show in daily, weekly, or monthly summary views
 *
 * This hook enforces the 90-day minimum for gap visibility.
 */

import { useMemo } from 'react';
import type { CapacityLog } from '../../types';
import type { CoverageMetric, DerivedGap, GapSummary } from './types';
import { detectGaps, countGapsByCategory, getLongestGap } from './gapDetection';
import {
  calculateCoverage,
  calculateCoverageFromSignalSpan,
  getGapSummary,
  formatCoverage,
  formatCoverageShort,
} from './coverage';

/** Minimum days required to show gap analysis (per ABS-020) */
const MIN_DAYS_FOR_GAP_ANALYSIS = 90;

/** Minimum signals to provide meaningful gap analysis */
const MIN_SIGNALS_FOR_GAP_ANALYSIS = 7;

export interface UseGapAnalysisOptions {
  /** Override minimum days requirement (use with caution) */
  minDaysOverride?: number;
}

export interface UseGapAnalysisReturn {
  /** Whether gap analysis is available (meets 90-day threshold) */
  isAvailable: boolean;
  /** Reason if not available */
  unavailableReason?: string;
  /** Coverage metrics (null if not available) */
  coverage: CoverageMetric | null;
  /** All detected gaps (empty if not available) */
  gaps: DerivedGap[];
  /** Count by category */
  byCategory: { short: number; medium: number; extended: number } | null;
  /** Longest gap (null if none or not available) */
  longestGap: DerivedGap | null;
  /** Formatted coverage string using permitted language */
  formattedCoverage: string;
  /** Short coverage label */
  formattedCoverageShort: string;
}

/**
 * Hook for gap analysis in longitudinal views.
 *
 * Enforces 90-day minimum visibility requirement (ABS-020).
 * Returns null values for views under 90 days to prevent
 * displaying gap information in short-term views.
 *
 * @param logs - Array of capacity logs
 * @param periodDays - Number of days in the analysis window
 * @param options - Optional configuration
 * @returns Gap analysis data or unavailable state
 *
 * @example
 * ```tsx
 * const { isAvailable, coverage, formattedCoverage } = useGapAnalysis(logs, 90);
 *
 * if (isAvailable && coverage) {
 *   return <Text>{formattedCoverage}</Text>;
 * }
 * ```
 */
export function useGapAnalysis(
  logs: CapacityLog[],
  periodDays: number,
  options: UseGapAnalysisOptions = {}
): UseGapAnalysisReturn {
  const minDays = options.minDaysOverride ?? MIN_DAYS_FOR_GAP_ANALYSIS;

  return useMemo(() => {
    // Check minimum period requirement (ABS-020)
    if (periodDays < minDays) {
      return {
        isAvailable: false,
        unavailableReason: `Gap analysis requires at least ${minDays} days of data`,
        coverage: null,
        gaps: [],
        byCategory: null,
        longestGap: null,
        formattedCoverage: '',
        formattedCoverageShort: '',
      };
    }

    // Check minimum signals
    if (logs.length < MIN_SIGNALS_FOR_GAP_ANALYSIS) {
      return {
        isAvailable: false,
        unavailableReason: `Gap analysis requires at least ${MIN_SIGNALS_FOR_GAP_ANALYSIS} signals`,
        coverage: null,
        gaps: [],
        byCategory: null,
        longestGap: null,
        formattedCoverage: '',
        formattedCoverageShort: '',
      };
    }

    // Calculate gap analysis
    const gaps = detectGaps(logs);
    const coverage = calculateCoverage(logs, periodDays);
    const byCategory = countGapsByCategory(gaps);
    const longestGap = getLongestGap(gaps);

    return {
      isAvailable: true,
      coverage,
      gaps,
      byCategory,
      longestGap,
      formattedCoverage: formatCoverage(coverage),
      formattedCoverageShort: formatCoverageShort(coverage),
    };
  }, [logs, periodDays, minDays]);
}

/**
 * Hook for gap analysis using the actual signal span.
 *
 * Uses the time between first and last signal rather than a fixed window.
 * Still enforces the 90-day minimum for the span.
 *
 * @param logs - Array of capacity logs
 * @param options - Optional configuration
 * @returns Gap analysis data or unavailable state
 */
export function useGapAnalysisFromSpan(
  logs: CapacityLog[],
  options: UseGapAnalysisOptions = {}
): UseGapAnalysisReturn {
  const minDays = options.minDaysOverride ?? MIN_DAYS_FOR_GAP_ANALYSIS;

  return useMemo(() => {
    // Check minimum signals
    if (logs.length < MIN_SIGNALS_FOR_GAP_ANALYSIS) {
      return {
        isAvailable: false,
        unavailableReason: `Gap analysis requires at least ${MIN_SIGNALS_FOR_GAP_ANALYSIS} signals`,
        coverage: null,
        gaps: [],
        byCategory: null,
        longestGap: null,
        formattedCoverage: '',
        formattedCoverageShort: '',
      };
    }

    // Calculate coverage from span
    const coverage = calculateCoverageFromSignalSpan(logs);

    // Check minimum period requirement (ABS-020)
    if (coverage.periodDays < minDays) {
      return {
        isAvailable: false,
        unavailableReason: `Gap analysis requires at least ${minDays} days of signal history`,
        coverage: null,
        gaps: [],
        byCategory: null,
        longestGap: null,
        formattedCoverage: '',
        formattedCoverageShort: '',
      };
    }

    // Calculate gap analysis
    const gaps = detectGaps(logs);
    const byCategory = countGapsByCategory(gaps);
    const longestGap = getLongestGap(gaps);

    return {
      isAvailable: true,
      coverage,
      gaps,
      byCategory,
      longestGap,
      formattedCoverage: formatCoverage(coverage),
      formattedCoverageShort: formatCoverageShort(coverage),
    };
  }, [logs, minDays]);
}
