/**
 * Why Orbital Tracking Hook
 *
 * Tracks whether user has seen the "Why Orbital Exists" moment.
 * Shown once during first app use (skippable).
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@orbital/why_orbital_seen';

export interface UseWhyOrbitalReturn {
  hasSeenWhyOrbital: boolean | null;
  isLoading: boolean;
  markWhyOrbitalSeen: () => Promise<void>;
  resetWhyOrbitalSeen: () => Promise<void>;
}

export function useWhyOrbital(): UseWhyOrbitalReturn {
  const [hasSeenWhyOrbital, setHasSeenWhyOrbital] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        setHasSeenWhyOrbital(value === 'true');
      } catch (error) {
        if (__DEV__) console.error('Failed to load Why Orbital status:', error);
        setHasSeenWhyOrbital(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, []);

  const markWhyOrbitalSeen = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setHasSeenWhyOrbital(true);
    } catch (error) {
      if (__DEV__) console.error('Failed to mark Why Orbital as seen:', error);
    }
  }, []);

  const resetWhyOrbitalSeen = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHasSeenWhyOrbital(false);
    } catch (error) {
      if (__DEV__) console.error('Failed to reset Why Orbital status:', error);
    }
  }, []);

  return {
    hasSeenWhyOrbital,
    isLoading,
    markWhyOrbitalSeen,
    resetWhyOrbitalSeen,
  };
}
