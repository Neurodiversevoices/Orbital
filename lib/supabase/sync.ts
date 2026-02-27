/**
 * Orbital Capacity Log Sync Engine
 *
 * Offline-first sync with:
 * - Local-first writes (immediate UI response)
 * - Background cloud sync when online
 * - Conflict resolution (last-write-wins with local_id dedup)
 * - Automatic retry with exponential backoff
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getSupabase, isSupabaseConfigured } from './client';
import { getCurrentUserId } from './auth';
import { CapacityLog, CapacityLogInsert, CapacityState, LocalCapacityLog, SyncStatus } from './types';

/** Row shape returned by the capacity_logs upsert .select('id, local_id') */
interface CapacityLogUpsertRow {
  id: string;
  local_id: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEYS = {
  LOCAL_LOGS: 'orbital_local_capacity_logs',
  SYNC_QUEUE: 'orbital_sync_queue',
  LAST_SYNC: 'orbital_last_sync',
};

const SYNC_CONFIG = {
  BATCH_SIZE: 50,
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 3,
  SYNC_INTERVAL_MS: 30000, // 30 seconds
};

// =============================================================================
// LOCAL STORAGE
// =============================================================================

/**
 * Load local capacity logs from AsyncStorage.
 */
async function loadLocalLogs(): Promise<LocalCapacityLog[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_LOGS);
    if (!json) return [];
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/**
 * Save local capacity logs to AsyncStorage.
 */
async function saveLocalLogs(logs: LocalCapacityLog[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_LOGS, JSON.stringify(logs));
}

/**
 * Get the last sync timestamp.
 */
async function getLastSyncTime(): Promise<Date | null> {
  try {
    const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return timestamp ? new Date(timestamp) : null;
  } catch {
    return null;
  }
}

/**
 * Set the last sync timestamp.
 */
async function setLastSyncTime(date: Date): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, date.toISOString());
}

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Push local unsynced logs to the cloud.
 */
async function pushToCloud(logs: LocalCapacityLog[]): Promise<{ synced: string[]; failed: string[] }> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { synced: [], failed: logs.map(l => l.localId) };
  }

  const supabase = getSupabase();
  const synced: string[] = [];
  const failed: string[] = [];

  // Process in batches
  for (let i = 0; i < logs.length; i += SYNC_CONFIG.BATCH_SIZE) {
    const batch = logs.slice(i, i + SYNC_CONFIG.BATCH_SIZE);

    const inserts: CapacityLogInsert[] = batch.map(log => ({
      user_id: userId,
      occurred_at: log.occurredAt.toISOString(),
      state: log.state,
      tags: log.tags,
      note: log.note,
      is_demo: log.isDemo,
      local_id: log.localId,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types omit chained .select() overloads; shape typed via CapacityLogUpsertRow
    const { data, error } = await (supabase as any)
      .from('capacity_logs')
      .upsert(inserts, {
        onConflict: 'user_id,local_id',
        ignoreDuplicates: false,
      })
      .select('id, local_id') as { data: CapacityLogUpsertRow[] | null; error: { message: string } | null };

    if (error) {
      if (__DEV__) console.error('[Sync] Push failed:', error);
      failed.push(...batch.map(l => l.localId));
    } else if (data) {
      synced.push(...data.map((d: CapacityLogUpsertRow) => d.local_id).filter((id): id is string => id !== null));
    }
  }

  return { synced, failed };
}

/**
 * Pull logs from cloud that are newer than local.
 */
async function pullFromCloud(since: Date | null): Promise<CapacityLog[]> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabase();

  let query = supabase
    .from('capacity_logs')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false });

  if (since) {
    query = query.gt('synced_at', since.toISOString());
  }

  const { data, error } = await query.limit(500);

  if (error) {
    if (__DEV__) console.error('[Sync] Pull failed:', error);
    return [];
  }

  return data || [];
}

/**
 * Merge cloud logs into local storage.
 */
function mergeCloudLogs(
  localLogs: LocalCapacityLog[],
  cloudLogs: CapacityLog[]
): LocalCapacityLog[] {
  const localById = new Map(localLogs.map(l => [l.localId, l]));

  // Add/update from cloud
  for (const cloudLog of cloudLogs) {
    const localId = cloudLog.local_id || cloudLog.id;
    const existing = localById.get(localId);

    if (!existing || new Date(cloudLog.synced_at) > (existing.syncedAt || new Date(0))) {
      localById.set(localId, {
        localId,
        occurredAt: new Date(cloudLog.occurred_at),
        state: cloudLog.state as CapacityState,
        tags: cloudLog.tags || [],
        note: cloudLog.note,
        isDemo: cloudLog.is_demo,
        syncedAt: new Date(cloudLog.synced_at),
        cloudId: cloudLog.id,
      });
    }
  }

  return Array.from(localById.values()).sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
  );
}

// =============================================================================
// HOOK: useCapacitySync
// =============================================================================

export interface CapacitySyncContext {
  // State
  logs: LocalCapacityLog[];
  syncStatus: SyncStatus;

  // Actions
  addLog: (log: Omit<LocalCapacityLog, 'localId' | 'syncedAt' | 'cloudId'>) => Promise<void>;
  updateLog: (localId: string, updates: Partial<LocalCapacityLog>) => Promise<void>;
  deleteLog: (localId: string) => Promise<void>;
  syncNow: () => Promise<void>;
  clearAllLogs: () => Promise<void>;
}

export function useCapacitySync(): CapacitySyncContext {
  const [logs, setLogs] = useState<LocalCapacityLog[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    pendingCount: 0,
    isSyncing: false,
    error: null,
  });

  const syncInProgress = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load local logs on mount
  useEffect(() => {
    loadLocalLogs().then(loaded => {
      setLogs(loaded);
      const pending = loaded.filter(l => !l.syncedAt).length;
      getLastSyncTime().then(lastSync => {
        setSyncStatus(prev => ({
          ...prev,
          lastSyncAt: lastSync,
          pendingCount: pending,
        }));
      });
    });
  }, []);

  // Sync function
  const syncNow = useCallback(async () => {
    if (syncInProgress.current || !isSupabaseConfigured()) return;

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setSyncStatus(prev => ({ ...prev, error: 'No network connection' }));
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      // Not authenticated - skip sync
      return;
    }

    syncInProgress.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Load current local logs
      const localLogs = await loadLocalLogs();
      const unsyncedLogs = localLogs.filter(l => !l.syncedAt);

      // Push unsynced to cloud
      if (unsyncedLogs.length > 0) {
        const { synced } = await pushToCloud(unsyncedLogs);

        // Mark synced logs
        const now = new Date();
        const updatedLogs = localLogs.map(log => {
          if (synced.includes(log.localId)) {
            return { ...log, syncedAt: now };
          }
          return log;
        });

        await saveLocalLogs(updatedLogs);
        setLogs(updatedLogs);
      }

      // Pull from cloud
      const lastSync = await getLastSyncTime();
      const cloudLogs = await pullFromCloud(lastSync);

      if (cloudLogs.length > 0) {
        const currentLogs = await loadLocalLogs();
        const mergedLogs = mergeCloudLogs(currentLogs, cloudLogs);
        await saveLocalLogs(mergedLogs);
        setLogs(mergedLogs);
      }

      // Update sync time
      const syncTime = new Date();
      await setLastSyncTime(syncTime);

      const pendingCount = (await loadLocalLogs()).filter(l => !l.syncedAt).length;
      setSyncStatus({
        lastSyncAt: syncTime,
        pendingCount,
        isSyncing: false,
        error: null,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: message,
      }));
    } finally {
      syncInProgress.current = false;
    }
  }, []);

  // Auto-sync on interval
  useEffect(() => {
    const scheduleSync = () => {
      syncTimeoutRef.current = setTimeout(() => {
        syncNow().then(scheduleSync);
      }, SYNC_CONFIG.SYNC_INTERVAL_MS);
    };

    // Initial sync
    syncNow().then(scheduleSync);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [syncNow]);

  // Sync when network becomes available
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && syncStatus.pendingCount > 0) {
        syncNow();
      }
    });

    return () => unsubscribe();
  }, [syncNow, syncStatus.pendingCount]);

  // Add a new log
  const addLog = useCallback(async (
    log: Omit<LocalCapacityLog, 'localId' | 'syncedAt' | 'cloudId'>
  ) => {
    const newLog: LocalCapacityLog = {
      ...log,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncedAt: null,
      cloudId: null,
    };

    const currentLogs = await loadLocalLogs();
    const updatedLogs = [newLog, ...currentLogs];
    await saveLocalLogs(updatedLogs);
    setLogs(updatedLogs);

    setSyncStatus(prev => ({
      ...prev,
      pendingCount: prev.pendingCount + 1,
    }));

    // Trigger sync
    syncNow();
  }, [syncNow]);

  // Update an existing log
  const updateLog = useCallback(async (
    localId: string,
    updates: Partial<LocalCapacityLog>
  ) => {
    const currentLogs = await loadLocalLogs();
    const updatedLogs = currentLogs.map(log => {
      if (log.localId === localId) {
        return {
          ...log,
          ...updates,
          syncedAt: null, // Mark as needing sync
        };
      }
      return log;
    });

    await saveLocalLogs(updatedLogs);
    setLogs(updatedLogs);

    const pending = updatedLogs.filter(l => !l.syncedAt).length;
    setSyncStatus(prev => ({ ...prev, pendingCount: pending }));

    // Trigger sync
    syncNow();
  }, [syncNow]);

  // Delete a log (soft delete, synced to cloud)
  const deleteLog = useCallback(async (localId: string) => {
    const currentLogs = await loadLocalLogs();
    const logToDelete = currentLogs.find(l => l.localId === localId);

    // Remove from local
    const updatedLogs = currentLogs.filter(l => l.localId !== localId);
    await saveLocalLogs(updatedLogs);
    setLogs(updatedLogs);

    // If synced, delete from cloud
    if (logToDelete?.cloudId && isSupabaseConfigured()) {
      const userId = await getCurrentUserId();
      if (userId) {
        const supabase = getSupabase();
        await (supabase as any)
          .from('capacity_logs')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', logToDelete.cloudId)
          .eq('user_id', userId);
      }
    }

    const pending = updatedLogs.filter(l => !l.syncedAt).length;
    setSyncStatus(prev => ({ ...prev, pendingCount: pending }));
  }, []);

  // Clear all logs (for testing/reset)
  const clearAllLogs = useCallback(async () => {
    await saveLocalLogs([]);
    setLogs([]);

    setSyncStatus(prev => ({
      ...prev,
      pendingCount: 0,
    }));
  }, []);

  return {
    logs,
    syncStatus,
    addLog,
    updateLog,
    deleteLog,
    syncNow,
    clearAllLogs,
  };
}

// =============================================================================
// DATA EXPORT & DELETE (GDPR)
// =============================================================================

/**
 * Export all user data from cloud.
 */
export async function exportUserData(): Promise<Record<string, unknown> | null> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('export_user_data', {
    p_user_id: userId,
  });

  if (error) {
    if (__DEV__) console.error('[Export] Failed:', error);
    return null;
  }

  return data as Record<string, unknown>;
}

/**
 * Delete all user data from cloud.
 */
export async function deleteUserData(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabase();
  const { error } = await supabase.rpc('delete_user_data', {
    p_user_id: userId,
  });

  if (error) {
    if (__DEV__) console.error('[Delete] Failed:', error);
    return false;
  }

  // Clear local data too
  await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_LOGS);
  await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
  await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC);

  return true;
}
