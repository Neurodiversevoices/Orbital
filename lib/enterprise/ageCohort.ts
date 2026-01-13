/**
 * Age Data Minimization
 *
 * CRITICAL: Ingest → Map → Purge
 *
 * Onboarding: Ask for Year of Birth once
 * Processing: Immediately map YOB → 10-year age cohort
 * Storage: Store cohort ID only
 * Purge: Permanently discard Year of Birth
 *
 * Result: System NEVER stores precise age.
 * Year of Birth cannot be reconstructed from cohort.
 */

import { AgeCohort, AgeCohortMapping } from './types';

// =============================================================================
// COHORT DEFINITIONS
// =============================================================================

/**
 * 10-year age cohorts.
 * These are the ONLY age-related data stored in the system.
 */
const COHORT_MAPPINGS: AgeCohortMapping[] = [
  { cohortId: 'under_20', minYear: null, maxYear: null }, // Calculated dynamically
  { cohortId: '20_29', minYear: null, maxYear: null },
  { cohortId: '30_39', minYear: null, maxYear: null },
  { cohortId: '40_49', minYear: null, maxYear: null },
  { cohortId: '50_59', minYear: null, maxYear: null },
  { cohortId: '60_69', minYear: null, maxYear: null },
  { cohortId: '70_plus', minYear: null, maxYear: null },
];

/**
 * Human-readable cohort labels for UI display.
 */
export const COHORT_LABELS: Record<AgeCohort, string> = {
  under_20: 'Under 20',
  '20_29': '20-29',
  '30_39': '30-39',
  '40_49': '40-49',
  '50_59': '50-59',
  '60_69': '60-69',
  '70_plus': '70+',
  undisclosed: 'Prefer not to say',
};

// =============================================================================
// YEAR OF BIRTH → COHORT MAPPING
// =============================================================================

/**
 * Map Year of Birth to 10-year age cohort.
 *
 * CRITICAL: This is a ONE-WAY transformation.
 * The original YOB is discarded after this function returns.
 *
 * @param yearOfBirth - The user's year of birth (will be discarded)
 * @returns The cohort ID (the ONLY thing stored)
 */
export function mapYearOfBirthToCohort(yearOfBirth: number): AgeCohort {
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearOfBirth;

  // Validation: reject obviously invalid years
  if (yearOfBirth < 1900 || yearOfBirth > currentYear) {
    return 'undisclosed';
  }

  // Map to cohort
  if (age < 20) return 'under_20';
  if (age < 30) return '20_29';
  if (age < 40) return '30_39';
  if (age < 50) return '40_49';
  if (age < 60) return '50_59';
  if (age < 70) return '60_69';
  return '70_plus';
}

/**
 * Process Year of Birth during onboarding.
 * Returns the cohort ID to store.
 *
 * IMPORTANT: The yearOfBirth parameter must NOT be stored anywhere.
 * Only the returned cohort ID should be persisted.
 */
export function processYearOfBirth(yearOfBirth: number | null): AgeCohort {
  if (yearOfBirth === null || yearOfBirth === undefined) {
    return 'undisclosed';
  }

  return mapYearOfBirthToCohort(yearOfBirth);
}

// =============================================================================
// COHORT VALIDATION
// =============================================================================

/**
 * Validate that a cohort ID is valid.
 */
export function isValidCohort(cohort: string): cohort is AgeCohort {
  return cohort in COHORT_LABELS;
}

/**
 * Get all valid cohort IDs.
 */
export function getAllCohorts(): AgeCohort[] {
  return Object.keys(COHORT_LABELS) as AgeCohort[];
}

/**
 * Get cohort label for display.
 */
export function getCohortLabel(cohort: AgeCohort): string {
  return COHORT_LABELS[cohort] || 'Unknown';
}

// =============================================================================
// ONBOARDING FLOW HELPERS
// =============================================================================

/**
 * Generate year options for onboarding picker.
 * Shows last 100 years as options.
 */
export function getYearOfBirthOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];

  for (let year = currentYear - 13; year >= currentYear - 100; year--) {
    years.push(year);
  }

  return years;
}

/**
 * Onboarding result type.
 * Contains ONLY the cohort ID, never the YOB.
 */
export interface AgeOnboardingResult {
  readonly cohortId: AgeCohort;
  readonly processedAt: string;
  // NO yearOfBirth field - it is purged
}

/**
 * Process onboarding age input.
 *
 * @param yearOfBirth - User's input (WILL BE DISCARDED)
 * @returns Onboarding result with cohort ID only
 */
export function processAgeOnboarding(yearOfBirth: number | null): AgeOnboardingResult {
  const cohortId = processYearOfBirth(yearOfBirth);

  // CRITICAL: yearOfBirth is NOT stored in the result
  // It is effectively purged when this function returns
  return {
    cohortId,
    processedAt: new Date().toISOString(),
  };
}

// =============================================================================
// STORAGE HELPERS
// =============================================================================

/**
 * Storage format for user age data.
 * Contains ONLY cohort, never YOB.
 */
export interface StoredAgeCohort {
  readonly cohortId: AgeCohort;
  readonly assignedAt: string;
  readonly lastVerifiedAt: string;
  // NO yearOfBirth - structurally impossible
}

/**
 * Create storage record from onboarding.
 */
export function createAgeCohortRecord(result: AgeOnboardingResult): StoredAgeCohort {
  return {
    cohortId: result.cohortId,
    assignedAt: result.processedAt,
    lastVerifiedAt: result.processedAt,
  };
}

/**
 * Update last verified timestamp (for periodic re-confirmation).
 */
export function updateCohortVerification(record: StoredAgeCohort): StoredAgeCohort {
  return {
    ...record,
    lastVerifiedAt: new Date().toISOString(),
  };
}

// =============================================================================
// AGGREGATION HELPERS (FOR K-ANONYMOUS REPORTING)
// =============================================================================

/**
 * Aggregate cohort distribution for institutional reporting.
 * Only returns cohorts with >= K users (K-anonymity enforced separately).
 */
export function aggregateCohortDistribution(
  cohorts: AgeCohort[]
): Map<AgeCohort, number> {
  const distribution = new Map<AgeCohort, number>();

  for (const cohort of cohorts) {
    const current = distribution.get(cohort) || 0;
    distribution.set(cohort, current + 1);
  }

  return distribution;
}

/**
 * Get cohort distribution as percentages.
 */
export function getCohortPercentages(
  distribution: Map<AgeCohort, number>
): Map<AgeCohort, number> {
  let total = 0;
  distribution.forEach(count => {
    total += count;
  });

  if (total === 0) return new Map();

  const percentages = new Map<AgeCohort, number>();
  distribution.forEach((count, cohort) => {
    percentages.set(cohort, Math.round((count / total) * 100));
  });

  return percentages;
}

// =============================================================================
// ANTI-RECONSTRUCTION GUARANTEES
// =============================================================================

/**
 * GUARANTEE: Year of Birth cannot be reconstructed from cohort.
 *
 * Each cohort spans 10 years, making precise age inference impossible.
 * Even with additional data points, the margin of error is ±10 years.
 *
 * This function documents the guarantee and can be used in audits.
 */
export function getPrivacyGuarantee(): {
  marginOfError: string;
  reconstructionPossible: boolean;
  complianceNote: string;
} {
  return {
    marginOfError: '±10 years',
    reconstructionPossible: false,
    complianceNote:
      'Year of Birth is processed client-side, mapped to a 10-year cohort, ' +
      'and immediately discarded. Only the cohort ID is transmitted and stored. ' +
      'The original YOB cannot be reconstructed from the cohort ID alone.',
  };
}

/**
 * Audit log entry for age data processing.
 * Documents that YOB was processed and purged.
 */
export interface AgeProcessingAuditEntry {
  readonly eventType: 'age_data_processed';
  readonly timestamp: string;
  readonly resultingCohort: AgeCohort;
  readonly yobPurged: true; // Always true - YOB is never retained
  readonly processingLocation: 'client'; // Always client-side
}

/**
 * Create audit entry for age processing.
 */
export function createAgeProcessingAuditEntry(
  cohort: AgeCohort
): AgeProcessingAuditEntry {
  return {
    eventType: 'age_data_processed',
    timestamp: new Date().toISOString(),
    resultingCohort: cohort,
    yobPurged: true,
    processingLocation: 'client',
  };
}
