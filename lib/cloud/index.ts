/**
 * Cloud Patterns v1 Module
 *
 * Cloud backup and cross-device sync for capacity logs.
 *
 * GUARANTEES:
 * - Offline-first: local writes always succeed
 * - Cloud sync is best-effort background operation
 * - User-owned data only: RLS ensures auth.uid() = user_id
 * - No admin override
 *
 * Usage:
 *   import { useCloudSync } from '@/lib/cloud';
 *
 *   const { status, enableSync, disableSync, enqueueLogForSync } = useCloudSync();
 */

// Types
export * from './types';

// Settings
export {
  loadCloudSettings,
  saveCloudSettings,
  enableCloudBackup,
  disableCloudBackup,
  isCloudBackupEnabled,
  getDeviceId,
} from './settings';

// Outbox
export {
  enqueueLog,
  enqueueDelete,
  getPendingEntries,
  getPendingCount,
  getFailedCount,
  clearOutbox,
  retryFailedEntries,
} from './outbox';

// Sync Engine
export {
  pushToCloud,
  pullFromCloud,
  fullSync,
  getSyncStatus,
  cloudToLocal,
  localToCloudUpsert,
  mergeCloudIntoLocal,
} from './syncEngine';

// Hook
export { useCloudSync } from './useCloudSync';
export type { UseCloudSyncReturn } from './useCloudSync';
