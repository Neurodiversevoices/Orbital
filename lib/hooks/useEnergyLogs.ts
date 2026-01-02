import { useState, useEffect, useCallback } from 'react';
import { CapacityLog, CapacityState, Tag } from '../../types';
import { savelog, getLogs, deleteLog, clearAllLogs, generateId } from '../storage';

interface UseCapacityLogsReturn {
  logs: CapacityLog[];
  isLoading: boolean;
  saveEntry: (state: CapacityState, tags?: Tag[], note?: string) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
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
    async (state: CapacityState, tags: Tag[] = [], note?: string) => {
      const newLog: CapacityLog = {
        id: generateId(),
        state,
        timestamp: Date.now(),
        tags,
        note,
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

  return {
    logs,
    isLoading,
    saveEntry,
    removeLog,
    clearAll,
    refresh,
  };
}
