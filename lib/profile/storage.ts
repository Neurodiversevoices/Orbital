/**
 * Orbital User Profile Storage
 *
 * Local storage for optional demographic fields.
 * These fields are NEVER shared socially or exposed in Circles.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  DEFAULT_USER_PROFILE,
  GenderChoice,
  isValidYearOfBirth,
} from './types';

// =============================================================================
// STORAGE KEY
// =============================================================================

const PROFILE_STORAGE_KEY = '@orbital:user_profile';

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Load user profile from storage.
 */
export async function loadProfile(): Promise<UserProfile> {
  try {
    const json = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!json) return DEFAULT_USER_PROFILE;

    const stored = JSON.parse(json);

    // Merge with defaults to handle missing fields from old versions
    return {
      ...DEFAULT_USER_PROFILE,
      ...stored,
    };
  } catch (error) {
    if (__DEV__) console.error('[Profile] Failed to load:', error);
    return DEFAULT_USER_PROFILE;
  }
}

/**
 * Save user profile to storage.
 */
export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    const toSave: UserProfile = {
      ...profile,
      profileUpdatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    if (__DEV__) console.error('[Profile] Failed to save:', error);
    throw error;
  }
}

/**
 * Update year of birth.
 */
export async function updateYearOfBirth(year: number | null): Promise<boolean> {
  if (!isValidYearOfBirth(year)) {
    return false;
  }

  const profile = await loadProfile();
  await saveProfile({
    ...profile,
    yearOfBirth: year,
  });
  return true;
}

/**
 * Update gender.
 */
export async function updateGender(
  choice: GenderChoice | null,
  selfDescribed: string | null = null
): Promise<void> {
  const profile = await loadProfile();
  await saveProfile({
    ...profile,
    genderChoice: choice,
    // Only store self-described text if that option is selected
    genderSelfDescribed: choice === 'self_described' ? selfDescribed : null,
  });
}

/**
 * Clear all profile data.
 */
export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
}

// =============================================================================
// EXPORT HELPERS
// =============================================================================

/**
 * Get profile data for personal export (user owns their data).
 */
export async function getProfileForExport(): Promise<UserProfile> {
  return await loadProfile();
}

/**
 * Get profile data for shared exports (demographics excluded by default).
 * Only includes demographics if explicitly requested.
 */
export async function getProfileForSharedExport(
  includeDemographics: boolean
): Promise<Partial<UserProfile>> {
  if (!includeDemographics) {
    return {}; // No demographics in shared exports by default
  }

  const profile = await loadProfile();

  // Never include self-described text in shared exports
  return {
    yearOfBirth: profile.yearOfBirth,
    genderChoice: profile.genderChoice,
    // Omit genderSelfDescribed - NEVER shared
    profileUpdatedAt: profile.profileUpdatedAt,
  };
}
