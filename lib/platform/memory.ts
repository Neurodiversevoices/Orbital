/**
 * Orbital Platform — Memory primitives (4-layer dashboard)
 *
 * Implements the user-facing memory model:
 *   - ephemeral: this session only
 *   - workspace: scoped to current org/circle
 *   - profile:   persistent, user-owned, exportable
 *   - implicit:  inferred preferences/patterns (fully editable)
 *
 * Bodies here are skeletons. UI screens (app/(platform)/memory.tsx) read
 * via `useMemory(scope)`; mutation paths (`editMemory`, `deleteMemory`,
 * `clearScope`, `setTemporaryChat`) are TODOs pointing at the eventual
 * Supabase + AsyncStorage wiring.
 */

import { useEffect, useState } from 'react';

import type { MemoryRecord, MemoryScope } from './types';

// =============================================================================
// IN-MEMORY STORE (until backend wired)
// =============================================================================

/**
 * Module-scope mock store. Replaced once we have a real persistence layer.
 *
 * TODO: replace with a (Supabase row → record) reader keyed by scope.
 * TODO: ephemeral records must NEVER persist — gate them on
 *       a session-only in-memory map.
 */
const MOCK_RECORDS: ReadonlyArray<MemoryRecord> = [
  {
    id: 'mem_demo_1',
    scope: 'profile',
    content: 'Prefers shorter mornings, deeper afternoon focus blocks.',
    createdAt: new Date().toISOString(),
    source: 'inferred',
    userEditable: true,
  },
  {
    id: 'mem_demo_2',
    scope: 'implicit',
    content: 'Capacity tends to dip around 3pm on Wednesdays.',
    createdAt: new Date().toISOString(),
    source: 'pattern-engine',
    userEditable: true,
  },
];

/**
 * Whether the user has flipped the global "Temporary chat mode" switch.
 * Module-scope so subscribers across screens see the same value until
 * the AsyncStorage hookup lands.
 */
let TEMPORARY_CHAT_ENABLED = false;

// =============================================================================
// READS
// =============================================================================

/**
 * Hook: read all memory records for a given scope.
 *
 * Currently returns mock data filtered by scope. Wire-up TODOs:
 *   - subscribe to Supabase realtime updates on the user's memory rows
 *   - filter by tenant when posture.tenancyIsolation is true
 *   - never return ephemeral records older than the current session
 */
export function useMemory(scope: MemoryScope): MemoryRecord[] {
  const [records, setRecords] = useState<MemoryRecord[]>(() =>
    MOCK_RECORDS.filter((r) => r.scope === scope),
  );

  useEffect(() => {
    // TODO: wire to Supabase / AsyncStorage. For now, recompute when scope flips.
    setRecords(MOCK_RECORDS.filter((r) => r.scope === scope));
  }, [scope]);

  return records;
}

// =============================================================================
// WRITES (skeletons)
// =============================================================================

/**
 * Edit the content of a single memory record.
 * No-op stub — UI can call optimistically; the real path will sync.
 */
export async function editMemory(id: string, content: string): Promise<void> {
  try {
    // TODO: update Supabase row + emit audit event { action: 'memory.edited' }.
    void id;
    void content;
  } catch (err) {
    console.warn('[memory] editMemory failed', err);
  }
}

/**
 * Delete a single memory record.
 * Profile/workspace records are soft-deleted; ephemeral are hard-deleted.
 */
export async function deleteMemory(id: string): Promise<void> {
  try {
    // TODO: soft-delete in Supabase + audit { action: 'memory.deleted' }.
    void id;
  } catch (err) {
    console.warn('[memory] deleteMemory failed', err);
  }
}

/**
 * Clear ALL records in a given scope. Used by the "Clear scope" button
 * on the Memory Dashboard.
 */
export async function clearScope(scope: MemoryScope): Promise<void> {
  try {
    // TODO: bulk soft-delete in Supabase scoped to (user, scope).
    // TODO: audit { action: 'memory.cleared', target: scope }.
    void scope;
  } catch (err) {
    console.warn('[memory] clearScope failed', err);
  }
}

/**
 * Toggle the global "Temporary chat" mode. When enabled, all conversations
 * are forced into the ephemeral scope regardless of user preference.
 */
export function setTemporaryChat(enabled: boolean): void {
  try {
    TEMPORARY_CHAT_ENABLED = enabled;
    // TODO: persist to AsyncStorage under `orbital.memory.temporaryChat`.
    // TODO: broadcast to chat surfaces via a small EventEmitter or context.
  } catch (err) {
    console.warn('[memory] setTemporaryChat failed', err);
  }
}

/**
 * Read the current Temporary chat flag.
 */
export function getTemporaryChat(): boolean {
  return TEMPORARY_CHAT_ENABLED;
}
