/**
 * Tutorial state management hook
 *
 * SILENT ONBOARDING: This hook now always returns hasSeenTutorial: true.
 *
 * Per SILENT_ONBOARDING.md doctrine:
 * - "If a user is confused, that is acceptable."
 * - "If a user is instructed, the system has failed."
 *
 * The Orb is self-evident or it is nothing. No tutorial flow exists.
 *
 * The hook interface is preserved for backwards compatibility,
 * but the tutorial screen will never be shown.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for tracking first capacity signal (for irreversibility)
const FIRST_SIGNAL_KEY = 'orbital:firstSignalLogged:v1';

export interface TutorialState {
  /** Always true - silent onboarding means no tutorial */
  hasSeenTutorial: boolean | null;
  isLoading: boolean;
  /** No-op for backwards compatibility */
  markTutorialSeen: () => Promise<void>;
  /** No-op for backwards compatibility */
  resetTutorial: () => Promise<void>;
  /** Track first signal for irreversibility trigger */
  hasLoggedFirstSignal: boolean;
  /** Mark that user has logged their first signal */
  markFirstSignalLogged: () => Promise<void>;
}

export function useTutorial(): TutorialState {
  // SILENT ONBOARDING: Always bypass tutorial
  const [hasSeenTutorial] = useState<boolean | null>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoggedFirstSignal, setHasLoggedFirstSignal] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const firstSignal = await AsyncStorage.getItem(FIRST_SIGNAL_KEY);
      setHasLoggedFirstSignal(firstSignal === 'true');
    } catch (error) {
      console.warn('[Tutorial] Failed to load state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // No-op: Tutorial is bypassed
  const markTutorialSeen = useCallback(async () => {
    // Intentionally empty - silent onboarding
  }, []);

  // No-op: Tutorial cannot be reset
  const resetTutorial = useCallback(async () => {
    // Intentionally empty - silent onboarding
  }, []);

  // Track first signal for irreversibility trigger
  const markFirstSignalLogged = useCallback(async () => {
    try {
      await AsyncStorage.setItem(FIRST_SIGNAL_KEY, 'true');
      setHasLoggedFirstSignal(true);
    } catch (error) {
      console.warn('[Tutorial] Failed to mark first signal:', error);
    }
  }, []);

  return {
    hasSeenTutorial, // Always true
    isLoading,
    markTutorialSeen,
    resetTutorial,
    hasLoggedFirstSignal,
    markFirstSignalLogged,
  };
}
