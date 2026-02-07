/**
 * Cloud Patterns Sync Engine
 *
 * Handles push (local → cloud) and pull (cloud → local) operations.
 * Offline-first: local writes always succeed, cloud sync is best-effort.
 */

import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { getCurrentUserId, isAuthenticated } from '../supabase/auth';
import {
  CloudCapacityLog,
  CloudLogUpsert,
  CloudSyncStatus,
  DEFAULT_CLOUD_SYNC_STATUS,
} from './types';
import {
  loadOutbox,
  getPendingEntries,
  markSyncing,
  markSynced,
  markFailed,
  getPendingCount,
  getFailedCount,
} from './outbox';
import {
  loadCloudSettings,
  isCloudBackupEnabled,
  getDeviceId,
  updateLastPush,
  updateLastPull,
  getLastPullTime,
} from './settings';
import { CapacityLog, CapacityState } from '../../types';

// =============================================================================
// SYNC CONFIGURATION
// =============================================================================

const SYNC_CONFIG = {
  BATCH_SIZE: 50,
  PULL_LIMIT: 1000,
  RETRY_DELAY_MS: 1000,
};

// =============================================================================
// PUSH: LOCAL → CLOUD
// =============================================================================

/**
 * Push pending outbox entries to cloud.
 * Returns number of successfully synced entries.
 */
export async function pushToCloud(): Promise<{ synced: number; failed: number }> {
  if (!isSupabaseConfigured()) {
    return { synced: 0, failed: 0 };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { synced: 0, failed: 0 };
  }

  const enabled = await isCloudBackupEnabled();
  if (!enabled) {
    return { synced: 0, failed: 0 };
  }

  const pending = await getPendingEntries();
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const supabase = getSupabase();
  let synced = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < pending.length; i += SYNC_CONFIG.BATCH_SIZE) {
    const batch = pending.slice(i, i + SYNC_CONFIG.BATCH_SIZE);

    // Mark as syncing
    for (const entry of batch) {
      await markSyncing(entry.id);
    }

    // Prepare batch payload
    const logs = batch
      .filter(e => e.operation === 'upsert')
      .map(e => e.payload);

    if (logs.length > 0) {
      try {
        // Use batch upsert RPC
        const { data, error } = await (supabase as any).rpc('batch_upsert_capacity_logs', {
          p_logs: logs,
        });

        if (error) {
          if (__DEV__) console.error('[Sync] Push batch failed:', error);
          for (const entry of batch) {
            await markFailed(entry.id, error.message);
            failed++;
          }
        } else {
          // Mark as synced
          for (const entry of batch) {
            await markSynced(entry.id);
            synced++;
          }
        }
      } catch (e) {
        if (__DEV__) console.error('[Sync] Push exception:', e);
        for (const entry of batch) {
          await markFailed(entry.id, e instanceof Error ? e.message : 'Unknown error');
          failed++;
        }
      }
    }

    // Handle deletes
    const deletes = batch.filter(e => e.operation === 'delete');
    for (const entry of deletes) {
      try {
        const { error } = await supabase
          .from('capacity_logs')
          .update({ deleted_at: new Date().toISOString() })
          .eq('client_log_id', entry.client_log_id)
          .eq('user_id', userId);

        if (error) {
          await markFailed(entry.id, error.message);
          failed++;
        } else {
          await markSynced(entry.id);
          synced++;
        }
      } catch (e) {
        await markFailed(entry.id, e instanceof Error ? e.message : 'Unknown error');
        failed++;
      }
    }
  }

  if (synced > 0) {
    await updateLastPush();
  }

  return { synced, failed };
}

// =============================================================================
// PULL: CLOUD → LOCAL
// =============================================================================

/**
 * Pull logs from cloud.
 * Returns array of cloud logs for merging.
 */
export async function pullFromCloud(): Promise<CloudCapacityLog[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }

  const enabled = await isCloudBackupEnabled();
  if (!enabled) {
    return [];
  }

  const supabase = getSupabase();
  const lastPull = await getLastPullTime();

  try {
    const { data, error } = await (supabase as any).rpc('pull_capacity_logs', {
      p_since: lastPull?.toISOString() ?? null,
      p_limit: SYNC_CONFIG.PULL_LIMIT,
    });

    if (error) {
      if (__DEV__) console.error('[Sync] Pull failed:', error);
      return [];
    }

    await updateLastPull();
    return data || [];
  } catch (e) {
    if (__DEV__) console.error('[Sync] Pull exception:', e);
    return [];
  }
}

// =============================================================================
// MERGE: CLOUD + LOCAL
// =============================================================================

/**
 * Convert cloud log to local format.
 */
export function cloudToLocal(cloudLog: CloudCapacityLog): CapacityLog {
  return {
    id: cloudLog.client_log_id,
    state: cloudLog.state as CapacityState,
    timestamp: new Date(cloudLog.occurred_at).getTime(),
    tags: (cloudLog.drivers || []) as any,
    note: cloudLog.note || undefined,
    localDate: cloudLog.occurred_at.split('T')[0],
  };
}

/**
 * Convert local log to cloud upsert format.
 */
export function localToCloudUpsert(
  localLog: CapacityLog,
  deviceId: string
): CloudLogUpsert {
  return {
    client_log_id: localLog.id,
    occurred_at: new Date(localLog.timestamp).toISOString(),
    state: localLog.state,
    drivers: localLog.tags || [],
    note: localLog.note || null,
    source_device_id: deviceId,
  };
}

/**
 * Merge cloud logs into local logs.
 * Conflict resolution: if duplicate client_log_id, trust server version.
 */
export function mergeCloudIntoLocal(
  localLogs: CapacityLog[],
  cloudLogs: CloudCapacityLog[]
): CapacityLog[] {
  const mergedMap = new Map<string, CapacityLog>();

  // Add local logs first
  for (const log of localLogs) {
    mergedMap.set(log.id, log);
  }

  // Overlay cloud logs (server wins on conflict)
  for (const cloudLog of cloudLogs) {
    // Skip deleted logs
    if (cloudLog.deleted_at) {
      mergedMap.delete(cloudLog.client_log_id);
      continue;
    }

    const converted = cloudToLocal(cloudLog);
    mergedMap.set(converted.id, converted);
  }

  // Sort by timestamp descending
  return Array.from(mergedMap.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  );
}

// =============================================================================
// FULL SYNC
// =============================================================================

/**
 * Perform a full sync cycle: push then pull.
 */
export async function fullSync(): Promise<{
  pushed: number;
  pulled: number;
  errors: number;
}> {
  // Push first to ensure local changes are saved
  const pushResult = await pushToCloud();

  // Then pull to get any changes from other devices
  const cloudLogs = await pullFromCloud();

  return {
    pushed: pushResult.synced,
    pulled: cloudLogs.length,
    errors: pushResult.failed,
  };
}

// =============================================================================
// SYNC STATUS
// =============================================================================

/**
 * Get current sync status.
 */
export async function getSyncStatus(): Promise<CloudSyncStatus> {
  const isAuth = await isAuthenticated();
  const enabled = await isCloudBackupEnabled();
  const settings = await loadCloudSettings();
  const pendingCount = await getPendingCount();
  const failedCount = await getFailedCount();

  return {
    isEnabled: enabled,
    isAuthenticated: isAuth,
    isSyncing: false, // Set by caller
    lastPushAt: settings.lastPushAt ? new Date(settings.lastPushAt) : null,
    lastPullAt: settings.lastPullAt ? new Date(settings.lastPullAt) : null,
    pendingCount,
    failedCount,
    error: null,
  };
}
