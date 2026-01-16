/**
 * Absence As Signal Module
 *
 * Gap detection and coverage analysis per ABSENCE_AS_SIGNAL_SPEC.md.
 *
 * Core principles:
 * - Absence is data, not failure
 * - Gaps are NEVER stored, always derived at query time
 * - Only shown in 90+ day views
 * - Neutral language always ("No signals recorded" not "Missing")
 *
 * @module lib/absence
 */

// Types
export type {
  GapCategory,
  DerivedGap,
  CoverageMetric,
  GapSummary,
  SignalLike,
} from './types';

// Gap Detection
export {
  detectGaps,
  categorizeGap,
  getLongestGap,
  countGapsByCategory,
  filterGapsByDuration,
  filterGapsByCategory,
} from './gapDetection';

// Coverage Calculation
export {
  calculateCoverage,
  calculateCoverageFromSignalSpan,
  getGapSummary,
  formatCoverage,
  formatCoverageShort,
} from './coverage';

// React Hook
export {
  useGapAnalysis,
  useGapAnalysisFromSpan,
} from './useGapAnalysis';
export type {
  UseGapAnalysisOptions,
  UseGapAnalysisReturn,
} from './useGapAnalysis';
