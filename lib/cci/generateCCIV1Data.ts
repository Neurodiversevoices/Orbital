/**
 * CCI Clinical Artifact v1 — Data Computation
 *
 * Queries capacity_logs over a 90-day window and computes the structured
 * data object that feeds the Clinical Artifact v1 component, FHIR serializer,
 * and PDF exporter.
 *
 * Pure compute helpers are exported individually for unit testing.
 * The main function (generateCCIV1Data) is the only async entry point.
 *
 * FORBIDDEN TERMS: This file must never contain user-facing strings with:
 * score, variance, deviation, contributors, trajectory, diagnosis, treatment,
 * therapy, medical device, HIPAA, CPT, FDA, prescribe, therapeutic, cure,
 * prevent, symptom, disorder.
 */

import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { getLatestBaseline } from '../supabase/baselines';
import { getUniqueDates } from '../baselineUtils';
import { generateAnonymizedPatientId } from './dynamic/compute';
import type { CapacityLog, CapacityState } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export type BaselineClassification = 'Above' | 'Near' | 'Below';
export type DirectionClassification = 'Increasing' | 'Stable' | 'Decreasing';
export type AreaChangeDirection = 'Increased' | 'Decreased' | 'Remained Stable';

export interface AreaOfChange {
  /** Human-readable driver label (e.g., "Sleep Regularity") */
  area: string;
  /** Directional classification */
  direction: AreaChangeDirection;
}

export interface CCIV1Data {
  reportId: string;
  clientId: string;
  generatedDate: string;
  periodStart: string;
  periodEnd: string;
  providerName: string;
  providerNPI: string;
  baseline90Day: BaselineClassification;
  direction30Day: DirectionClassification;
  areasOfChange: AreaOfChange[];
  coverageDays: number;
  coverageTotal: number;
  instrumentVersion: string;
  fhirResourceType: string;
}

// =============================================================================
// CONSTANTS — Classification thresholds
// =============================================================================

/**
 * Delta threshold for baseline classification.
 * ±0.12 on a 0–1 scale avoids jitter from normal self-report noise
 * across 90-day reporting periods.
 */
const BASELINE_DELTA_THRESHOLD = 0.12;

/**
 * Fallback thresholds when no prior baseline exists.
 * Applied to the raw 90-day mean capacity value (0.0–1.0).
 */
const FALLBACK_ABOVE_THRESHOLD = 0.55;
const FALLBACK_BELOW_THRESHOLD = 0.25;

/**
 * Delta threshold for 30-day direction classification.
 * Same ±0.12 band keeps direction stable between reports.
 */
const DIRECTION_DELTA_THRESHOLD = 0.12;

/**
 * Minimum delta for area-of-change classification.
 * Below this, the area is classified as "Remained Stable".
 */
const AREA_CHANGE_THRESHOLD = 0.1;

/**
 * Minimum unique logging days required in the 90-day window.
 */
const MINIMUM_LOGGING_DAYS = 7;

// =============================================================================
// DRIVER LABEL MAP
// =============================================================================

const DRIVER_LABELS: Record<string, string> = {
  sensory: 'Sensory Load',
  demand: 'Demand Load',
  social: 'Social Engagement',
  sleep: 'Sleep Regularity',
  stress: 'Stress Patterns',
  exercise: 'Activity Patterns',
  meds: 'Regulated Patterns',
  food: 'Nourishment Patterns',
};

/**
 * Get human-readable label for a driver key.
 * Falls back to capitalizing the key for unknown drivers.
 */
export function getDriverLabel(key: string): string {
  return DRIVER_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

// =============================================================================
// PURE COMPUTE HELPERS
// =============================================================================

function stateToCapacity(state: CapacityState): number {
  switch (state) {
    case 'resourced': return 0.8;
    case 'stretched': return 0.5;
    case 'depleted': return 0.25;
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLogDate(log: CapacityLog): string {
  if (log.localDate) return log.localDate;
  const date = new Date(log.timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCapacityValue(log: CapacityLog): number {
  if (log.capacity_value != null) return log.capacity_value;
  return stateToCapacity(log.state);
}

/**
 * Classify the 90-day baseline relative to a prior baseline.
 *
 * If a prior baseline exists, compares the current 90-day mean to the
 * stored baseline_capacity. Delta > +0.12 → Above, < -0.12 → Below, else Near.
 *
 * If no prior baseline exists, applies fallback thresholds to the raw
 * 90-day mean: ≥0.55 → Above, <0.25 → Below, else Near.
 */
export function classifyBaseline(
  current90DayMean: number,
  priorBaseline: number | null,
): BaselineClassification {
  if (priorBaseline != null) {
    const delta = current90DayMean - priorBaseline;
    if (delta > BASELINE_DELTA_THRESHOLD) return 'Above';
    if (delta < -BASELINE_DELTA_THRESHOLD) return 'Below';
    return 'Near';
  }

  // Fallback: no prior baseline
  if (current90DayMean >= FALLBACK_ABOVE_THRESHOLD) return 'Above';
  if (current90DayMean < FALLBACK_BELOW_THRESHOLD) return 'Below';
  return 'Near';
}

/**
 * Compute 30-day direction by comparing the second half (last 15 days)
 * to the first half (days 30–16).
 *
 * Uses ±0.12 threshold to avoid classification jitter.
 */
export function computeDirection(
  logs: CapacityLog[],
  windowEnd: string,
): DirectionClassification {
  const endDate = new Date(windowEnd + 'T00:00:00');
  const midDate = new Date(endDate);
  midDate.setDate(midDate.getDate() - 15);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const midStr = formatDateStr(midDate);
  const startStr = formatDateStr(startDate);

  const firstHalf: number[] = [];
  const secondHalf: number[] = [];

  for (const log of logs) {
    const d = getLogDate(log);
    const val = getCapacityValue(log);
    if (d >= startStr && d < midStr) {
      firstHalf.push(val);
    } else if (d >= midStr && d <= windowEnd) {
      secondHalf.push(val);
    }
  }

  if (firstHalf.length === 0 || secondHalf.length === 0) return 'Stable';

  const delta = mean(secondHalf) - mean(firstHalf);
  if (delta > DIRECTION_DELTA_THRESHOLD) return 'Increasing';
  if (delta < -DIRECTION_DELTA_THRESHOLD) return 'Decreasing';
  return 'Stable';
}

/**
 * Compute the top 3 areas showing most change.
 *
 * Compares driver intensity in the last 30 days vs the prior 60 days.
 * This 30/60 split aligns with the "30-Day Direction" recency window
 * so providers see consistent signals across sections 3 and 4.
 */
export function computeAreasOfChange(
  logs: CapacityLog[],
  windowStart: string,
  windowEnd: string,
): AreaOfChange[] {
  const endDate = new Date(windowEnd + 'T00:00:00');
  const splitDate = new Date(endDate);
  splitDate.setDate(splitDate.getDate() - 30);
  const splitStr = formatDateStr(splitDate);

  // Accumulate driver intensities per period
  const priorDrivers: Record<string, number[]> = {};
  const recentDrivers: Record<string, number[]> = {};

  for (const log of logs) {
    const d = getLogDate(log);
    if (d < windowStart || d > windowEnd) continue;
    if (!log.driver_data) continue;

    const isRecent = d >= splitStr;
    const target = isRecent ? recentDrivers : priorDrivers;

    for (const [key, intensity] of Object.entries(log.driver_data)) {
      if (typeof intensity !== 'number') continue;
      if (!target[key]) target[key] = [];
      target[key].push(intensity);
    }
  }

  // Collect all unique driver keys
  const allKeys = new Set([
    ...Object.keys(priorDrivers),
    ...Object.keys(recentDrivers),
  ]);

  // Compute delta for each driver
  const deltas: Array<{ key: string; delta: number; absDelta: number }> = [];
  for (const key of allKeys) {
    const priorMean = priorDrivers[key] ? mean(priorDrivers[key]) : 0;
    const recentMean = recentDrivers[key] ? mean(recentDrivers[key]) : 0;
    const delta = recentMean - priorMean;
    deltas.push({ key, delta, absDelta: Math.abs(delta) });
  }

  // Sort by absolute delta descending, take top 3
  deltas.sort((a, b) => b.absDelta - a.absDelta);
  const top3 = deltas.slice(0, 3);

  // If fewer than 3 drivers, pad with stable entries
  while (top3.length < 3) {
    const paddingKeys = ['sensory', 'demand', 'social'];
    const existing = new Set(top3.map((d) => d.key));
    const paddingKey = paddingKeys.find((k) => !existing.has(k)) || 'general';
    top3.push({ key: paddingKey, delta: 0, absDelta: 0 });
  }

  return top3.map((d) => ({
    area: getDriverLabel(d.key),
    direction: classifyAreaDirection(d.delta),
  }));
}

function classifyAreaDirection(delta: number): AreaChangeDirection {
  if (Math.abs(delta) < AREA_CHANGE_THRESHOLD) return 'Remained Stable';
  return delta > 0 ? 'Increased' : 'Decreased';
}

// =============================================================================
// SUPABASE QUERY
// =============================================================================

interface RawCapacityRow {
  occurred_at: string;
  capacity_value: number | null;
  driver_data: Record<string, number> | null;
  state: string;
}

async function fetchCapacityLogs(
  userId: string,
  windowStart: string,
  windowEnd: string,
): Promise<CapacityLog[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('capacity_logs')
    .select('occurred_at, capacity_value, driver_data, state')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('occurred_at', windowStart)
    .lte('occurred_at', windowEnd)
    .order('occurred_at', { ascending: true })
    .limit(5000);

  if (error || !data) return [];

  return (data as RawCapacityRow[]).map((row) => {
    const ts = new Date(row.occurred_at).getTime();
    const state = row.state as CapacityState;
    return {
      id: `${userId}-${ts}`,
      state,
      timestamp: ts,
      tags: [],
      localDate: row.occurred_at.substring(0, 10),
      capacity_value: row.capacity_value ?? undefined,
      driver_data: row.driver_data ?? undefined,
    };
  });
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Generate all data for the CCI Clinical Artifact v1.
 *
 * Returns null if insufficient data (fewer than 7 unique logging days
 * in the 90-day window).
 */
export async function generateCCIV1Data(
  userId: string,
  providerName: string,
  providerNPI: string,
): Promise<CCIV1Data | null> {
  // Compute 90-day window
  const now = new Date();
  const windowEndDate = new Date(now);
  const windowStartDate = new Date(now);
  windowStartDate.setDate(windowStartDate.getDate() - 90);

  const periodEnd = formatDateStr(windowEndDate);
  const periodStart = formatDateStr(windowStartDate);

  // Fetch logs
  const logs = await fetchCapacityLogs(userId, periodStart, periodEnd);

  // Gate: minimum unique logging days
  const uniqueDays = getUniqueDates(logs);
  if (uniqueDays.size < MINIMUM_LOGGING_DAYS) {
    return null;
  }

  // Compute capacity values for baseline classification
  const capacityValues = logs
    .map(getCapacityValue)
    .filter((v) => v != null);
  const current90DayMean = mean(capacityValues);

  // Fetch prior baseline for comparison
  const priorBaseline = await getLatestBaseline(userId);
  const priorBaselineCapacity = priorBaseline?.baseline_capacity ?? null;

  // Classify baseline
  const baseline90Day = classifyBaseline(current90DayMean, priorBaselineCapacity);

  // Compute 30-day direction
  const direction30Day = computeDirection(logs, periodEnd);

  // Compute top 3 areas of change (30/60 split)
  const areasOfChange = computeAreasOfChange(logs, periodStart, periodEnd);

  // Coverage
  const coverageDays = uniqueDays.size;
  const coverageTotal = 90;

  // Generate IDs
  const timestamp = now.toISOString();
  const reportId = `CCI-${formatDateStr(now).replace(/-/g, '')}-${generateAnonymizedPatientId(userId + timestamp).substring(0, 4).toUpperCase()}`;
  const clientId = `OH-${generateAnonymizedPatientId(userId).substring(0, 5)}`;

  return {
    reportId,
    clientId,
    generatedDate: timestamp,
    periodStart,
    periodEnd,
    providerName,
    providerNPI,
    baseline90Day,
    direction30Day,
    areasOfChange,
    coverageDays,
    coverageTotal,
    instrumentVersion: 'CCI v1.0',
    fhirResourceType: 'DocumentReference',
  };
}
