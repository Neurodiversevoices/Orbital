/**
 * Orbital Platform — Trust Core (runtime helpers)
 *
 * Layer 1 of the platform stack: posture, audit, and permission grants.
 *
 * Wired against:
 *   - audit_events           (Supabase, extended in migration 00017)
 *   - permission_grants      (Supabase, created in migration 00017)
 *   - lib/supabase/client.ts (singleton Supabase client + auth)
 *
 * All cloud writes are best-effort: failures are warned, never thrown.
 * The local audit queue retains events that didn't flush so they can
 * be flushed later (e.g. on app foreground / re-auth).
 */

import { useMemo } from 'react';

import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import type { Database } from '../supabase/types';
import type { AuditEvent, PermissionGrant, TrustPosture } from './types';
import { useSubBrand } from './SubBrandProvider';

type AuditEventRow = Database['public']['Tables']['audit_events']['Row'];
type PermissionGrantRow =
  Database['public']['Tables']['permission_grants']['Row'];

// =============================================================================
// POSTURE
// =============================================================================

/**
 * Returns the trust posture for the currently active sub-brand.
 * Backed by `SubBrandProvider`; throws if used outside the provider.
 */
export function useTrustPosture(): TrustPosture {
  const { posture } = useSubBrand();
  return useMemo(() => ({ ...posture }), [posture]);
}

// =============================================================================
// AUDIT
// =============================================================================

/**
 * Local in-memory queue for audit events that have not yet been flushed
 * to Supabase. Survives only for the lifetime of the JS context.
 *
 * TODO (future): persist to AsyncStorage under `orbital.audit.queue`.
 */
const auditQueue: AuditEvent[] = [];

interface RecordAuditInput {
  /** Verb-noun action, e.g. 'capacity.logged', 'permission.revoked'. */
  action: string;
  /** What was acted upon — record id, resource path, etc. */
  target: string;
  /** Optional acting principal override; defaults to current user id / 'system'. */
  actor?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record an audit event. Best-effort — failures are warned, never thrown.
 *
 * Contract:
 *   1. Event is enqueued locally (synchronous, never fails).
 *   2. We attempt to flush to Supabase `audit_events`.
 *   3. On flush failure the event remains in the queue for retry.
 *
 * Accepts either a partial input ({action, target, ...}) or a fully-shaped
 * AuditEvent (used by replay paths).
 */
export async function recordAuditEvent(
  input: RecordAuditInput | AuditEvent,
): Promise<void> {
  try {
    const action = input.action;
    const target = input.target;
    const metadata = input.metadata ?? {};
    const callerActor = (input as RecordAuditInput).actor;

    // Resolve actor — prefer explicit override, then auth user id, else 'system'.
    let actor = callerActor;
    let userId: string | null = null;
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
        if (!actor) actor = userId ?? 'system';
      } catch {
        if (!actor) actor = 'system';
      }
    } else if (!actor) {
      actor = 'system';
    }

    // Enqueue locally first so the UI sees it immediately.
    const localEvent: AuditEvent = {
      id:
        (input as AuditEvent).id ??
        `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actor: actor ?? 'system',
      action,
      target,
      timestamp: (input as AuditEvent).timestamp ?? new Date().toISOString(),
      metadata,
    };
    auditQueue.push(localEvent);

    // Best-effort flush to Supabase.
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    const { error } = await supabase.from('audit_events').insert({
      user_id: userId,
      actor_type: 'user' as const,
      action,
      resource_type: 'platform',
      resource_id: target,
      details: metadata,
      actor: actor ?? null,
      target,
      metadata,
    });
    if (error) {
      if (__DEV__) {
        console.warn('[trustCore] audit flush failed', error.message);
      }
      return;
    }
    // On success, drop the event from the local queue (it's persisted).
    const idx = auditQueue.indexOf(localEvent);
    if (idx >= 0) auditQueue.splice(idx, 1);
  } catch (err) {
    if (__DEV__) console.warn('[trustCore] recordAuditEvent failed', err);
  }
}

/**
 * Read-only view of the local queue. UI screens (audit.tsx) can render
 * this as a fallback alongside Supabase reads.
 */
export function getQueuedAuditEvents(): ReadonlyArray<AuditEvent> {
  return auditQueue;
}

/**
 * Fetch recent audit events for the current user from Supabase.
 * Returns an empty array on any failure (best-effort).
 */
export async function fetchAuditEvents(limit = 100): Promise<AuditEvent[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      if (__DEV__ && error) console.warn('[trustCore] fetchAuditEvents', error.message);
      return [];
    }

    return data.map((row: AuditEventRow) => ({
      id: row.id,
      actor: row.actor ?? row.actor_type ?? 'system',
      action: row.action,
      target: row.target ?? row.resource_id ?? row.resource_type,
      timestamp: row.created_at,
      metadata:
        (row.metadata as Record<string, unknown> | null) ??
        (row.details as Record<string, unknown> | null) ??
        {},
    }));
  } catch (err) {
    if (__DEV__) console.warn('[trustCore] fetchAuditEvents failed', err);
    return [];
  }
}

// =============================================================================
// PERMISSIONS
// =============================================================================

/**
 * Map a Supabase permission_grants row to the UI-friendly PermissionGrant.
 */
function rowToGrant(row: PermissionGrantRow): PermissionGrant {
  return {
    id: row.id,
    tool: row.tool,
    scope: row.scope,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    revocable: true,
  };
}

/**
 * Request a permission grant for a tool/scope pair. Inserts a row in the
 * permission_grants table and returns the resulting grant. Always pairs
 * with a `grant.request` audit event.
 */
export async function requestPermissionGrant(
  tool: string,
  scope: string,
  options?: { expiresAt?: string | null; metadata?: Record<string, unknown> },
): Promise<PermissionGrant> {
  if (!isSupabaseConfigured()) {
    // Offline / unconfigured fallback — return a local-only grant so the UI
    // can continue. NOT persisted.
    const fallback: PermissionGrant = {
      id: `grant_local_${Date.now()}`,
      tool,
      scope,
      grantedAt: new Date().toISOString(),
      expiresAt: options?.expiresAt ?? null,
      revocable: true,
    };
    await recordAuditEvent({
      action: 'grant.request',
      target: tool,
      metadata: { scope, local: true },
    });
    return fallback;
  }

  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('[trustCore] requestPermissionGrant: not authenticated');
  }

  const { data, error } = await supabase
    .from('permission_grants')
    .insert({
      user_id: user.id,
      tool,
      scope,
      expires_at: options?.expiresAt ?? null,
      metadata: options?.metadata ?? {},
    })
    .select('*')
    .single();

  if (error || !data) {
    if (__DEV__) {
      console.warn('[trustCore] requestPermissionGrant insert failed', error?.message);
    }
    throw error ?? new Error('Insert returned no row');
  }

  // Pair every mutation with an audit event.
  await recordAuditEvent({
    action: 'grant.request',
    target: tool,
    metadata: { scope, grantId: data.id },
  });

  return rowToGrant(data);
}

/**
 * Revoke a previously-granted permission. Idempotent — revoking an
 * already-revoked or unknown grant must not throw. Pairs with a
 * `grant.revoke` audit event.
 */
export async function revokeGrant(grantId: string): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('permission_grants')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', grantId)
          .eq('user_id', user.id);
        if (error && __DEV__) {
          console.warn('[trustCore] revokeGrant failed', error.message);
        }
      }
    }
    // Pair with audit event regardless of cloud success.
    await recordAuditEvent({ action: 'grant.revoke', target: grantId });
  } catch (err) {
    if (__DEV__) console.warn('[trustCore] revokeGrant failed', err);
  }
}

/**
 * Fetch all active (non-revoked) grants for the current user.
 * Returns an empty array on failure / unauthenticated state.
 */
export async function fetchActiveGrants(): Promise<PermissionGrant[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('permission_grants')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('granted_at', { ascending: false });

    if (error || !data) {
      if (__DEV__ && error) console.warn('[trustCore] fetchActiveGrants', error.message);
      return [];
    }
    return data.map(rowToGrant);
  } catch (err) {
    if (__DEV__) console.warn('[trustCore] fetchActiveGrants failed', err);
    return [];
  }
}
