/**
 * Synthetic Cohort Generator
 *
 * CANONICAL: Deterministic synthetic cohort generator for Sentinel demo.
 * Generates synthetic population signal series aggregated to daily volatility index.
 *
 * GOVERNANCE:
 * - Global demo uses n=3000 across all ages
 * - Age cohort dropdown selects which cohort series to display
 * - All data is synthetic and deterministic — no real user data
 */

import {
  buildCohortSeries,
  AgeCohortBand,
  AGE_COHORT_BANDS,
  AGE_COHORT_LABELS,
  SentinelVertical,
  CohortSeriesResult,
  getCohortsForVertical,
  getDefaultCohort,
} from './engine';
import { SentinelData, SystemState } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default sample size for global demo */
export const GLOBAL_DEMO_SAMPLE_SIZE = 3000;

/** Default seed for demo reproducibility */
export const DEMO_SEED = 42424242;

/**
 * Sample sizes per cohort for K-12 vertical (distributes 3000 students + staff)
 */
export const K12_COHORT_SAMPLE_SIZES: Record<AgeCohortBand, number> = {
  '5-10': 600,    // ~20% - Elementary K-5
  '11-13': 450,   // ~15% - Middle school
  '14-18': 600,   // ~20% - High school
  '18-24': 150,   // ~5%  - Young staff, paras
  '25-34': 300,   // ~10% - Staff
  '35-44': 360,   // ~12% - Staff
  '45-54': 300,   // ~10% - Staff
  '55-64': 180,   // ~6%  - Senior staff
  '65+': 60,      // ~2%  - Emeritus staff
};

/**
 * Sample sizes per cohort for University vertical
 */
export const UNIVERSITY_COHORT_SAMPLE_SIZES: Record<AgeCohortBand, number> = {
  '5-10': 0,
  '11-13': 0,
  '14-18': 0,
  '18-24': 1200,  // ~40% - Undergraduate
  '25-34': 750,   // ~25% - Graduate / early career
  '35-44': 450,   // ~15% - Faculty / staff
  '45-54': 330,   // ~11% - Senior faculty
  '55-64': 180,   // ~6%  - Senior faculty
  '65+': 90,      // ~3%  - Emeritus
};

/**
 * Sample sizes per cohort for Global vertical (general adult population)
 */
export const GLOBAL_COHORT_SAMPLE_SIZES: Record<AgeCohortBand, number> = {
  '5-10': 0,
  '11-13': 0,
  '14-18': 0,
  '18-24': 450,   // ~15%
  '25-34': 750,   // ~25%
  '35-44': 600,   // ~20%
  '45-54': 510,   // ~17%
  '55-64': 420,   // ~14%
  '65+': 270,     // ~9%
};

// =============================================================================
// TYPES
// =============================================================================

export interface SyntheticCohortParams {
  /** Sample size */
  n: number;
  /** Age cohort */
  ageCohort: AgeCohortBand;
  /** Vertical */
  vertical: SentinelVertical;
  /** Deterministic seed */
  seed: number;
}

export interface SyntheticCohortResult extends CohortSeriesResult {
  /** Sample size used */
  n: number;
  /** Age cohort */
  ageCohort: AgeCohortBand;
  /** Vertical */
  vertical: SentinelVertical;
  /** Whether this is demo data */
  isDemo: true;
}

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate synthetic cohort inputs
 *
 * Returns a synthetic population signal series aggregated to daily volatility index.
 * The series is deterministic based on the seed, cohort, and vertical.
 */
export function generateSyntheticCohortInputs(
  params: SyntheticCohortParams
): SyntheticCohortResult {
  const { n, ageCohort, vertical, seed } = params;

  // Build the cohort series using the engine
  const series = buildCohortSeries({
    vertical,
    ageCohort,
    n,
    seed,
  });

  return {
    ...series,
    n,
    ageCohort,
    vertical,
    isDemo: true,
  };
}

/**
 * Get cohort sample size for a vertical
 */
export function getCohortSampleSize(
  vertical: SentinelVertical,
  ageCohort: AgeCohortBand
): number {
  switch (vertical) {
    case 'k12':
      return K12_COHORT_SAMPLE_SIZES[ageCohort];
    case 'university':
      return UNIVERSITY_COHORT_SAMPLE_SIZES[ageCohort];
    default:
      return GLOBAL_COHORT_SAMPLE_SIZES[ageCohort];
  }
}

// =============================================================================
// SENTINEL DATA BUILDER
// =============================================================================

/**
 * Build complete SentinelData for display
 *
 * This is the main function used by the UI to get displayable data.
 */
export function buildSentinelDemoData(
  vertical: SentinelVertical,
  ageCohort: AgeCohortBand,
  seed: number = DEMO_SEED
): SentinelData {
  const sampleSize = getCohortSampleSize(vertical, ageCohort);
  const effectiveN = sampleSize > 0 ? sampleSize : GLOBAL_DEMO_SAMPLE_SIZE;

  const result = generateSyntheticCohortInputs({
    n: effectiveN,
    ageCohort,
    vertical,
    seed,
  });

  // Build cohort label
  let cohortLabel: string;
  if (vertical === 'k12') {
    const isStudent = ['5-10', '11-13', '14-18'].includes(ageCohort);
    cohortLabel = isStudent
      ? `Students · ${AGE_COHORT_LABELS[ageCohort]}`
      : `Staff · ${AGE_COHORT_LABELS[ageCohort]}`;
  } else if (vertical === 'university') {
    const isStudent = ['18-24', '25-34'].includes(ageCohort);
    cohortLabel = isStudent
      ? `Students · ${AGE_COHORT_LABELS[ageCohort]}`
      : `Faculty/Staff · ${AGE_COHORT_LABELS[ageCohort]}`;
  } else {
    cohortLabel = `Cohort: ${AGE_COHORT_LABELS[ageCohort]}`;
  }

  return {
    scope: vertical === 'global' ? 'global' : 'organization',
    cohortLabel,
    systemState: result.systemState,
    consecutiveDaysAboveBaseline: result.consecutiveDaysAboveBaseline,
    volatilityTrend: result.points,
    baselineValue: result.baseline,
    currentTrigger: result.triggerEvents.length > 0 ? result.triggerEvents[result.triggerEvents.length - 1] : null,
    assessments: result.assessments,
    isDemo: true,
    sampleSize: effectiveN,
    ageCohort,
  };
}

// =============================================================================
// PRE-GENERATED SERIES CACHE
// =============================================================================

/**
 * Pre-generate all cohort series for a vertical
 * Used for fast cohort switching without regeneration
 */
export function preGenerateAllCohorts(
  vertical: SentinelVertical,
  seed: number = DEMO_SEED
): Map<AgeCohortBand, SentinelData> {
  const cohorts = getCohortsForVertical(vertical);
  const cache = new Map<AgeCohortBand, SentinelData>();

  for (const cohort of cohorts) {
    cache.set(cohort, buildSentinelDemoData(vertical, cohort, seed));
  }

  return cache;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  AgeCohortBand,
  AGE_COHORT_BANDS,
  AGE_COHORT_LABELS,
  SentinelVertical,
  getCohortsForVertical,
  getDefaultCohort,
  CohortSeriesResult,
} from './engine';
