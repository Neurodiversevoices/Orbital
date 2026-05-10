/**
 * Orbital Platform — Trust Core (runtime helpers)
 *
 * The Trust Core is layer 1 of the platform stack: posture, audit, and
 * permission grants. Bodies here are intentionally STUBBED — they ship as
 * skeletons with TODOs so the UI can compile and render without live
 * Supabase wiring. The next backend pass will fill these in against:
 *
 *   - lib/supabase/auditLog.ts (audit_events table)
 *   - lib/supabase/client.ts (auth + session)
 *   - a future `permission_grants` table
 */

import { useMemo } from 'react';

import type {
  AuditEvent,
  PermissionGrant,
  TrustPosture,
} from './types';
import { useSubBrand } from './SubBrandProvider';

// =============================================================================
// POSTURE
// =============================================================================

/**
 * Returns the trust posture for the currently active sub-brand.
 * Backed by `SubBrandProvider`; throws if used outside the provider.
 */
export function useTrustPosture(): TrustPosture {
  const { posture } = useSubBrand();
  // Memoize to keep referential stability for downstream hooks.
  return useMemo(() => ({ ...posture }), [posture]);
}

// =============================================================================
// AUDIT
// =============================================================================

/**
 * Local in-memory queue for audit events that have not yet been flushed
 * to Supabase. Survives only for the lifetime of the JS context.
 *
 * TODO: persist to AsyncStorage under `orbital.audit.queue` so we don't
 * lose events across cold launches.
 */
const auditQueue: AuditEvent[] = [];

/**
 * Input shape accepted by `recordAuditEvent`. Callers only need to
 * provide `action` and `target`; the helper fills in `id`, `actor`,
 * and `timestamp` defaults so call-sites stay terse.
 */
export type AuditEventInput =
  | AuditEvent
  | (Pick<AuditEvent, 'action' | 'target'> & Partial<AuditEvent>);

/**
 * Record an audit event. Best-effort — failures are warned, never thrown.
 *
 * Contract:
 *   1. Event is enqueued locally (synchronous, never fails).
 *   2. We attempt to flush to Supabase `audit_events`.
 *   3. On flush failure the event remains in the queue for retry.
 *
 * Accepts either a full AuditEvent or a partial `{ action, target }` —
 * missing id/actor/timestamp are auto-filled. This keeps caller ergonomics
 * tight (e.g. `recordAuditEvent({ action: 'subbrand.set', target: id })`).
 */
export async function recordAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    const filled: AuditEvent = {
      id:
        event.id ??
        `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actor: event.actor ?? 'self',
      action: event.action,
      target: event.target,
      timestamp: event.timestamp ?? new Date().toISOString(),
      metadata: event.metadata,
    };
    auditQueue.push(filled);
    // TODO: wire to lib/supabase/auditLog.ts → insert into audit_events.
    // TODO: respect TrustPosture.auditLogging — skip flush when false.
    // TODO: drain queue on app foreground + on auth.
  } catch (err) {
    console.warn('[trustCore] recordAuditEvent failed', err);
  }
}

/**
 * Read-only view of the local queue. UI screens (audit.tsx) can render
 * this until the Supabase fetch path is wired.
 */
export function getQueuedAuditEvents(): ReadonlyArray<AuditEvent> {
  return auditQueue;
}

// =============================================================================
// PERMISSIONS
// =============================================================================

/**
 * Request a permission grant for a tool/scope pair. In the final
 * implementation this opens a consent sheet, records the user's choice,
 * and returns the resulting grant. For now it returns a stub grant.
 */
export async function requestPermissionGrant(
  tool: string,
  scope: string,
): Promise<PermissionGrant> {
  try {
    // TODO: wire to consent flow (modal sheet) + persist to a future
    // `permission_grants` table on Supabase.
    const grant: PermissionGrant = {
      id: `grant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tool,
      scope,
      expiresAt: null,
      grantedAt: new Date().toISOString(),
      revocable: true,
    };
    return grant;
  } catch (err) {
    console.warn('[trustCore] requestPermissionGrant failed', err);
    throw err;
  }
}

/**
 * Revoke a previously-granted permission. Idempotent — revoking an
 * already-revoked or unknown grant must not throw.
 */
export async function revokeGrant(grantId: string): Promise<void> {
  try {
    // TODO: wire to Supabase — set revoked_at on the grant row.
    // TODO: emit an audit event { action: 'permission.revoked', target: grantId }.
    void grantId;
  } catch (err) {
    console.warn('[trustCore] revokeGrant failed', err);
  }
}
