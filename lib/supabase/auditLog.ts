/**
 * Audit Event Logging Service
 *
 * Fire-and-forget audit trail for capacity changes, baseline computations,
 * and proof event creation. All writes are best-effort — failures are
 * logged in __DEV__ but never block the caller.
 */

import { getSupabase, isSupabaseConfigured } from './client';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Insert a single audit event row. Best-effort — swallows errors.
 */
async function insertAuditEvent(params: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabase();

  const { error } = await supabase.from('audit_events').insert({
    user_id: params.userId,
    actor_type: 'user' as const,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    details: params.details ?? {},
  });

  if (error && __DEV__) {
    console.error('[auditLog] Insert failed:', error);
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Log a capacity entry being saved.
 *
 * Call fire-and-forget after the local save succeeds.
 */
export async function logCapacityEntry(
  userId: string,
  capacityValue: number | null | undefined,
  state: string,
  driverData: Record<string, number> | null | undefined,
): Promise<void> {
  await insertAuditEvent({
    userId,
    action: 'capacity_log',
    resourceType: 'capacity_log',
    details: {
      capacity_value: capacityValue ?? null,
      state,
      driver_data: driverData ?? null,
      timestamp: new Date().toISOString(),
      source: 'app',
    },
  });
}

/**
 * Log a baseline computation completing.
 */
export async function logBaselineComputed(
  userId: string,
  baselineId: string,
  confidenceScore: number | null,
): Promise<void> {
  await insertAuditEvent({
    userId,
    action: 'baseline_computed',
    resourceType: 'capacity_baseline',
    resourceId: baselineId,
    details: {
      confidence_score: confidenceScore,
      timestamp: new Date().toISOString(),
      source: 'app',
    },
  });
}

/**
 * Log a proof event being created.
 */
export async function logProofEventCreated(
  userId: string,
  eventId: string,
  title: string,
  eventType: string,
): Promise<void> {
  await insertAuditEvent({
    userId,
    action: 'proof_event_created',
    resourceType: 'proof_event',
    resourceId: eventId,
    details: {
      title,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      source: 'app',
    },
  });
}

/**
 * Retrieve the most recent audit events for a user.
 */
export async function getAuditTrail(
  userId: string,
  limit: number = 50,
): Promise<Array<Record<string, unknown>>> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('audit_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (__DEV__) console.error('[auditLog] getAuditTrail failed:', error);
    return [];
  }

  return data || [];
}
