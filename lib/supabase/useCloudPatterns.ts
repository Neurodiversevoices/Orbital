/**
 * Cloud-First Pattern Hook
 *
 * Wraps useEnergyLogs with cloud sync capabilities.
 * Falls back to local-only when cloud is unavailable.
 *
 * Note: This hook bridges between local storage types and cloud types.
 * Local uses: resourced/stretched/depleted
 * Cloud uses: green/yellow/red/black (for broader use cases)
 *
 * Usage:
 *   // Replace useEnergyLogs with useCloudPatterns where cloud sync is desired
 *   const { logs, addLog, syncStatus } = useCloudPatterns();
 */

import { useCallback, useMemo } from 'react';
import { useEnergyLogs } from '../hooks/useEnergyLogs';
import { useCapacitySync, exportUserData, deleteUserData } from './sync';
import { useAuth, isSupabaseConfigured } from './index';
import { LocalCapacityLog, SyncStatus, CapacityState as CloudCapacityState } from './types';
import { CapacityState as LocalCapacityState, Tag } from '../../types';

// Map between local and cloud state names
const LOCAL_TO_CLOUD_STATE: Record<LocalCapacityState, CloudCapacityState> = {
  resourced: 'green',
  stretched: 'yellow',
  depleted: 'red',
};

const CLOUD_TO_LOCAL_STATE: Record<CloudCapacityState, LocalCapacityState> = {
  green: 'resourced',
  yellow: 'stretched',
  red: 'depleted',
  black: 'depleted', // black maps to depleted (most severe)
};

export interface CloudPatternsContext {
  // Data
  logs: LocalCapacityLog[];
  isLoading: boolean;

  // Sync
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
  isCloudEnabled: boolean;
  isAuthenticated: boolean;

  // Actions
  addLog: (state: LocalCapacityState, tags?: Tag[], note?: string) => Promise<void>;
  deleteLog: (localId: string) => Promise<void>;

  // GDPR
  exportAllData: () => Promise<Record<string, unknown> | null>;
  deleteAllData: () => Promise<boolean>;

  // Legacy compatibility
  currentMonthSignalCount: number;
}

export function useCloudPatterns(): CloudPatternsContext {
  const localLogs = useEnergyLogs();
  const cloudSync = useCapacitySync();
  const auth = useAuth();

  const isCloudEnabled = isSupabaseConfigured();
  const isAuthenticated = auth.isAuthenticated;

  // Determine which logs to use
  // If authenticated, prefer cloud logs; otherwise use local
  const logs = useMemo(() => {
    if (isAuthenticated && cloudSync.logs.length > 0) {
      return cloudSync.logs;
    }
    // Convert local logs to CloudLog format
    return localLogs.logs.map(log => ({
      localId: log.id,
      occurredAt: new Date(log.timestamp),
      state: LOCAL_TO_CLOUD_STATE[log.state] || 'yellow',
      tags: (log.tags || []) as string[],
      note: log.note || null,
      isDemo: false,
      syncedAt: null,
      cloudId: null,
    }));
  }, [isAuthenticated, cloudSync.logs, localLogs.logs]);

  // Add a log (to both local and cloud)
  const addLog = useCallback(async (
    state: LocalCapacityState,
    tags: Tag[] = [],
    note?: string
  ) => {
    // Always add to local first (immediate UI response)
    await localLogs.saveEntry(state, tags, note);

    // If cloud is enabled and authenticated, also sync to cloud
    if (isAuthenticated) {
      await cloudSync.addLog({
        occurredAt: new Date(),
        state: LOCAL_TO_CLOUD_STATE[state] || 'yellow',
        tags: tags as string[],
        note: note || null,
        isDemo: false,
      });
    }
  }, [localLogs, cloudSync, isAuthenticated]);

  // Delete a log
  const deleteLog = useCallback(async (localId: string) => {
    // Delete from local
    await localLogs.removeLog(localId);

    // If cloud is enabled, delete from cloud too
    if (isAuthenticated) {
      await cloudSync.deleteLog(localId);
    }
  }, [localLogs, cloudSync, isAuthenticated]);

  // Export all data (local + cloud)
  const exportAllData = useCallback(async () => {
    if (isAuthenticated) {
      return await exportUserData();
    }
    // Return local data if not authenticated
    return {
      exported_at: new Date().toISOString(),
      source: 'local_only',
      capacity_logs: localLogs.logs,
    };
  }, [isAuthenticated, localLogs.logs]);

  // Delete all data
  const deleteAllData = useCallback(async () => {
    // Clear local
    await localLogs.clearAll();

    // Clear cloud if authenticated
    if (isAuthenticated) {
      await cloudSync.clearAllLogs();
      return await deleteUserData();
    }

    return true;
  }, [localLogs, cloudSync, isAuthenticated]);

  return {
    logs,
    isLoading: localLogs.isLoading || auth.isLoading,
    syncStatus: cloudSync.syncStatus,
    syncNow: cloudSync.syncNow,
    isCloudEnabled,
    isAuthenticated,
    addLog,
    deleteLog,
    exportAllData,
    deleteAllData,
    currentMonthSignalCount: localLogs.currentMonthSignalCount,
  };
}
