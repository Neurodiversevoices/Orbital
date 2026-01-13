/**
 * Cloud Patterns Outbox Queue
 *
 * Local queue for logs pending sync to cloud.
 * Enables offline-first: local writes always succeed.
 *
 * DEMO DATA PROTECTION: Demo logs (id starts with 'demo-') are BLOCKED
 * from entering the outbox and will NEVER be synced to cloud.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OutboxEntry, OutboxEntryStatus, CloudLogUpsert } from './types';
import { isDemoLogId } from '../hooks/useDemoMode';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const OUTBOX_KEY = '@orbital:cloud_outbox';
const MAX_ATTEMPTS = 5;

// =============================================================================
// OUTBOX OPERATIONS
// =============================================================================

/**
 * Load outbox from storage.
 */
export async function loadOutbox(): Promise<OutboxEntry[]> {
  try {
    const json = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch (error) {
    if (__DEV__) console.error('[Outbox] Failed to load:', error);
    return [];
  }
}

/**
 * Save outbox to storage.
 */
async function saveOutbox(entries: OutboxEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch (error) {
    if (__DEV__) console.error('[Outbox] Failed to save:', error);
    throw error;
  }
}

/**
 * Generate unique outbox entry ID.
 */
function generateOutboxId(): string {
  return `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Enqueue a log for sync.
 * BLOCKS demo logs — they cannot enter the outbox or be synced to cloud.
 */
export async function enqueueLog(
  clientLogId: string,
  payload: CloudLogUpsert
): Promise<string> {
  // ==========================================================================
  // DEMO DATA CLOUD PROTECTION
  // Demo logs (id starts with 'demo-') are BLOCKED from cloud sync.
  // This is the ENGINE-LEVEL guard — no demo data can ever reach Supabase.
  // ==========================================================================
  if (isDemoLogId(clientLogId)) {
    if (__DEV__) {
      console.warn('[Outbox] BLOCKED: Demo log cannot be synced to cloud:', clientLogId);
    }
    return ''; // Return empty string, log is NOT enqueued
  }

  const entries = await loadOutbox();

  // Check if already enqueued
  const existing = entries.find(e => e.client_log_id === clientLogId);
  if (existing) {
    // Update existing entry
    existing.payload = payload;
    existing.status = 'pending';
    existing.error = null;
    await saveOutbox(entries);
    return existing.id;
  }

  // Create new entry
  const entry: OutboxEntry = {
    id: generateOutboxId(),
    client_log_id: clientLogId,
    operation: 'upsert',
    payload,
    status: 'pending',
    attempts: 0,
    last_attempt_at: null,
    created_at: new Date().toISOString(),
    error: null,
  };

  entries.push(entry);
  await saveOutbox(entries);
  return entry.id;
}

/**
 * Enqueue a delete operation.
 * BLOCKS demo logs — they never went to cloud, so no delete needed.
 */
export async function enqueueDelete(clientLogId: string): Promise<string> {
  // Demo logs were never synced, so no delete operation needed
  if (isDemoLogId(clientLogId)) {
    if (__DEV__) {
      console.warn('[Outbox] BLOCKED: Demo log delete (never synced):', clientLogId);
    }
    return '';
  }

  const entries = await loadOutbox();

  // Remove any pending upsert for this log
  const filtered = entries.filter(e => e.client_log_id !== clientLogId);

  // Add delete entry
  const entry: OutboxEntry = {
    id: generateOutboxId(),
    client_log_id: clientLogId,
    operation: 'delete',
    payload: {} as CloudLogUpsert,
    status: 'pending',
    attempts: 0,
    last_attempt_at: null,
    created_at: new Date().toISOString(),
    error: null,
  };

  filtered.push(entry);
  await saveOutbox(filtered);
  return entry.id;
}

/**
 * Get pending entries for sync.
 */
export async function getPendingEntries(): Promise<OutboxEntry[]> {
  const entries = await loadOutbox();
  return entries.filter(e =>
    e.status === 'pending' ||
    (e.status === 'failed' && e.attempts < MAX_ATTEMPTS)
  );
}

/**
 * Get count of pending entries.
 */
export async function getPendingCount(): Promise<number> {
  const pending = await getPendingEntries();
  return pending.length;
}

/**
 * Get count of failed entries (exceeded max attempts).
 */
export async function getFailedCount(): Promise<number> {
  const entries = await loadOutbox();
  return entries.filter(e => e.status === 'failed' && e.attempts >= MAX_ATTEMPTS).length;
}

/**
 * Mark entry as syncing.
 */
export async function markSyncing(entryId: string): Promise<void> {
  const entries = await loadOutbox();
  const entry = entries.find(e => e.id === entryId);
  if (entry) {
    entry.status = 'syncing';
    entry.last_attempt_at = new Date().toISOString();
    entry.attempts += 1;
    await saveOutbox(entries);
  }
}

/**
 * Mark entry as synced (remove from outbox).
 */
export async function markSynced(entryId: string): Promise<void> {
  const entries = await loadOutbox();
  const filtered = entries.filter(e => e.id !== entryId);
  await saveOutbox(filtered);
}

/**
 * Mark entry as synced by client_log_id.
 */
export async function markSyncedByClientId(clientLogId: string): Promise<void> {
  const entries = await loadOutbox();
  const filtered = entries.filter(e => e.client_log_id !== clientLogId);
  await saveOutbox(filtered);
}

/**
 * Mark entry as failed.
 */
export async function markFailed(entryId: string, error: string): Promise<void> {
  const entries = await loadOutbox();
  const entry = entries.find(e => e.id === entryId);
  if (entry) {
    entry.status = 'failed';
    entry.error = error;
    await saveOutbox(entries);
  }
}

/**
 * Clear all entries from outbox.
 */
export async function clearOutbox(): Promise<void> {
  await AsyncStorage.removeItem(OUTBOX_KEY);
}

/**
 * Retry all failed entries (reset their status to pending).
 */
export async function retryFailedEntries(): Promise<number> {
  const entries = await loadOutbox();
  let count = 0;

  for (const entry of entries) {
    if (entry.status === 'failed' && entry.attempts < MAX_ATTEMPTS) {
      entry.status = 'pending';
      entry.error = null;
      count++;
    }
  }

  await saveOutbox(entries);
  return count;
}
