/**
 * Proof Events Service
 *
 * CRUD operations for proof events — time-bounded tracking periods
 * that correlate capacity logs with real-world events.
 */

import { getSupabase, isSupabaseConfigured } from './client';
import { ProofEvent } from './types';

// =============================================================================
// CREATE
// =============================================================================

/**
 * Create a new proof event.
 */
export async function createProofEvent(
  userId: string,
  title: string,
  eventType: string,
  eventDate: string,
  notes?: string
): Promise<ProofEvent | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('proof_events')
    .insert({
      user_id: userId,
      title,
      event_type: eventType,
      event_date: eventDate,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) {
    if (__DEV__) console.error('[ProofEvents] Create failed:', error);
    return null;
  }

  return data;
}

// =============================================================================
// READ
// =============================================================================

/**
 * Get all active proof events for a user.
 */
export async function getActiveEvents(userId: string): Promise<ProofEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('proof_events')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('event_date', { ascending: true });

  if (error) {
    if (__DEV__) console.error('[ProofEvents] Get active failed:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single proof event with its associated capacity logs.
 * Returns the event plus all capacity_logs where occurred_at falls
 * between tracking_start and event_date.
 */
export async function getEventWithLogs(
  eventId: string,
  userId: string
): Promise<{ event: ProofEvent; logs: any[] } | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();

  // Fetch the event
  const { data: event, error: eventError } = await supabase
    .from('proof_events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', userId)
    .single();

  if (eventError || !event) {
    if (__DEV__) console.error('[ProofEvents] Get event failed:', eventError);
    return null;
  }

  // Fetch capacity logs within the tracking window
  const { data: logs, error: logsError } = await supabase
    .from('capacity_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('occurred_at', event.tracking_start)
    .lte('occurred_at', event.event_date)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: true });

  if (logsError) {
    if (__DEV__) console.error('[ProofEvents] Get logs failed:', logsError);
    return { event, logs: [] };
  }

  return { event, logs: logs || [] };
}

// =============================================================================
// UPDATE
// =============================================================================

/**
 * Mark a proof event as completed, setting tracking_end to now.
 */
export async function completeEvent(eventId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  const { error } = await supabase
    .from('proof_events')
    .update({
      status: 'completed',
      tracking_end: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (error) {
    if (__DEV__) console.error('[ProofEvents] Complete failed:', error);
    return false;
  }

  return true;
}
