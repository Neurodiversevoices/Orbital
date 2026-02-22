/**
 * Dynamic CCI v1 — Compute Layer Unit Tests
 *
 * Tests 1-13 from the verification checklist.
 */

import { CapacityLog } from '../../../../types';
import {
  computeCCIDynamicData,
  computeObservationWindow,
  computeTrackingContinuity,
  computePatternStability,
  computeVerdict,
  computeChartValues,
  computeMonthlyBreakdown,
  generateAnonymizedPatientId,
} from '../compute';
import { CCIComputeConfig } from '../types';

// =============================================================================
// HELPERS
// =============================================================================

function makeLog(
  state: 'resourced' | 'stretched' | 'depleted',
  localDate: string,
  id?: string,
): CapacityLog {
  return {
    id: id || `log-${localDate}-${Math.random().toString(36).substr(2, 5)}`,
    state,
    timestamp: new Date(localDate + 'T12:00:00').getTime(),
    tags: [],
    localDate,
  };
}

function makeLogs(
  count: number,
  state: 'resourced' | 'stretched' | 'depleted',
  startDate: string,
): CapacityLog[] {
  const logs: CapacityLog[] = [];
  const start = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    logs.push(makeLog(state, dateStr));
  }
  return logs;
}

const DEFAULT_CONFIG: CCIComputeConfig = {
  windowStart: '2025-10-01',
  windowEnd: '2025-12-31',
  minimumDays: 90,
  patientIdSeed: 'test-user-123',
};

// =============================================================================
// TEST 1: Returns null for <90 signals
// =============================================================================

describe('computeCCIDynamicData', () => {
  it('returns null for <90 signals (Phase 3 gate)', () => {
    const logs = makeLogs(89, 'resourced', '2025-10-01');
    const result = computeCCIDynamicData(logs, DEFAULT_CONFIG);
    expect(result).toBeNull();
  });

  // TEST 2: Returns data for exactly 90 signals
  it('returns data for exactly 90 signals', () => {
    const logs = makeLogs(90, 'resourced', '2025-10-01');
    const result = computeCCIDynamicData(logs, DEFAULT_CONFIG);
    expect(result).not.toBeNull();
    expect(result!.totalSignals).toBe(90);
  });

  // TEST: Filters logs to window only
  it('excludes logs outside the observation window', () => {
    const inWindow = makeLogs(90, 'resourced', '2025-10-01');
    const outWindow = makeLogs(10, 'depleted', '2025-09-01');
    const result = computeCCIDynamicData([...outWindow, ...inWindow], DEFAULT_CONFIG);
    expect(result).not.toBeNull();
    expect(result!.totalSignals).toBe(90);
  });
});

// =============================================================================
// TEST 3-4: Tracking Continuity
// =============================================================================

describe('computeTrackingContinuity', () => {
  it('returns 100% for 90 entries on 90 unique days (92-day window)', () => {
    const logs = makeLogs(92, 'resourced', '2025-10-01');
    const result = computeTrackingContinuity(logs, '2025-10-01', '2025-12-31');
    expect(result.percent).toBe(100);
    expect(result.rating).toBe('high');
    expect(result.daysWithEntries).toBe(92);
    expect(result.totalDays).toBe(92);
  });

  it('returns ~50% for entries on half the days', () => {
    // Create logs on every other day for a 90-day window
    const logs: CapacityLog[] = [];
    const start = new Date('2025-10-01T00:00:00');
    for (let i = 0; i < 92; i += 2) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      logs.push(makeLog('resourced', `${y}-${m}-${day}`));
    }
    const result = computeTrackingContinuity(logs, '2025-10-01', '2025-12-31');
    expect(result.percent).toBe(50);
    expect(result.rating).toBe('moderate');
  });

  it('returns low rating for <40% continuity', () => {
    const logs = makeLogs(10, 'resourced', '2025-10-01');
    const result = computeTrackingContinuity(logs, '2025-10-01', '2025-12-31');
    expect(result.percent).toBeLessThan(40);
    expect(result.rating).toBe('low');
  });
});

// =============================================================================
// TEST 5-6: Pattern Stability
// =============================================================================

describe('computePatternStability', () => {
  it('returns very high stability for constant input (all-resourced)', () => {
    const dailyValues = Array(90).fill(100);
    const result = computePatternStability(dailyValues);
    expect(result.stabilityPercent).toBeGreaterThanOrEqual(95);
    expect(result.volatilityRaw).toBe(0);
  });

  it('returns very low stability for alternating resourced/depleted', () => {
    const dailyValues = Array(90).fill(0).map((_, i) => i % 2 === 0 ? 100 : 0);
    const result = computePatternStability(dailyValues);
    expect(result.stabilityPercent).toBeLessThanOrEqual(5);
  });

  it('returns mid-range stability for moderate variation', () => {
    const dailyValues = [80, 70, 85, 65, 75, 80, 60, 70, 75, 80];
    const result = computePatternStability(dailyValues);
    expect(result.stabilityPercent).toBeGreaterThan(80);
    expect(result.stabilityPercent).toBeLessThanOrEqual(100);
  });
});

// =============================================================================
// TEST 7-8: Verdict Lookup
// =============================================================================

describe('computeVerdict', () => {
  it('high stability + high continuity → Interpretable Capacity Trends', () => {
    expect(computeVerdict(85, 75)).toBe('Interpretable Capacity Trends');
  });

  it('high stability + mid continuity → Partial Capacity Trends', () => {
    expect(computeVerdict(85, 55)).toBe('Partial Capacity Trends');
  });

  it('mid stability + high continuity → Variable Capacity Patterns', () => {
    expect(computeVerdict(65, 75)).toBe('Variable Capacity Patterns');
  });

  it('mid stability + mid continuity → Partial Capacity Patterns', () => {
    expect(computeVerdict(65, 55)).toBe('Partial Capacity Patterns');
  });

  it('low stability + high continuity → Highly Variable Capacity', () => {
    expect(computeVerdict(30, 75)).toBe('Highly Variable Capacity');
  });

  it('low stability + mid continuity → Insufficient Stability', () => {
    expect(computeVerdict(30, 55)).toBe('Insufficient Stability');
  });

  it('any stability + low continuity → Insufficient Observation', () => {
    expect(computeVerdict(90, 30)).toBe('Insufficient Observation');
    expect(computeVerdict(60, 30)).toBe('Insufficient Observation');
    expect(computeVerdict(30, 30)).toBe('Insufficient Observation');
  });
});

// =============================================================================
// TEST 9-10: Chart Values
// =============================================================================

describe('computeChartValues', () => {
  it('produces exactly 6 elements', () => {
    const logs = makeLogs(92, 'resourced', '2025-10-01');
    const values = computeChartValues(logs, '2025-10-01', '2025-12-31');
    expect(values).toHaveLength(6);
  });

  it('produces values in range 0-100', () => {
    const logs = makeLogs(92, 'resourced', '2025-10-01');
    const values = computeChartValues(logs, '2025-10-01', '2025-12-31');
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('returns fallback values for empty logs', () => {
    const values = computeChartValues([], '2025-10-01', '2025-12-31');
    expect(values).toHaveLength(6);
    expect(values.every(v => v === 50)).toBe(true);
  });
});

// =============================================================================
// TEST 11-12: Patient ID
// =============================================================================

describe('generateAnonymizedPatientId', () => {
  it('produces NNNNN-AAA format', () => {
    const id = generateAnonymizedPatientId('test-user-123');
    expect(id).toMatch(/^\d{5}-[A-Z]{3}$/);
  });

  it('is deterministic — same input yields same output', () => {
    const id1 = generateAnonymizedPatientId('user-abc-456');
    const id2 = generateAnonymizedPatientId('user-abc-456');
    expect(id1).toBe(id2);
  });

  it('produces different IDs for different seeds', () => {
    const id1 = generateAnonymizedPatientId('user-abc');
    const id2 = generateAnonymizedPatientId('user-xyz');
    expect(id1).not.toBe(id2);
  });
});

// =============================================================================
// TEST 13: Monthly Breakdown
// =============================================================================

describe('computeMonthlyBreakdown', () => {
  it('produces correct month count for 3-month window', () => {
    const logs = makeLogs(92, 'resourced', '2025-10-01');
    const breakdown = computeMonthlyBreakdown(logs, '2025-10-01', '2025-12-31');
    expect(breakdown).toHaveLength(3);
    expect(breakdown[0].month).toBe('2025-10');
    expect(breakdown[1].month).toBe('2025-11');
    expect(breakdown[2].month).toBe('2025-12');
  });

  it('computes correct distribution per month', () => {
    const oct = makeLogs(15, 'resourced', '2025-10-01');
    const nov = makeLogs(15, 'stretched', '2025-11-01');
    const dec = makeLogs(15, 'depleted', '2025-12-01');
    const logs = [...oct, ...nov, ...dec];
    const breakdown = computeMonthlyBreakdown(logs, '2025-10-01', '2025-12-31');

    expect(breakdown[0].distribution.resourced).toBe(15);
    expect(breakdown[1].distribution.stretched).toBe(15);
    expect(breakdown[2].distribution.depleted).toBe(15);
  });

  it('computes stability and volatility per month', () => {
    const logs = makeLogs(31, 'resourced', '2025-10-01');
    const breakdown = computeMonthlyBreakdown(logs, '2025-10-01', '2025-10-31');
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].stability).toBeGreaterThanOrEqual(95);
    expect(breakdown[0].volatility).toBe(0);
  });
});
