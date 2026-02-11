/**
 * Pattern History Retention Service
 *
 * CRITICAL: This module implements permanent retention of pattern history.
 * Pattern history is NEVER hard-deleted. User "delete" actions result in
 * soft-delete and de-identification, but records are retained permanently.
 *
 * Purpose of retention:
 * - Product improvement and analytics
 * - Safety and fraud prevention
 * - Pattern quality and model training
 * - Research (with consent)
 *
 * TODO: COMPLIANCE NOTE - Some jurisdictions (e.g., GDPR Article 17, CCPA)
 * may require actual deletion in limited cases. De-identification is our
 * default approach which should satisfy most requirements. Legal review
 * recommended before EU/UK expansion.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { STORAGE_KEYS, generateId } from './storage';
import {
  CapacityLog,
  PatternHistoryRecord,
  PatternHistoryQuery,
  PatternHistoryWriteRequest,
  PatternMode,
  DeletionState,
  DeidentificationResult,
  createPatternHistoryRecord,
  deidentifyPatternRecord,
} from '../types';

// Storage key for pattern history
const PATTERN_HISTORY_KEY = '@orbital:pattern_history';

// Session ID for current app session
let currentSessionId: string | null = null;

// Default user ID (in production, this would come from auth)
const DEFAULT_USER_ID = 'local_user';

/**
 * Get or create session ID for current app session
 */
export function getSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = `session_${generateId()}`;
  }
  return currentSessionId;
}

/**
 * Reset session ID (call on app restart)
 */
export function resetSessionId(): void {
  currentSessionId = null;
}

/**
 * Get all pattern history records (internal use only)
 * WARNING: This returns ALL records including de-identified ones
 */
async function getAllPatternHistory(): Promise<PatternHistoryRecord[]> {
  const data = await AsyncStorage.getItem(PATTERN_HISTORY_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

/**
 * Save pattern history records
 */
async function savePatternHistory(records: PatternHistoryRecord[]): Promise<void> {
  await AsyncStorage.setItem(PATTERN_HISTORY_KEY, JSON.stringify(records));
}

/**
 * Write a new pattern history record
 * Called automatically when a capacity log is saved
 */
export async function writePatternHistory(
  capacityLog: CapacityLog,
  mode: PatternMode = 'personal',
  userId: string = DEFAULT_USER_ID
): Promise<PatternHistoryRecord> {
  const request: PatternHistoryWriteRequest = {
    capacityLog,
    mode,
    sessionId: getSessionId(),
    userId,
  };

  const record = createPatternHistoryRecord(request);

  const existing = await getAllPatternHistory();
  existing.push(record);
  await savePatternHistory(existing);

  if (__DEV__) console.log('[PatternHistory] Record created:', record.id);
  return record;
}

/**
 * Query pattern history for a user (excludes deleted/de-identified by default)
 */
export async function queryPatternHistory(
  query: PatternHistoryQuery = {}
): Promise<PatternHistoryRecord[]> {
  const all = await getAllPatternHistory();

  return all.filter(record => {
    // Filter by user
    if (query.userId && record.userId !== query.userId) {
      return false;
    }

    // Filter by session
    if (query.sessionId && record.sessionId !== query.sessionId) {
      return false;
    }

    // Filter by mode
    if (query.mode && record.mode !== query.mode) {
      return false;
    }

    // Filter by date range
    if (query.dateRange) {
      if (record.timestamp < query.dateRange.start || record.timestamp > query.dateRange.end) {
        return false;
      }
    }

    // Filter by deletion state
    if (query.deletionState) {
      if (record.deletionState !== query.deletionState) {
        return false;
      }
    } else if (!query.includeDeidentified) {
      // By default, exclude deleted/de-identified records
      if (record.deletionState !== 'active') {
        return false;
      }
    }

    return true;
  })
  .sort((a, b) => b.timestamp - a.timestamp) // Newest first
  .slice(query.offset || 0, (query.offset || 0) + (query.limit || 1000));
}

/**
 * Get pattern history visible to a specific user
 * This is what the UI should use - excludes soft-deleted records
 */
export async function getUserVisiblePatternHistory(
  userId: string = DEFAULT_USER_ID
): Promise<PatternHistoryRecord[]> {
  return queryPatternHistory({
    userId,
    deletionState: 'active',
  });
}

/**
 * Soft-delete a pattern history record
 * IMPORTANT: This does NOT hard-delete - it de-identifies and retains
 */
export async function softDeletePatternRecord(
  recordId: string,
  reason: 'user_deleted' | 'account_deleted' = 'user_deleted'
): Promise<boolean> {
  const all = await getAllPatternHistory();
  const index = all.findIndex(r => r.id === recordId);

  if (index === -1) {
    if (__DEV__) console.warn('[PatternHistory] Record not found for soft-delete:', recordId);
    return false;
  }

  // De-identify the record
  all[index] = deidentifyPatternRecord(all[index], reason);
  await savePatternHistory(all);

  if (__DEV__) console.log('[PatternHistory] Record soft-deleted:', recordId, 'reason:', reason);
  return true;
}

/**
 * Soft-delete all pattern history for a user
 * Called when user deletes their history or account
 */
export async function softDeleteUserPatternHistory(
  userId: string,
  reason: 'user_deleted' | 'account_deleted' = 'user_deleted'
): Promise<DeidentificationResult> {
  const all = await getAllPatternHistory();
  const result: DeidentificationResult = {
    recordsProcessed: 0,
    recordsDeidentified: 0,
    errors: [],
    completedAt: 0,
  };

  const updated = all.map(record => {
    if (record.userId === userId && record.deletionState === 'active') {
      result.recordsProcessed++;
      try {
        result.recordsDeidentified++;
        return deidentifyPatternRecord(record, reason);
      } catch (error) {
        result.errors.push(`Failed to de-identify ${record.id}: ${error}`);
        return record;
      }
    }
    return record;
  });

  await savePatternHistory(updated);
  result.completedAt = Date.now();

  if (__DEV__) console.log('[PatternHistory] User history soft-deleted:', userId, result);
  return result;
}

/**
 * Get pattern history statistics (for analytics)
 * Works with de-identified data
 */
export async function getPatternHistoryStats(): Promise<{
  totalRecords: number;
  activeRecords: number;
  deidentifiedRecords: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
  recordsByMode: Record<PatternMode, number>;
}> {
  const all = await getAllPatternHistory();

  const stats = {
    totalRecords: all.length,
    activeRecords: 0,
    deidentifiedRecords: 0,
    oldestTimestamp: null as number | null,
    newestTimestamp: null as number | null,
    recordsByMode: {} as Record<PatternMode, number>,
  };

  all.forEach(record => {
    if (record.deletionState === 'active') {
      stats.activeRecords++;
    } else {
      stats.deidentifiedRecords++;
    }

    if (stats.oldestTimestamp === null || record.timestamp < stats.oldestTimestamp) {
      stats.oldestTimestamp = record.timestamp;
    }
    if (stats.newestTimestamp === null || record.timestamp > stats.newestTimestamp) {
      stats.newestTimestamp = record.timestamp;
    }

    stats.recordsByMode[record.mode] = (stats.recordsByMode[record.mode] || 0) + 1;
  });

  return stats;
}

/**
 * Verify pattern history retention (for testing)
 * Returns true if record still exists (in any state)
 */
export async function verifyRecordRetained(recordId: string): Promise<boolean> {
  const all = await getAllPatternHistory();
  return all.some(r => r.id === recordId);
}

/**
 * Verify de-identification was applied (for testing)
 */
export async function verifyRecordDeidentified(recordId: string): Promise<boolean> {
  const all = await getAllPatternHistory();
  const record = all.find(r => r.id === recordId);
  return record ? record.userId === null && record.deidentifiedAt !== null : false;
}

/**
 * Export pattern history for data portability
 * Only exports user's own active records
 */
export async function exportUserPatternHistory(
  userId: string = DEFAULT_USER_ID
): Promise<PatternHistoryRecord[]> {
  return queryPatternHistory({
    userId,
    deletionState: 'active',
  });
}

// ============================================
// Integration with existing storage
// ============================================

/**
 * Hook into capacity log saves to write pattern history
 * This should be called from the saveLog function in storage.ts
 */
export async function onCapacityLogSaved(
  log: CapacityLog,
  mode: PatternMode = 'personal'
): Promise<void> {
  try {
    await writePatternHistory(log, mode);
  } catch (error) {
    Sentry.captureException(error, { tags: { module: 'patternHistory', op: 'write' } });
    if (__DEV__) console.error('[PatternHistory] Failed to write pattern history:', error);
  }
}

/**
 * Hook into capacity log deletes to soft-delete pattern history
 * This should be called from the deleteLog function in storage.ts
 */
export async function onCapacityLogDeleted(logId: string): Promise<void> {
  try {
    const patternHistoryId = `ph_${logId}`;
    await softDeletePatternRecord(patternHistoryId, 'user_deleted');
  } catch (error) {
    Sentry.captureException(error, { tags: { module: 'patternHistory', op: 'soft_delete' } });
    if (__DEV__) console.error('[PatternHistory] Failed to soft-delete pattern history:', error);
  }
}

/**
 * Hook into clear all data to soft-delete all pattern history
 * This should be called from clearAllLogs in storage.ts
 */
export async function onAllLogsCleared(userId: string = DEFAULT_USER_ID): Promise<void> {
  try {
    await softDeleteUserPatternHistory(userId, 'user_deleted');
  } catch (error) {
    Sentry.captureException(error, { tags: { module: 'patternHistory', op: 'clear_all' } });
    if (__DEV__) console.error('[PatternHistory] Failed to soft-delete all pattern history:', error);
  }
}

/**
 * Hook into account deletion
 */
export async function onAccountDeleted(userId: string): Promise<DeidentificationResult> {
  return softDeleteUserPatternHistory(userId, 'account_deleted');
}
