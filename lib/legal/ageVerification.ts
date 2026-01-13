/**
 * Age Verification Module — LEGAL REQUIRED
 *
 * APPLIES TO:
 * - FREE USERS
 * - ALL PAID TIERS
 * - ALL ADD-ONS
 * - CCI-Q4 ISSUANCE
 *
 * REQUIREMENTS:
 * - Collect year_of_birth (YYYY only — no full DOB)
 * - Derive age and age_cohort
 * - Require 13+ attestation checkbox
 * - BLOCK users under 13 completely
 * - NO EXCEPTIONS. NO DEMO MODE BYPASS.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = '@orbital:age_verification';
const ATTESTATION_VERSION = '1.0';
const MINIMUM_AGE = 13;

// =============================================================================
// TYPES
// =============================================================================

export type AgeCohort =
  | '13-17'
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55-64'
  | '65+';

export interface AgeVerificationRecord {
  year_of_birth: number;
  age: number;
  age_cohort: AgeCohort;
  attestation_version: string;
  age_verified_at: string;  // ISO timestamp
  attestation_text: string; // Exact text user agreed to
}

export interface AgeVerificationStatus {
  isVerified: boolean;
  isBlocked: boolean;       // True if under 13
  record: AgeVerificationRecord | null;
}

// =============================================================================
// AGE COHORT CALCULATION
// =============================================================================

/**
 * Calculate age from year of birth
 */
export function calculateAge(yearOfBirth: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - yearOfBirth;
}

/**
 * Determine age cohort from age
 */
export function getAgeCohort(age: number): AgeCohort {
  if (age >= 13 && age <= 17) return '13-17';
  if (age >= 18 && age <= 24) return '18-24';
  if (age >= 25 && age <= 34) return '25-34';
  if (age >= 35 && age <= 44) return '35-44';
  if (age >= 45 && age <= 54) return '45-54';
  if (age >= 55 && age <= 64) return '55-64';
  return '65+';
}

/**
 * Check if age meets minimum requirement
 */
export function meetsMinimumAge(age: number): boolean {
  return age >= MINIMUM_AGE;
}

// =============================================================================
// ATTESTATION TEXT — EXACT COPY (LEGAL)
// =============================================================================

export const ATTESTATION_TEXT = 'I confirm that I am at least 13 years old.' as const;

export const BLOCKED_MESSAGE = 'Orbital is available only to users 13 and older.' as const;

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * Get current age verification status
 */
export async function getAgeVerificationStatus(): Promise<AgeVerificationStatus> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { isVerified: false, isBlocked: false, record: null };
    }

    const record: AgeVerificationRecord = JSON.parse(stored);

    // Re-verify age hasn't changed to under 13 (edge case: time travel)
    const currentAge = calculateAge(record.year_of_birth);
    if (!meetsMinimumAge(currentAge)) {
      return { isVerified: false, isBlocked: true, record };
    }

    return { isVerified: true, isBlocked: false, record };
  } catch {
    return { isVerified: false, isBlocked: false, record: null };
  }
}

/**
 * Submit age verification
 * Returns success status and any error message
 */
export async function submitAgeVerification(
  yearOfBirth: number,
  attestationChecked: boolean
): Promise<{ success: boolean; blocked: boolean; error?: string }> {
  // Validate attestation checkbox
  if (!attestationChecked) {
    return {
      success: false,
      blocked: false,
      error: 'You must confirm you are at least 13 years old.',
    };
  }

  // Validate year of birth
  const currentYear = new Date().getFullYear();
  if (yearOfBirth < 1900 || yearOfBirth > currentYear) {
    return {
      success: false,
      blocked: false,
      error: 'Please enter a valid year of birth.',
    };
  }

  // Calculate age
  const age = calculateAge(yearOfBirth);

  // Check minimum age — HARD BLOCK
  // PATCH 3: Do NOT store ANYTHING if under 13. Purge happens in AgeGate component.
  if (!meetsMinimumAge(age)) {
    // Return blocked immediately — NO DATA STORED
    return {
      success: false,
      blocked: true,
      error: BLOCKED_MESSAGE,
    };
  }

  // Create verification record (ONLY if age >= 13)
  const record: AgeVerificationRecord = {
    year_of_birth: yearOfBirth,
    age,
    age_cohort: getAgeCohort(age),
    attestation_version: ATTESTATION_VERSION,
    age_verified_at: new Date().toISOString(),
    attestation_text: ATTESTATION_TEXT,
  };

  // Store record
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return { success: true, blocked: false };
  } catch {
    return {
      success: false,
      blocked: false,
      error: 'Failed to save verification. Please try again.',
    };
  }
}

/**
 * Clear age verification (for testing only)
 * @internal
 */
export async function clearAgeVerification(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// =============================================================================
// PATCH 3: UNDER-13 DATA PURGE — LEGAL REQUIRED
// =============================================================================

/**
 * ORBITAL KEY PREFIX — All Orbital-namespaced keys start with this
 */
const ORBITAL_KEY_PREFIX = '@orbital:';

/**
 * Purge ALL Orbital-namespaced local state for under-13 users.
 *
 * LEGAL REQUIREMENT: When a user is determined to be under 13,
 * we must NOT store ANY data — not even the birth year or attestation.
 *
 * This function removes all keys starting with '@orbital:' from AsyncStorage.
 * Called BEFORE rendering BlockedScreen.
 *
 * @returns List of purged keys (for audit logging only, not exposed to UI)
 */
export async function purgeUnderageLocalState(): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const orbitalKeys = allKeys.filter(key => key.startsWith(ORBITAL_KEY_PREFIX));

    if (orbitalKeys.length > 0) {
      await AsyncStorage.multiRemove(orbitalKeys);
      if (__DEV__) {
        console.log('[AgeVerification] Purged underage local state:', orbitalKeys);
      }
    }

    return orbitalKeys;
  } catch (error) {
    // Fail silently but log in dev
    if (__DEV__) {
      console.error('[AgeVerification] Failed to purge underage state:', error);
    }
    return [];
  }
}

/**
 * Get attestation version for audit
 */
export function getAttestationVersion(): string {
  return ATTESTATION_VERSION;
}

/**
 * Get minimum age requirement
 */
export function getMinimumAge(): number {
  return MINIMUM_AGE;
}
