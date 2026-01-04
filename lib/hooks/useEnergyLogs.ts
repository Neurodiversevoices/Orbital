import { useState, useEffect, useCallback, useMemo } from 'react';
import { CapacityLog, CapacityState, Tag } from '../../types';
import { savelog, getLogs, deleteLog, clearAllLogs, generateId } from '../storage';
import { getLocalDate } from '../baselineUtils';
import { FREE_TIER_LIMITS } from '../subscription/types';

interface UseCapacityLogsReturn {
  logs: CapacityLog[];
  isLoading: boolean;
  saveEntry: (state: CapacityState, tags?: Tag[], note?: string) => Promise<void>;
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

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

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
    },
    []
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
