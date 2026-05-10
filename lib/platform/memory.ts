/**
 * Orbital Platform — Memory primitives (4-layer dashboard)
 *
 * Implements the user-facing memory model:
 *   - ephemeral: this session only
 *   - workspace: scoped to current org/circle
 *   - profile:   persistent, user-owned, exportable
 *   - implicit:  inferred preferences/patterns (fully editable)
 *
 * Wired against:
 *   - platform_memory_records (Supabase, created in migration 00017)
 *   - lib/supabase/client.ts  (singleton client + auth)
 *   - AsyncStorage             ("orbital.platform.temporaryChat")
 *
 * Every mutation pairs with a recordAuditEvent call so the action surfaces
 * on the platform audit screen.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { useOptionalSubBrand } from './SubBrandProvider';
import { recordAuditEvent } from './trustCore';
import type { MemoryRecord, MemoryScope } from './types';

const TEMP_CHAT_KEY = 'orbital.platform.temporaryChat';

// =============================================================================
// HELPERS
// =============================================================================

interface MemoryRow {
  id: string;
  user_id: string;
  scope: MemoryScope;
  content: string;
  source: string | null;
  user_editable: boolean;
  created_at: string;
}

function rowToRecord(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    scope: row.scope,
    content: row.content,
    createdAt: row.created_at,
    source: row.source ?? 'unknown',
    userEditable: row.user_editable,
  };
}

// =============================================================================
// READS
// =============================================================================

export interface UseMemoryResult {
  records: MemoryRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook: read all memory records for a given scope.
 *
 * Returns a structured object so callers can render loading / empty states.
 * Subscribes to the user's records on mount and re-fetches when the scope
 * argument changes.
 */
export function useMemory(scope: MemoryScope): UseMemoryResult {
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Posture gate: if the active sub-brand has memoryDefault === 'off' (the
  // case for all 6 brands today) and the caller is reading the implicit
  // scope, short-circuit to an empty list. We respect the brand's stance
  // on implicit pattern recall — UI toggles aren't enough.
  const subBrandCtx = useOptionalSubBrand();
  const memoryDefault = subBrandCtx?.posture.memoryDefault ?? 'off';
  const isImplicitOff = scope === 'implicit' && memoryDefault === 'off';

  const refresh = useCallback(async (): Promise<void> => {
    if (isImplicitOff) {
      setRecords([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!isSupabaseConfigured()) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRecords([]);
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase
        .from('platform_memory_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('scope', scope)
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setRecords([]);
      } else {
        setRecords((data ?? []).map((row: MemoryRow) => rowToRecord(row)));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      setError(msg);
      setRecords([]);
      if (__DEV__) console.warn('[memory] useMemory refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, [scope, isImplicitOff]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { records, loading, error, refresh };
}

// =============================================================================
// WRITES
// =============================================================================

/**
 * Edit the content of a single memory record.
 * Pairs with a `memory.edit` audit event on success.
 */
export async function editMemory(id: string, content: string): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('platform_memory_records')
      .update({ content })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      if (__DEV__) console.warn('[memory] editMemory failed', error.message);
      return;
    }
    await recordAuditEvent({
      action: 'memory.edit',
      target: id,
      metadata: { length: content.length },
    });
  } catch (err) {
    if (__DEV__) console.warn('[memory] editMemory failed', err);
  }
}

/**
 * Delete a single memory record.
 * Pairs with a `memory.delete` audit event on success.
 */
export async function deleteMemory(id: string): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('platform_memory_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      if (__DEV__) console.warn('[memory] deleteMemory failed', error.message);
      return;
    }
    await recordAuditEvent({ action: 'memory.delete', target: id });
  } catch (err) {
    if (__DEV__) console.warn('[memory] deleteMemory failed', err);
  }
}

/**
 * Clear ALL records in a given scope. Used by the "Clear scope" button
 * on the Memory Dashboard. Pairs with a `memory.clear` audit event.
 */
export async function clearScope(scope: MemoryScope): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('platform_memory_records')
      .delete()
      .eq('user_id', user.id)
      .eq('scope', scope);

    if (error) {
      if (__DEV__) console.warn('[memory] clearScope failed', error.message);
      return;
    }
    await recordAuditEvent({
      action: 'memory.clear',
      target: `scope:${scope}`,
      metadata: { scope },
    });
  } catch (err) {
    if (__DEV__) console.warn('[memory] clearScope failed', err);
  }
}

// =============================================================================
// TEMPORARY CHAT FLAG (AsyncStorage)
// =============================================================================

/**
 * In-memory mirror of the persisted flag so synchronous reads stay cheap.
 * Hydrated on first access via `getTemporaryChat()`.
 */
let TEMPORARY_CHAT_ENABLED = false;
let TEMPORARY_CHAT_HYDRATED = false;

async function hydrateTemporaryChat(): Promise<void> {
  if (TEMPORARY_CHAT_HYDRATED) return;
  try {
    const stored = await AsyncStorage.getItem(TEMP_CHAT_KEY);
    TEMPORARY_CHAT_ENABLED = stored === 'true';
  } catch (err) {
    if (__DEV__) console.warn('[memory] hydrateTemporaryChat failed', err);
  } finally {
    TEMPORARY_CHAT_HYDRATED = true;
  }
}

/**
 * Toggle the global "Temporary chat" mode. When enabled, all conversations
 * are forced into the ephemeral scope regardless of user preference.
 *
 * Persists to AsyncStorage and pairs with a `memory.temporary_chat` audit.
 */
export async function setTemporaryChat(enabled: boolean): Promise<void> {
  try {
    TEMPORARY_CHAT_ENABLED = enabled;
    TEMPORARY_CHAT_HYDRATED = true;
    await AsyncStorage.setItem(TEMP_CHAT_KEY, enabled ? 'true' : 'false');
    await recordAuditEvent({
      action: 'memory.temporary_chat',
      target: enabled ? 'on' : 'off',
    });
  } catch (err) {
    if (__DEV__) console.warn('[memory] setTemporaryChat failed', err);
  }
}

/**
 * Read the current Temporary chat flag (synchronous mirror).
 * Triggers a hydration on first call so the value is correct after a
 * cold launch.
 */
export function getTemporaryChat(): boolean {
  if (!TEMPORARY_CHAT_HYDRATED) {
    void hydrateTemporaryChat();
  }
  return TEMPORARY_CHAT_ENABLED;
}

/**
 * Async variant — guarantees the AsyncStorage value has been read at
 * least once before returning.
 */
export async function getTemporaryChatAsync(): Promise<boolean> {
  await hydrateTemporaryChat();
  return TEMPORARY_CHAT_ENABLED;
}
