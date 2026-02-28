/**
 * Tutorial state management hook
 *
 * Shows tutorial for new users to help them understand the app.
 * Tutorial is shown once on first app open, then marked as seen.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_REVIEW_MODE } from '../reviewMode';

// Storage keys
const TUTORIAL_SEEN_KEY = 'orbital:tutorialSeen:v1';
const FIRST_SIGNAL_KEY = 'orbital:firstSignalLogged:v1';

export interface TutorialState {
  /** Whether user has completed the tutorial */
  hasSeenTutorial: boolean | null;
  isLoading: boolean;
  /** Mark tutorial as seen (call when user completes or skips) */
  markTutorialSeen: () => Promise<void>;
  /** Reset tutorial state (for testing) */
  resetTutorial: () => Promise<void>;
  /** Track first signal for irreversibility trigger */
  hasLoggedFirstSignal: boolean;
  /** Mark that user has logged their first signal */
  markFirstSignalLogged: () => Promise<void>;
}

export function useTutorial(): TutorialState {
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoggedFirstSignal, setHasLoggedFirstSignal] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      // DEV / review mode: auto-dismiss tutorial so we can see the main screens.
      // This does not unlock any features — only skips the onboarding walkthrough.
      if (__DEV__ || IS_REVIEW_MODE) {
        await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
        setHasSeenTutorial(true);
        setHasLoggedFirstSignal(false);
        setIsLoading(false);
        return;
      }

      const [tutorialSeen, firstSignal] = await Promise.all([
        AsyncStorage.getItem(TUTORIAL_SEEN_KEY),
        AsyncStorage.getItem(FIRST_SIGNAL_KEY),
      ]);
      setHasSeenTutorial(tutorialSeen === 'true');
      setHasLoggedFirstSignal(firstSignal === 'true');
    } catch (error) {
      if (__DEV__) console.warn('[Tutorial] Failed to load state:', error);
      // Default to showing tutorial on error
      setHasSeenTutorial(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark tutorial as completed
  const markTutorialSeen = useCallback(async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
      setHasSeenTutorial(true);
    } catch (error) {
      if (__DEV__) console.warn('[Tutorial] Failed to mark as seen:', error);
    }
  }, []);

  // Reset tutorial (for testing/debugging)
  const resetTutorial = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_SEEN_KEY);
      setHasSeenTutorial(false);
    } catch (error) {
      if (__DEV__) console.warn('[Tutorial] Failed to reset:', error);
    }
  }, []);

  // Track first signal for irreversibility trigger
  const markFirstSignalLogged = useCallback(async () => {
    try {
      await AsyncStorage.setItem(FIRST_SIGNAL_KEY, 'true');
      setHasLoggedFirstSignal(true);
    } catch (error) {
      if (__DEV__) console.warn('[Tutorial] Failed to mark first signal:', error);
    }
  }, []);

  return {
    hasSeenTutorial,
    isLoading,
    markTutorialSeen,
    resetTutorial,
    hasLoggedFirstSignal,
    markFirstSignalLogged,
  };
}
