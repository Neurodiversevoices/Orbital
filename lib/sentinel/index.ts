/**
 * Sentinel Module — Truthful Demo Engine
 *
 * GOVERNANCE: Institutional-grade capacity volatility early warning system.
 *
 * Current state:
 * - Types, engine, and synthetic generator are implemented
 * - Chart is generated, not static — uses same computation engine as future paid product
 * - Demo uses synthetic cohort inputs; paid product will use real aggregated inputs
 * - Same pipeline, different feed
 *
 * CONSTRAINTS:
 * - K-anonymity floor (Rule of 5) enforced for any real cohort data feed
 * - No raw/semi-raw institutional data displayed
 * - Age cohorts derived from Year of Birth
 * - School (K-12) cohorts start at age 5
 * - Institutional surfaces remain DEMO-ONLY (no pricing, no activation, no exports)
 */

// Re-export types
export * from './types';

// Re-export engine
export {
  buildCohortSeries,
  AGE_COHORT_BANDS,
  AGE_COHORT_LABELS,
  getCohortsForVertical,
  getDefaultCohort,
  validateCohortDifferentiation,
  validateDeterminism,
} from './engine';
export type {
  AgeCohortBand,
  SentinelVertical,
  BuildCohortSeriesParams,
  CohortSeriesResult,
} from './engine';

// Re-export synthetic generator
export {
  generateSyntheticCohortInputs,
  buildSentinelDemoData,
  preGenerateAllCohorts,
  getCohortSampleSize,
  GLOBAL_DEMO_SAMPLE_SIZE,
  DEMO_SEED,
  K12_COHORT_SAMPLE_SIZES,
  UNIVERSITY_COHORT_SAMPLE_SIZES,
  GLOBAL_COHORT_SAMPLE_SIZES,
} from './synthetic';
export type { SyntheticCohortParams, SyntheticCohortResult } from './synthetic';

// Re-export demo data (legacy support + constants)
export {
  getDemoSentinelData,
  SENTINEL_DEMO_LABELS,
  // School District Sentinel exports (K-12 cohorts starting at age 5)
  SCHOOL_AGE_COHORTS,
  SCHOOL_AGE_COHORT_LABELS,
  getSchoolDistrictSentinelData,
  getSchoolCohortSampleSize,
  SCHOOL_DISTRICT_SENTINEL,
  // University Sentinel exports (Higher Education, Year of Birth → Cohort)
  UNIVERSITY_AGE_COHORTS,
  UNIVERSITY_AGE_COHORT_LABELS,
  getUniversitySentinelData,
  getUniversityCohortSampleSize,
  UNIVERSITY_SENTINEL,
} from './demoData';

// Re-export School-specific types
export type { SchoolAgeCohort, UniversityAgeCohort } from './demoData';

/**
 * Contact URL for institutional access requests
 */
export const SENTINEL_CONTACT_URL =
  'mailto:contact@orbital.health?subject=Orbital%20Sentinel%20%E2%80%94%20Institutional%20Access%20Request';

/**
 * Sentinel feature flags
 * All disabled for Phase 1 (PNG-only)
 */
export const SENTINEL_FEATURES = {
  /** Live data rendering (Phase 2) */
  liveData: false,
  /** Chart interactivity (Phase 2) */
  interactiveChart: false,
  /** Export functionality (NOT PLANNED) */
  export: false,
  /** Threshold tuning (NOT PLANNED) */
  tuning: false,
  /** Real-time alerts (NOT PLANNED) */
  realTimeAlerts: false,
} as const;
