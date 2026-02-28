import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CapacityLog, CapacityState, Tag } from '../../types';
import { savelog, getLogs, deleteLog, clearAllLogs, generateId } from '../storage';
import { getLocalDate } from '../baselineUtils';
import { FREE_TIER_LIMITS } from '../subscription/types';
import { useCloudSync } from '../cloud';
import { useAuth } from '../supabase/auth';
import { logCapacityEntry } from '../supabase/auditLog';
import { scoreLogConfidence } from '../supabase/confidenceScoring';

// Default capacity_value mapping from discrete state → continuous 0.0–1.0
const STATE_TO_CAPACITY: Record<CapacityState, number> = {
  resourced: 0.8,
  stretched: 0.5,
  depleted: 0.25,
};

// All known driver keys for a complete driver_data object
const ALL_DRIVER_KEYS: readonly string[] = [
  'sensory', 'demand', 'social', 'sleep', 'stress', 'exercise', 'meds', 'food',
] as const;

/**
 * Build driver_data from selected tags.
 * Each known driver gets 1 if selected, 0 otherwise.
 */
function buildDriverData(tags: Tag[]): Record<string, number> {
  const data: Record<string, number> = {};
  for (const key of ALL_DRIVER_KEYS) {
    data[key] = tags.includes(key as Tag) ? 1 : 0;
  }
  return data;
}

interface UseCapacityLogsReturn {
  logs: CapacityLog[];
  isLoading: boolean;
  saveEntry: (state: CapacityState, tags?: Tag[], note?: string, detailsText?: string) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Number of signals logged this month */
  currentMonthSignalCount: number;
  /** Whether user has hit the free tier signal limit */
  hasHitSignalLimit: boolean;
  /** Signals remaining in free tier */
  signalsRemaining: number;
}

// Keep export name for backwards compatibility but update types
export function useEnergyLogs(): UseCapacityLogsReturn {
  const [logs, setLogs] = useState<CapacityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = useAuth();
  const cloudSync = useCloudSync();
  const hasInitialPull = useRef(false);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let data = await getLogs();

      // Cloud sync is automatic when authenticated - pull and merge
      if (auth.isAuthenticated && !hasInitialPull.current) {
        try {
          data = await cloudSync.pullAndMerge(data);
          hasInitialPull.current = true;
        } catch (e) {
          if (__DEV__) console.error('[useEnergyLogs] Cloud pull failed:', e);
          // Continue with local data
        }
      }

      setLogs(data);
    } catch (error) {
      if (__DEV__) console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Reset initial pull flag when user signs out
  useEffect(() => {
    if (!auth.isAuthenticated) {
      hasInitialPull.current = false;
    }
  }, [auth.isAuthenticated]);

  const saveEntry = useCallback(
    async (state: CapacityState, tags: Tag[] = [], note?: string, detailsText?: string) => {
      const timestamp = Date.now();
      const newLog: CapacityLog = {
        id: generateId(),
        state,
        timestamp,
        tags,
        note,
        localDate: getLocalDate(timestamp),
        detailsText: detailsText || note, // Use detailsText if provided, otherwise use note
        capacity_value: STATE_TO_CAPACITY[state] ?? 0.5,
        driver_data: buildDriverData(tags),
      };

      if (__DEV__) console.log('[useEnergyLogs] Log created:', { id: newLog.id, state, capacity_value: newLog.capacity_value, driver_data: newLog.driver_data });

      await savelog(newLog);
      setLogs((prev) => [newLog, ...prev]);

      // Fire-and-forget audit log + confidence scoring
      if (auth.isAuthenticated && auth.user?.id) {
        const userId = auth.user.id;

        logCapacityEntry(
          userId,
          newLog.capacity_value ?? null,
          newLog.state,
          newLog.driver_data ?? null,
        ).catch((e) => {
          if (__DEV__) console.error('[useEnergyLogs] Audit log failed:', e);
        });

        // Fire-and-forget confidence flag computation
        scoreLogConfidence(userId, {
          capacity_value: newLog.capacity_value,
          occurred_at: new Date(newLog.timestamp).toISOString(),
          created_at: new Date().toISOString(),
        }).catch((e) => {
          if (__DEV__) console.error('[useEnergyLogs] Confidence scoring failed:', e);
        });
      }

      // Cloud sync is automatic when authenticated
      if (auth.isAuthenticated) {
        try {
          await cloudSync.enqueueLogForSync(newLog);
        } catch (e) {
          if (__DEV__) console.error('[useEnergyLogs] Cloud enqueue failed:', e);
          // Local save succeeded, cloud sync will retry
        }
      }
    },
    [auth.isAuthenticated, cloudSync.enqueueLogForSync]
  );

  const removeLog = useCallback(async (id: string) => {
    await deleteLog(id);
    setLogs((prev) => prev.filter((log) => log.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await clearAllLogs();
    setLogs([]);
  }, []);

  const refresh = useCallback(async () => {
    // Reset pull flag to force cloud refresh
    hasInitialPull.current = false;
    await loadLogs();
  }, [loadLogs]);

  // Calculate current month's signal count (kept for analytics, but no longer used for gating)
  const currentMonthSignalCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return logs.filter(log => log.timestamp >= monthStart).length;
  }, [logs]);

  // All users now have unlimited signals - these are kept for backward compatibility
  const hasHitSignalLimit = false;  // Never limited
  const signalsRemaining = Infinity;

  return {
    logs,
    isLoading,
    saveEntry,
    removeLog,
    clearAll,
    refresh,
    currentMonthSignalCount,
    hasHitSignalLimit,
    signalsRemaining,
  };
}
