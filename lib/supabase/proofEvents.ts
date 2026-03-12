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
// REPORT & TIMELINE
// =============================================================================

/** Summary statistics for a proof event's capacity window. */
export interface EventReportSummary {
  logCount: number;
  avgCapacity: number | null;
  minCapacity: number | null;
  maxCapacity: number | null;
  dominantDrivers: Record<string, number>;
  volatilityIndex: number | null;
}

/** Full proof-event report: the event, its logs, and computed summary. */
export interface EventReport {
  event: ProofEvent;
  logs: any[];
  summary: EventReportSummary;
}

/**
 * Get a full event report — the proof event, all capacity logs in its window,
 * and a computed summary (avg/min/max capacity, driver frequency, volatility).
 * This is the data that powers the CCI event report.
 */
export async function getEventReport(
  eventId: string,
  userId: string,
): Promise<EventReport | null> {
  const result = await getEventWithLogs(eventId, userId);
  if (!result) return null;

  const { event, logs } = result;

  // Extract capacity values, skipping nulls
  const capacityValues: number[] = [];
  for (const log of logs) {
    if (log.capacity_value != null) {
      capacityValues.push(log.capacity_value as number);
    }
  }

  const logCount = logs.length;
  let avgCapacity: number | null = null;
  let minCapacity: number | null = null;
  let maxCapacity: number | null = null;
  let volatilityIndex: number | null = null;

  if (capacityValues.length > 0) {
    const sum = capacityValues.reduce((a, b) => a + b, 0);
    const mean = sum / capacityValues.length;
    avgCapacity = Math.round(mean * 1000) / 1000;
    minCapacity = Math.min(...capacityValues);
    maxCapacity = Math.max(...capacityValues);

    // Volatility = standard deviation
    if (capacityValues.length > 1) {
      const squaredDiffs = capacityValues.map((v) => (v - mean) ** 2);
      const variance =
        squaredDiffs.reduce((a, b) => a + b, 0) / (capacityValues.length - 1);
      volatilityIndex = Math.round(Math.sqrt(variance) * 1000) / 1000;
    } else {
      volatilityIndex = 0;
    }
  }

  // Dominant drivers — frequency count of active driver keys
  const dominantDrivers: Record<string, number> = {};
  for (const log of logs) {
    const dd = log.driver_data;
    if (dd && typeof dd === 'object') {
      for (const [key, value] of Object.entries(dd)) {
        if (typeof value === 'number' && value > 0) {
          dominantDrivers[key] = (dominantDrivers[key] || 0) + 1;
        }
      }
    }
  }

  return {
    event,
    logs,
    summary: {
      logCount,
      avgCapacity,
      minCapacity,
      maxCapacity,
      dominantDrivers,
      volatilityIndex,
    },
  };
}

/** Single timeline entry for charting. */
export interface TimelineEntry {
  date: string;
  capacity_value: number | null;
  state: string;
  drivers: string[];
}

/**
 * Get capacity logs for a proof event's tracking window, formatted for charts.
 * Ordered by occurred_at ASC.
 */
export async function getEventTimeline(
  eventId: string,
  userId: string,
): Promise<TimelineEntry[]> {
  const result = await getEventWithLogs(eventId, userId);
  if (!result) return [];

  return result.logs.map((log: any) => ({
    date: log.occurred_at,
    capacity_value: log.capacity_value ?? null,
    state: log.state,
    drivers: log.tags || [],
  }));
}

// =============================================================================
// QUERIES: UPCOMING & PAST
// =============================================================================

/**
 * Get upcoming proof events (active + event_date in the future).
 * Ordered by event_date ASC (soonest first).
 */
export async function getUpcomingEvents(userId: string): Promise<ProofEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('proof_events')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('event_date', now)
    .order('event_date', { ascending: true });

  if (error) {
    if (__DEV__) console.error('[ProofEvents] getUpcomingEvents failed:', error);
    return [];
  }

  return data || [];
}

/**
 * Get past proof events (completed OR event_date in the past).
 * Ordered by event_date DESC (most recent first).
 */
export async function getPastEvents(userId: string): Promise<ProofEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Two cases: status = 'completed' OR event_date < now
  // Use .or() to combine conditions
  const { data, error } = await supabase
    .from('proof_events')
    .select('*')
    .eq('user_id', userId)
    .or(`status.eq.completed,event_date.lt.${now}`)
    .order('event_date', { ascending: false });

  if (error) {
    if (__DEV__) console.error('[ProofEvents] getPastEvents failed:', error);
    return [];
  }

  return data || [];
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
