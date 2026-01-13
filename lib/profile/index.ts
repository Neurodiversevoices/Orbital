/**
 * Orbital User Profile Module
 *
 * Optional demographic fields for aggregate analytics only.
 *
 * PRIVACY GUARANTEES:
 * - These fields NEVER appear in Circles
 * - These fields NEVER appear in live signaling
 * - These fields NEVER appear in sharing links by default
 * - These fields are NEVER visible to family members
 * - These fields are NEVER visible to sponsors or institutions
 * - These fields do NOT affect pricing, eligibility, or access
 *
 * Usage:
 *   import { useProfile, canShowDemographicBreakdown } from '@/lib/profile';
 *
 *   const { profile, setYearOfBirth, setGender } = useProfile();
 */

// Types
export {
  GenderChoice,
  AgeBracket,
  UserProfile,
  DEFAULT_USER_PROFILE,
  GENDER_OPTIONS,
  AGE_BRACKETS,
} from './types';

// Validation & Computation
export {
  isValidYearOfBirth,
  getYearOfBirthError,
  computeAge,
  computeAgeBracket,
  getAgeBracketLabel,
} from './types';

// K-Anonymity
export {
  canShowDemographicBreakdown,
  filterByKAnonymity,
  getSuppressedMessage,
} from './types';

// Storage
export {
  loadProfile,
  saveProfile,
  clearProfile,
  getProfileForExport,
  getProfileForSharedExport,
} from './storage';

// Hook
export { useProfile } from './useProfile';
export type { UseProfileReturn } from './useProfile';
