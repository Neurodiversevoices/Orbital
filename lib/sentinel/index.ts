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

// =============================================================================
// DOCTRINE: INSTITUTIONAL DEMO LOCK
// =============================================================================

/**
 * Error thrown when attempting to access real institutional data.
 *
 * DOCTRINE: Privacy by Architecture
 * Sentinel views are DEMO-ONLY in Phase 1. Any attempt to access
 * real user data through this module is a spec violation.
 */
export class SentinelDemoViolation extends Error {
  constructor(message: string) {
    super(`[SENTINEL DEMO VIOLATION] ${message}`);
    this.name = 'SentinelDemoViolation';
  }
}

/**
 * Runtime assertion that Sentinel is in demo mode.
 *
 * DOCTRINE: Privacy by Architecture, Institutional Demo Lock
 * This function MUST be called at the entry point of any data retrieval.
 * It throws if any attempt is made to access real institutional data.
 *
 * This is a HARD LOCK. There is no override. To enable real data,
 * this guard must be explicitly removed in a future release with
 * full governance review.
 */
export function assertSentinelDemoMode(): void {
  // HARD LOCK: Sentinel is demo-only in Phase 1
  // This assertion cannot be bypassed at runtime
  const DEMO_LOCK_ACTIVE = true as const;

  if (!DEMO_LOCK_ACTIVE) {
    // This branch is unreachable by design
    throw new SentinelDemoViolation(
      'Demo lock has been disabled. This requires governance approval.'
    );
  }

  // Verify feature flags are all disabled
  if (SENTINEL_FEATURES.liveData) {
    throw new SentinelDemoViolation(
      'liveData feature flag is enabled. Real data access is forbidden in Phase 1.'
    );
  }

  if (SENTINEL_FEATURES.export) {
    throw new SentinelDemoViolation(
      'export feature flag is enabled. Data export is forbidden for Sentinel.'
    );
  }
}

/**
 * Guard function for any Sentinel data retrieval.
 *
 * DOCTRINE: Privacy by Architecture
 * Wrap any function that could potentially access real institutional data.
 * This ensures synthetic/demo data is always returned.
 *
 * @param realDataFn - Function that would fetch real data (NEVER CALLED)
 * @param demoDataFn - Function that returns demo/synthetic data
 * @returns Result from demoDataFn (always)
 */
export function withSentinelDemoGuard<T>(
  _realDataFn: () => T,
  demoDataFn: () => T
): T {
  // Assert demo mode is active (throws if not)
  assertSentinelDemoMode();

  // ALWAYS return demo data - real data function is never invoked
  // The _realDataFn parameter exists only to make the intent explicit
  // at the call site: "this is where real data WOULD come from"
  return demoDataFn();
}

// =============================================================================
// DOCTRINE: EXPLICIT REAL DATA REJECTION
// =============================================================================

/**
 * UUID v4 pattern for detecting real user identifiers.
 */
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reject any request containing real user identifiers.
 *
 * DOCTRINE: Privacy by Architecture, Institutional Demo Lock
 * This function MUST be called before any data retrieval that accepts
 * user-provided parameters. It throws if the parameters appear to contain
 * real user identifiers (UUIDs, email patterns, etc.).
 *
 * This is a HARD LOCK. Sentinel Phase 1 operates on synthetic data ONLY.
 * Any attempt to query real institutional data is a spec violation.
 *
 * @param params - Object containing potential identifiers to validate
 * @throws SentinelDemoViolation if real identifiers are detected
 */
export function rejectRealIdentifiers(params: {
  userId?: string | null;
  userIds?: string[] | null;
  orgId?: string | null;
  cohortId?: string | null;
  email?: string | null;
  [key: string]: unknown;
}): void {
  // First, assert demo mode is active
  assertSentinelDemoMode();

  // Check for real UUID user identifiers
  if (params.userId && UUID_V4_PATTERN.test(params.userId)) {
    throw new SentinelDemoViolation(
      `Real user_id detected: ${params.userId.slice(0, 8)}... ` +
      'Sentinel Phase 1 operates on synthetic data only. Real user queries are forbidden.'
    );
  }

  // Check for array of user IDs
  if (params.userIds && Array.isArray(params.userIds)) {
    const realIds = params.userIds.filter(id => UUID_V4_PATTERN.test(id));
    if (realIds.length > 0) {
      throw new SentinelDemoViolation(
        `Real user_ids detected: ${realIds.length} UUID(s). ` +
        'Sentinel Phase 1 operates on synthetic data only. Real user queries are forbidden.'
      );
    }
  }

  // Check for real org identifiers (UUIDs or prefixed IDs)
  if (params.orgId && (UUID_V4_PATTERN.test(params.orgId) || params.orgId.startsWith('org_'))) {
    throw new SentinelDemoViolation(
      `Real org_id detected: ${params.orgId.slice(0, 8)}... ` +
      'Sentinel Phase 1 operates on synthetic data only. Real organization queries are forbidden.'
    );
  }

  // Check for email patterns (potential PII)
  if (params.email && params.email.includes('@') && !params.email.includes('@demo.')) {
    throw new SentinelDemoViolation(
      'Real email address detected. Sentinel Phase 1 operates on synthetic data only.'
    );
  }

  // Check for cohort IDs that reference real data (non-demo prefixes)
  if (params.cohortId && !params.cohortId.startsWith('demo_') && !params.cohortId.startsWith('synthetic_')) {
    throw new SentinelDemoViolation(
      `Potentially real cohort_id detected: ${params.cohortId}. ` +
      'Sentinel Phase 1 operates on synthetic data only.'
    );
  }
}

/**
 * Validate that data source is synthetic before processing.
 *
 * DOCTRINE: Privacy by Architecture
 * This function validates that any data array passed to Sentinel
 * processing functions contains only synthetic/demo data markers.
 *
 * @param data - Array of data points to validate
 * @param sourceMarker - Expected source marker (default: 'synthetic' or 'demo')
 * @throws SentinelDemoViolation if data appears to be from real sources
 */
export function assertSyntheticDataSource<T extends { source?: string; _synthetic?: boolean }>(
  data: T[],
  sourceMarker: string = 'synthetic'
): void {
  // First, assert demo mode is active
  assertSentinelDemoMode();

  // Empty data is allowed (no risk)
  if (!data || data.length === 0) return;

  // Check for synthetic markers
  const nonSyntheticItems = data.filter(item => {
    // If item has explicit synthetic marker, it's safe
    if (item._synthetic === true) return false;
    // If item has source field, check it matches expected marker
    if (item.source && (item.source === sourceMarker || item.source === 'demo')) return false;
    // Item lacks synthetic verification - flag it
    return true;
  });

  if (nonSyntheticItems.length > 0) {
    throw new SentinelDemoViolation(
      `${nonSyntheticItems.length} data point(s) lack synthetic verification markers. ` +
      'Sentinel Phase 1 requires all data to be explicitly marked as synthetic/demo.'
    );
  }
}
