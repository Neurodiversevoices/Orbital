/**
 * Tutorial state management hook
 * Tracks whether user has completed the onboarding tutorial
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = 'orbital:tutorialSeen:v1';

export interface TutorialState {
  hasSeenTutorial: boolean | null; // null = loading
  isLoading: boolean;
  markTutorialSeen: () => Promise<void>;
  resetTutorial: () => Promise<void>;
}

export function useTutorial(): TutorialState {
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTutorialState();
  }, []);

  const loadTutorialState = async () => {
    try {
      const value = await AsyncStorage.getItem(TUTORIAL_KEY);
      setHasSeenTutorial(value === 'true');
    } catch (error) {
      console.warn('[Tutorial] Failed to load state:', error);
      setHasSeenTutorial(true); // Default to seen if error
    } finally {
      setIsLoading(false);
    }
  };

  const markTutorialSeen = useCallback(async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
      setHasSeenTutorial(true);
    } catch (error) {
      console.warn('[Tutorial] Failed to mark seen:', error);
    }
  }, []);

  const resetTutorial = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_KEY);
      setHasSeenTutorial(false);
    } catch (error) {
      console.warn('[Tutorial] Failed to reset:', error);
    }
  }, []);

  return {
    hasSeenTutorial,
    isLoading,
    markTutorialSeen,
    resetTutorial,
  };
}
