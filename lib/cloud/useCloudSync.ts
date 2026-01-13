/**
 * Cloud Sync Hook
 *
 * React hook for automatic cloud sync operations.
 *
 * IMPORTANT: Cloud sync is AUTOMATIC when authenticated.
 * There is no opt-in/opt-out UI. Authentication = cloud is system of record.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../supabase/auth';
import { isSupabaseConfigured } from '../supabase/client';
import {
  CloudSyncStatus,
  DEFAULT_CLOUD_SYNC_STATUS,
  CloudCapacityLog,
} from './types';
import {
  loadCloudSettings,
  enableCloudBackup,
  disableCloudBackup,
  isCloudBackupEnabled,
  getDeviceId,
} from './settings';
import {
  enqueueLog,
  getPendingCount,
  getFailedCount,
  clearOutbox,
} from './outbox';
import {
  pushToCloud,
  pullFromCloud,
  fullSync,
  getSyncStatus,
  localToCloudUpsert,
  mergeCloudIntoLocal,
  cloudToLocal,
} from './syncEngine';
import { CapacityLog } from '../../types';

// =============================================================================
// SYNC CONFIGURATION
// =============================================================================

const SYNC_INTERVAL_MS = 60000; // 1 minute

// =============================================================================
// HOOK
// =============================================================================

export interface UseCloudSyncReturn {
  // Status
  status: CloudSyncStatus;
  isConfigured: boolean;

  // Actions
  /** @deprecated Cloud sync is automatic. No-op for backwards compatibility. */
  enableSync: () => Promise<void>;
  /** @deprecated Cloud sync cannot be disabled. No-op for backwards compatibility. */
  disableSync: () => Promise<void>;
  syncNow: () => Promise<void>;

  // Log operations (call these when saving/deleting logs)
  enqueueLogForSync: (log: CapacityLog) => Promise<void>;

  // Data access
  pullAndMerge: (localLogs: CapacityLog[]) => Promise<CapacityLog[]>;
}

export function useCloudSync(): UseCloudSyncReturn {
  const auth = useAuth();
  const [status, setStatus] = useState<CloudSyncStatus>(DEFAULT_CLOUD_SYNC_STATUS);
  const syncInProgress = useRef(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isConfigured = isSupabaseConfigured();

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, [auth.isAuthenticated]);

  const loadStatus = useCallback(async () => {
    const newStatus = await getSyncStatus();
    setStatus(prev => ({
      ...newStatus,
      // Cloud sync is ALWAYS enabled when authenticated
      isEnabled: auth.isAuthenticated,
      isSyncing: prev.isSyncing,
    }));
  }, [auth.isAuthenticated]);

  // @deprecated Cloud sync is automatic when authenticated
  const enableSync = useCallback(async () => {
    // No-op: cloud sync is automatic when authenticated
    // Trigger sync if authenticated
    if (auth.isAuthenticated) {
      await syncNow();
    }
  }, [auth.isAuthenticated]);

  // @deprecated Cloud sync cannot be disabled
  const disableSync = useCallback(async () => {
    // No-op: cloud sync cannot be disabled
    if (__DEV__) console.warn('[CloudSync] disableSync is deprecated. Cloud sync is automatic when authenticated.');
  }, []);

  // Perform sync - automatic when authenticated
  const syncNow = useCallback(async () => {
    if (syncInProgress.current) return;
    if (!auth.isAuthenticated) return;

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setStatus(prev => ({ ...prev, error: 'No network connection' }));
      return;
    }

    syncInProgress.current = true;
    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const result = await fullSync();
      if (__DEV__) console.log(`[CloudSync] Pushed: ${result.pushed}, Pulled: ${result.pulled}, Errors: ${result.errors}`);
      await loadStatus();
    } catch (e) {
      if (__DEV__) console.error('[CloudSync] Sync failed:', e);
      setStatus(prev => ({
        ...prev,
        error: e instanceof Error ? e.message : 'Sync failed',
      }));
    } finally {
      syncInProgress.current = false;
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [auth.isAuthenticated, loadStatus]);

  // Enqueue log for sync - automatic when authenticated
  const enqueueLogForSync = useCallback(async (log: CapacityLog) => {
    if (!auth.isAuthenticated) return;

    const deviceId = await getDeviceId();
    const upsert = localToCloudUpsert(log, deviceId);
    await enqueueLog(log.id, upsert);

    // Update pending count
    setStatus(prev => ({
      ...prev,
      pendingCount: prev.pendingCount + 1,
    }));

    // Attempt sync in background
    syncNow();
  }, [auth.isAuthenticated, syncNow]);

  // Pull and merge cloud logs - automatic when authenticated
  const pullAndMerge = useCallback(async (localLogs: CapacityLog[]): Promise<CapacityLog[]> => {
    if (!auth.isAuthenticated) return localLogs;

    try {
      const cloudLogs = await pullFromCloud();
      if (cloudLogs.length === 0) return localLogs;

      return mergeCloudIntoLocal(localLogs, cloudLogs);
    } catch (e) {
      if (__DEV__) console.error('[CloudSync] Pull and merge failed:', e);
      return localLogs;
    }
  }, [auth.isAuthenticated]);

  // Auto-sync on interval - starts automatically when authenticated
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    // Trigger initial sync on auth
    syncNow();

    // Start interval for periodic sync
    syncIntervalRef.current = setInterval(() => {
      syncNow();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [auth.isAuthenticated, syncNow]);

  // Sync when network becomes available
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      if (state.isConnected && auth.isAuthenticated && status.pendingCount > 0) {
        await syncNow();
      }
    });

    return () => unsubscribe();
  }, [auth.isAuthenticated, syncNow, status.pendingCount]);

  return {
    status,
    isConfigured,
    enableSync,
    disableSync,
    syncNow,
    enqueueLogForSync,
    pullAndMerge,
  };
}
