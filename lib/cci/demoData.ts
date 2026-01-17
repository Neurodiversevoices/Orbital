/**
 * Shared CCI Demo Data
 *
 * Single source of truth for fabricated capacity histories.
 * Used by both the app (brief.tsx) and artifact generator (artifact.ts).
 *
 * DATA SCALE: 0-100 (matches lib/charts unified system)
 * - 0-33: Depleted
 * - 33-66: Stretched
 * - 66-100: Resourced
 */

// =============================================================================
// FABRICATED DEMO DATA — Simulating years of real user tracking
// Scale: 0-100 (unified chart system)
// =============================================================================

export const FABRICATED_HISTORIES: Record<string, number[]> = {
  // Mia: Stable in stretched range with some good days
  // Original 1-3 scale values converted to 0-100
  mia: [
    55, 50, 45, 50, 60, 65, 55, 50, 40, 45,
    50, 55, 60, 50, 45, 50, 55, 50, 45, 40,
    45, 50, 55, 60, 55, 50, 50, 45, 50, 55,
    50, 45, 40, 45, 50, 55, 60, 55, 50, 45,
    50, 55, 50, 45, 50, 55, 50, 45, 40, 45,
    50, 55, 60, 55, 50, 45, 50, 55, 50, 45,
    40, 45, 50, 55, 50, 45, 50, 55, 60, 55,
    50, 45, 50, 55, 50, 45, 40, 45, 50, 55,
    50, 45, 50, 55, 60, 55, 50, 45, 50, 50,
  ],
  // Zach: Clear declining pattern - started resourced, now depleted
  zach: [
    90, 85, 90, 80, 85, 75, 80, 70, 75, 65,
    70, 65, 60, 65, 55, 60, 50, 55, 50, 45,
    50, 45, 40, 45, 40, 35, 40, 35, 30, 35,
    30, 35, 30, 25, 30, 25, 30, 25, 20, 25,
    20, 25, 20, 25, 20, 15, 20, 15, 20, 15,
    20, 15, 20, 15, 10, 15, 10, 15, 20, 15,
    10, 15, 10, 15, 10, 15, 10, 5, 10, 15,
    10, 5, 10, 15, 10, 5, 10, 5, 10, 5,
    10, 5, 10, 5, 0, 5, 10, 5, 0, 5,
  ],
  // Lily: Improving pattern - started low, now resourced
  lily: [
    20, 25, 20, 25, 30, 25, 30, 35, 30, 35,
    40, 35, 40, 45, 40, 45, 50, 45, 50, 55,
    50, 55, 60, 55, 60, 65, 60, 65, 70, 65,
    70, 65, 70, 75, 70, 75, 70, 75, 80, 75,
    80, 75, 80, 75, 80, 85, 80, 85, 80, 85,
    80, 85, 90, 85, 90, 85, 90, 85, 90, 95,
    90, 85, 90, 95, 90, 85, 90, 95, 90, 95,
    90, 95, 90, 95, 90, 95, 100, 95, 90, 95,
    100, 95, 90, 95, 100, 95, 90, 95, 100, 95,
  ],
  // Tyler: Volatile pattern - unpredictable swings (MUST show zigzag)
  tyler: [
    60, 40, 70, 30, 80, 45, 55, 20, 75, 35,
    65, 25, 85, 40, 50, 15, 70, 30, 60, 45,
    75, 20, 55, 35, 80, 25, 65, 40, 50, 20,
    70, 30, 60, 45, 75, 15, 55, 35, 80, 25,
    65, 40, 50, 20, 70, 30, 60, 45, 75, 15,
    55, 35, 80, 25, 65, 40, 50, 20, 70, 30,
    60, 45, 75, 15, 55, 35, 80, 25, 65, 40,
    50, 20, 70, 30, 60, 45, 75, 15, 55, 35,
    80, 25, 65, 40, 50, 20, 70, 30, 60, 40,
  ],
  // Emma: Gradual decline with recent dip
  emma: [
    80, 75, 80, 75, 70, 75, 70, 65, 70, 65,
    70, 65, 60, 65, 60, 65, 60, 55, 60, 55,
    60, 55, 50, 55, 50, 55, 50, 45, 50, 45,
    50, 45, 50, 45, 40, 45, 40, 45, 40, 35,
    40, 35, 40, 35, 40, 35, 30, 35, 30, 35,
    30, 35, 30, 25, 30, 25, 30, 25, 30, 25,
    20, 25, 20, 25, 20, 25, 20, 15, 20, 15,
    20, 15, 20, 15, 10, 15, 10, 15, 10, 15,
    10, 5, 10, 5, 10, 5, 10, 5, 10, 10,
  ],
};

// =============================================================================
// DEMO CIRCLE MEMBER METADATA
// =============================================================================

export interface CircleMemberData {
  id: string;
  name: string;
  username: string;
  displayName: string;
  capacityState: 'resourced' | 'stretched' | 'depleted';
  trend: 'improving' | 'flat' | 'declining' | 'volatile';
  participation: string;
  notes: string;
  capacityHistory: number[];
}

export const DEMO_CIRCLE_MEMBERS: CircleMemberData[] = [
  { id: '1', name: 'Mia', username: '@mia', displayName: 'Mia Anderson', capacityState: 'stretched', trend: 'flat', participation: '6/7', notes: 'Sensory sensitivity', capacityHistory: FABRICATED_HISTORIES.mia },
  { id: '2', name: 'Zach', username: '@zach', displayName: 'Zach Teguns', capacityState: 'depleted', trend: 'declining', participation: '7/7', notes: 'Sleep disruption', capacityHistory: FABRICATED_HISTORIES.zach },
  { id: '3', name: 'Lily', username: '@lily', displayName: 'Lily Teguns', capacityState: 'resourced', trend: 'improving', participation: '5/5', notes: 'Steady progress', capacityHistory: FABRICATED_HISTORIES.lily },
  { id: '4', name: 'Tyler', username: '@tyler', displayName: 'Tyler Ramirez', capacityState: 'stretched', trend: 'volatile', participation: '5/5', notes: 'Transition support', capacityHistory: FABRICATED_HISTORIES.tyler },
  { id: '5', name: 'Emma', username: '@emma', displayName: 'Emily Zhang', capacityState: 'depleted', trend: 'declining', participation: '5/5', notes: 'Schedule changes', capacityHistory: FABRICATED_HISTORIES.emma },
];

// =============================================================================
// LEGACY CONVERSION UTILITIES
// =============================================================================

/**
 * Convert legacy 1-3 scale capacity data to 0-100 scale.
 * Used for backward compatibility with old data sources.
 */
export function convertLegacyCapacityData(legacyValues: number[]): number[] {
  return legacyValues.map((v) => ((v - 1) / 2) * 100);
}

/**
 * Get capacity state from 0-100 scale value.
 * Matches lib/charts/types.ts thresholds.
 */
export function getCapacityState(value: number): 'resourced' | 'stretched' | 'depleted' {
  if (value >= 66) return 'resourced';
  if (value >= 33) return 'stretched';
  return 'depleted';
}
