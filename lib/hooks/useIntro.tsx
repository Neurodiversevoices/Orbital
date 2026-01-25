/**
 * Intro State Hook
 *
 * Tracks whether the user has seen the pre-terms explanatory intro.
 * Uses AsyncStorage to persist state across sessions.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INTRO_SEEN_KEY = '@orbital:intro_seen_v1';

/**
 * Check if intro has been seen
 */
export async function hasSeenIntro(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(INTRO_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark intro as seen
 */
export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch (error) {
    if (__DEV__) console.error('[Intro] Error marking as seen:', error);
  }
}

/**
 * Hook to check intro seen state
 */
export function useIntro() {
  const [hasSeen, setHasSeen] = useState(true); // Default true to avoid flash
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkIntroState();
  }, []);

  const checkIntroState = async () => {
    try {
      const seen = await hasSeenIntro();
      setHasSeen(seen);
    } catch {
      setHasSeen(true); // On error, don't block
    } finally {
      setIsLoading(false);
    }
  };

  const markSeen = useCallback(async () => {
    await markIntroSeen();
    setHasSeen(true);
  }, []);

  return {
    hasSeen,
    isLoading,
    markSeen,
  };
}
