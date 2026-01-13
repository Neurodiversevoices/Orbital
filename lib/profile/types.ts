/**
 * Orbital User Profile Types
 *
 * Optional demographic fields for aggregate analytics only.
 * NEVER visible to other users, NEVER used in social features.
 */

// =============================================================================
// GENDER
// =============================================================================

export type GenderChoice =
  | 'woman'
  | 'man'
  | 'non_binary'
  | 'self_described'
  | 'unspecified';

export const GENDER_OPTIONS: { value: GenderChoice; label: string }[] = [
  { value: 'unspecified', label: 'Prefer not to say' },
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'self_described', label: 'Self-described' },
];

// =============================================================================
// AGE BRACKETS (Computed, not stored)
// =============================================================================

export type AgeBracket =
  | '0-5'
  | '6-9'
  | '10-13'
  | '14-18'
  | '19-24'
  | '25-30'
  | '31-40'
  | '41-50'
  | '51-60'
  | '60+';

export const AGE_BRACKETS: AgeBracket[] = [
  '0-5',
  '6-9',
  '10-13',
  '14-18',
  '19-24',
  '25-30',
  '31-40',
  '41-50',
  '51-60',
  '60+',
];

// =============================================================================
// USER PROFILE
// =============================================================================

export interface UserProfile {
  /**
   * Year of birth (YYYY format).
   * Used to compute age brackets dynamically.
   * Never expose exact age publicly.
   */
  yearOfBirth: number | null;

  /**
   * Gender selection from predefined options.
   */
  genderChoice: GenderChoice | null;

  /**
   * Free-text gender description.
   * Only stored if genderChoice === 'self_described'.
   * NEVER displayed or aggregated - user data only.
   */
  genderSelfDescribed: string | null;

  /**
   * Last profile update timestamp.
   */
  profileUpdatedAt: string | null;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  yearOfBirth: null,
  genderChoice: null,
  genderSelfDescribed: null,
  profileUpdatedAt: null,
};

// =============================================================================
// VALIDATION
// =============================================================================

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;

/**
 * Validate year of birth is within reasonable bounds.
 */
export function isValidYearOfBirth(year: number | null): boolean {
  if (year === null) return true; // null is valid (not provided)
  return Number.isInteger(year) && year >= MIN_YEAR && year <= CURRENT_YEAR;
}

/**
 * Get validation error message for year of birth.
 */
export function getYearOfBirthError(year: number | null): string | null {
  if (year === null) return null;
  if (!Number.isInteger(year)) return 'Please enter a valid year';
  if (year < MIN_YEAR) return `Year must be ${MIN_YEAR} or later`;
  if (year > CURRENT_YEAR) return 'Year cannot be in the future';
  return null;
}

// =============================================================================
// AGE BRACKET COMPUTATION
// =============================================================================

/**
 * Compute age from year of birth.
 * Assumes January 1 internally.
 */
export function computeAge(yearOfBirth: number | null): number | null {
  if (yearOfBirth === null) return null;
  return CURRENT_YEAR - yearOfBirth;
}

/**
 * Compute age bracket from year of birth.
 * Returns null if year not provided.
 */
export function computeAgeBracket(yearOfBirth: number | null): AgeBracket | null {
  const age = computeAge(yearOfBirth);
  if (age === null) return null;

  if (age <= 5) return '0-5';
  if (age <= 9) return '6-9';
  if (age <= 13) return '10-13';
  if (age <= 18) return '14-18';
  if (age <= 24) return '19-24';
  if (age <= 30) return '25-30';
  if (age <= 40) return '31-40';
  if (age <= 50) return '41-50';
  if (age <= 60) return '51-60';
  return '60+';
}

/**
 * Get human-readable label for age bracket.
 */
export function getAgeBracketLabel(bracket: AgeBracket | null): string {
  if (bracket === null) return 'Not provided';
  if (bracket === '60+') return '60 and over';
  return `${bracket} years`;
}

// =============================================================================
// K-ANONYMITY HELPERS
// =============================================================================

const DEFAULT_K_THRESHOLD = 10;

/**
 * Check if a demographic breakdown can be shown based on k-anonymity.
 * Returns true if count >= k threshold.
 */
export function canShowDemographicBreakdown(
  count: number,
  k: number = DEFAULT_K_THRESHOLD
): boolean {
  return count >= k;
}

/**
 * Filter demographic data to enforce k-anonymity.
 * Returns only buckets that meet the threshold.
 */
export function filterByKAnonymity<T extends { count: number }>(
  data: T[],
  k: number = DEFAULT_K_THRESHOLD
): T[] {
  return data.filter(item => item.count >= k);
}

/**
 * Get message for suppressed data.
 */
export function getSuppressedMessage(): string {
  return 'Not enough data to display';
}
