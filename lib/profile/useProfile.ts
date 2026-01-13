/**
 * Orbital User Profile Hook
 *
 * React hook for managing optional demographic profile.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  DEFAULT_USER_PROFILE,
  GenderChoice,
  AgeBracket,
  computeAgeBracket,
  isValidYearOfBirth,
  getYearOfBirthError,
} from './types';
import {
  loadProfile,
  saveProfile,
  updateYearOfBirth,
  updateGender,
  clearProfile,
} from './storage';

export interface UseProfileReturn {
  // State
  profile: UserProfile;
  isLoading: boolean;

  // Computed
  ageBracket: AgeBracket | null;

  // Validation
  isValidYear: (year: number | null) => boolean;
  getYearError: (year: number | null) => string | null;

  // Actions
  setYearOfBirth: (year: number | null) => Promise<boolean>;
  setGender: (choice: GenderChoice | null, selfDescribed?: string | null) => Promise<void>;
  clearAllProfile: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile on mount
  useEffect(() => {
    loadProfile().then(loaded => {
      setProfile(loaded);
      setIsLoading(false);
    });
  }, []);

  // Computed age bracket
  const ageBracket = computeAgeBracket(profile.yearOfBirth);

  // Set year of birth
  const setYearOfBirth = useCallback(async (year: number | null): Promise<boolean> => {
    const success = await updateYearOfBirth(year);
    if (success) {
      setProfile(prev => ({
        ...prev,
        yearOfBirth: year,
        profileUpdatedAt: new Date().toISOString(),
      }));
    }
    return success;
  }, []);

  // Set gender
  const setGender = useCallback(async (
    choice: GenderChoice | null,
    selfDescribed: string | null = null
  ): Promise<void> => {
    await updateGender(choice, selfDescribed);
    setProfile(prev => ({
      ...prev,
      genderChoice: choice,
      genderSelfDescribed: choice === 'self_described' ? selfDescribed : null,
      profileUpdatedAt: new Date().toISOString(),
    }));
  }, []);

  // Clear profile
  const clearAllProfile = useCallback(async (): Promise<void> => {
    await clearProfile();
    setProfile(DEFAULT_USER_PROFILE);
  }, []);

  // Refresh from storage
  const refresh = useCallback(async (): Promise<void> => {
    const loaded = await loadProfile();
    setProfile(loaded);
  }, []);

  return {
    profile,
    isLoading,
    ageBracket,
    isValidYear: isValidYearOfBirth,
    getYearError: getYearOfBirthError,
    setYearOfBirth,
    setGender,
    clearAllProfile,
    refresh,
  };
}
