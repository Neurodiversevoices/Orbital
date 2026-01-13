/**
 * Cloud Patterns v1 Types
 *
 * Types for cloud backup and cross-device sync.
 */

import { CapacityState, Tag } from '../../types';

// =============================================================================
// CLOUD LOG TYPES
// =============================================================================

/**
 * Cloud capacity log format (matches Supabase schema)
 */
export interface CloudCapacityLog {
  id: string;
  user_id: string;
  created_at: string;
  occurred_at: string;
  state: CapacityState;
  drivers: string[]; // Tags stored as JSON array
  note: string | null;
  source_device_id: string | null;
  client_log_id: string;
  deleted_at: string | null;
  synced_at: string;
}

/**
 * Log to be upserted to cloud
 */
export interface CloudLogUpsert {
  client_log_id: string;
  occurred_at: string;
  state: CapacityState;
  drivers: string[];
  note: string | null;
  source_device_id: string | null;
}

// =============================================================================
// OUTBOX QUEUE TYPES
// =============================================================================

export type OutboxEntryStatus = 'pending' | 'syncing' | 'failed';

/**
 * Entry in the local outbox queue for background sync
 */
export interface OutboxEntry {
  id: string;
  client_log_id: string;
  operation: 'upsert' | 'delete';
  payload: CloudLogUpsert;
  status: OutboxEntryStatus;
  attempts: number;
  last_attempt_at: string | null;
  created_at: string;
  error: string | null;
}

// =============================================================================
// SYNC STATUS TYPES
// =============================================================================

export interface CloudSyncStatus {
  isEnabled: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastPushAt: Date | null;
  lastPullAt: Date | null;
  pendingCount: number;
  failedCount: number;
  error: string | null;
}

export const DEFAULT_CLOUD_SYNC_STATUS: CloudSyncStatus = {
  isEnabled: false,
  isAuthenticated: false,
  isSyncing: false,
  lastPushAt: null,
  lastPullAt: null,
  pendingCount: 0,
  failedCount: 0,
  error: null,
};

// =============================================================================
// CLOUD SETTINGS
// =============================================================================

export interface CloudSettings {
  cloudBackupEnabled: boolean;
  lastPushAt: string | null;
  lastPullAt: string | null;
  deviceId: string;
}

export const DEFAULT_CLOUD_SETTINGS: CloudSettings = {
  cloudBackupEnabled: false,
  lastPushAt: null,
  lastPullAt: null,
  deviceId: '',
};

// =============================================================================
// MERGE CONFLICT RESOLUTION
// =============================================================================

/**
 * Merge strategy: trust occurred_at ordering.
 * If duplicate client_log_id, keep the one with later synced_at (server wins).
 */
export type ConflictResolution = 'server_wins' | 'local_wins' | 'occurred_at';

export const DEFAULT_CONFLICT_RESOLUTION: ConflictResolution = 'server_wins';
