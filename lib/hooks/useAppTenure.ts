/**
 * useAppTenure - Track how long user has been using the app
 *
 * Used for the "30-day tease" feature where Free users see a blurred
 * preview of extended pattern history after 30 days of app usage.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../storage';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TEASE_THRESHOLD_DAYS = 30;

export interface AppTenure {
  /** Timestamp of first app open (null if not yet recorded) */
  firstOpenTimestamp: number | null;
  /** Number of days since first app open */
  daysSinceFirstOpen: number;
  /** Whether the app is still loading tenure data */
  isLoading: boolean;
  /** Whether user has used the app for 30+ days (eligible for tease) */
  hasUsedAppFor30Days: boolean;
  /** Force refresh the tenure data */
  refresh: () => Promise<void>;
}

export function useAppTenure(): AppTenure {
  const [firstOpenTimestamp, setFirstOpenTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrSetFirstOpen = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_APP_OPEN);

      if (stored) {
        // Already have a first open timestamp
        setFirstOpenTimestamp(parseInt(stored, 10));
      } else {
        // First time - record now
        const now = Date.now();
        await AsyncStorage.setItem(STORAGE_KEYS.FIRST_APP_OPEN, String(now));
        setFirstOpenTimestamp(now);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[useAppTenure] Failed to load/set first open:', error);
      }
      // Fallback to now if storage fails
      setFirstOpenTimestamp(Date.now());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrSetFirstOpen();
  }, [loadOrSetFirstOpen]);

  // Calculate days since first open
  const daysSinceFirstOpen = firstOpenTimestamp
    ? Math.floor((Date.now() - firstOpenTimestamp) / MS_PER_DAY)
    : 0;

  // Eligible for 30-day tease?
  const hasUsedAppFor30Days = daysSinceFirstOpen >= TEASE_THRESHOLD_DAYS;

  return {
    firstOpenTimestamp,
    daysSinceFirstOpen,
    isLoading,
    hasUsedAppFor30Days,
    refresh: loadOrSetFirstOpen,
  };
}
