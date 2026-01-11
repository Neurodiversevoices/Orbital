import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CapacityLog, CapacityState, Tag } from '../../types';
import { savelog, getLogs, deleteLog, clearAllLogs, generateId } from '../storage';
import { getLocalDate } from '../baselineUtils';
import { FREE_TIER_LIMITS } from '../subscription/types';
import { useCloudSync } from '../cloud';
import { useAuth } from '../supabase/auth';

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
      };

      await savelog(newLog);
      setLogs((prev) => [newLog, ...prev]);

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

  // Calculate current month's signal count for free tier gating
  const currentMonthSignalCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return logs.filter(log => log.timestamp >= monthStart).length;
  }, [logs]);

  const hasHitSignalLimit = currentMonthSignalCount >= FREE_TIER_LIMITS.maxSignalsPerMonth;
  const signalsRemaining = Math.max(0, FREE_TIER_LIMITS.maxSignalsPerMonth - currentMonthSignalCount);

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
