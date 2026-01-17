/**
 * Shared CCI Demo Data
 *
 * Single source of truth for fabricated capacity histories.
 * Used by both the app (brief.tsx) and artifact generator (artifact.ts).
 */

// =============================================================================
// FABRICATED DEMO DATA — Simulating years of real user tracking
// =============================================================================

// Fabricate realistic 90-day capacity pattern for demo
// These patterns simulate what real users would see after months/years of tracking
export const FABRICATED_HISTORIES: Record<string, number[]> = {
  // Mia: Stable in stretched range with some good days
  mia: [
    2.1, 2.0, 1.9, 2.0, 2.2, 2.3, 2.1, 2.0, 1.8, 1.9,
    2.0, 2.1, 2.2, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8,
    1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 2.0, 1.9, 2.0, 2.1,
    2.0, 1.9, 1.8, 1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 1.9,
    2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.9,
    2.0, 2.1, 2.2, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9,
    1.8, 1.9, 2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.2, 2.1,
    2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.9, 2.0, 2.1,
    2.0, 1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 1.9, 2.0, 2.0,
  ],
  // Zach: Clear declining pattern - started resourced, now in sentinel range
  zach: [
    2.8, 2.7, 2.8, 2.6, 2.7, 2.5, 2.6, 2.4, 2.5, 2.3,
    2.4, 2.3, 2.2, 2.3, 2.1, 2.2, 2.0, 2.1, 2.0, 1.9,
    2.0, 1.9, 1.8, 1.9, 1.8, 1.7, 1.8, 1.7, 1.6, 1.7,
    1.6, 1.7, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5, 1.4, 1.5,
    1.4, 1.5, 1.4, 1.5, 1.4, 1.3, 1.4, 1.3, 1.4, 1.3,
    1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.3, 1.4, 1.3,
    1.2, 1.3, 1.2, 1.3, 1.2, 1.3, 1.2, 1.1, 1.2, 1.3,
    1.2, 1.1, 1.2, 1.3, 1.2, 1.1, 1.2, 1.1, 1.2, 1.1,
    1.2, 1.1, 1.2, 1.1, 1.0, 1.1, 1.2, 1.1, 1.0, 1.1,
  ],
  // Lily: Improving pattern - started low, now resourced
  lily: [
    1.4, 1.5, 1.4, 1.5, 1.6, 1.5, 1.6, 1.7, 1.6, 1.7,
    1.8, 1.7, 1.8, 1.9, 1.8, 1.9, 2.0, 1.9, 2.0, 2.1,
    2.0, 2.1, 2.2, 2.1, 2.2, 2.3, 2.2, 2.3, 2.4, 2.3,
    2.4, 2.3, 2.4, 2.5, 2.4, 2.5, 2.4, 2.5, 2.6, 2.5,
    2.6, 2.5, 2.6, 2.5, 2.6, 2.7, 2.6, 2.7, 2.6, 2.7,
    2.6, 2.7, 2.8, 2.7, 2.8, 2.7, 2.8, 2.7, 2.8, 2.9,
    2.8, 2.7, 2.8, 2.9, 2.8, 2.7, 2.8, 2.9, 2.8, 2.9,
    2.8, 2.9, 2.8, 2.9, 2.8, 2.9, 3.0, 2.9, 2.8, 2.9,
    3.0, 2.9, 2.8, 2.9, 3.0, 2.9, 2.8, 2.9, 3.0, 2.9,
  ],
  // Tyler: Volatile pattern - unpredictable swings
  tyler: [
    2.2, 1.8, 2.4, 1.6, 2.6, 1.9, 2.1, 1.4, 2.5, 1.7,
    2.3, 1.5, 2.7, 1.8, 2.0, 1.3, 2.4, 1.6, 2.2, 1.9,
    2.5, 1.4, 2.1, 1.7, 2.6, 1.5, 2.3, 1.8, 2.0, 1.4,
    2.4, 1.6, 2.2, 1.9, 2.5, 1.3, 2.1, 1.7, 2.6, 1.5,
    2.3, 1.8, 2.0, 1.4, 2.4, 1.6, 2.2, 1.9, 2.5, 1.3,
    2.1, 1.7, 2.6, 1.5, 2.3, 1.8, 2.0, 1.4, 2.4, 1.6,
    2.2, 1.9, 2.5, 1.3, 2.1, 1.7, 2.6, 1.5, 2.3, 1.8,
    2.0, 1.4, 2.4, 1.6, 2.2, 1.9, 2.5, 1.3, 2.1, 1.7,
    2.6, 1.5, 2.3, 1.8, 2.0, 1.4, 2.4, 1.6, 2.2, 1.8,
  ],
  // Emma: Gradual decline with recent dip
  emma: [
    2.6, 2.5, 2.6, 2.5, 2.4, 2.5, 2.4, 2.3, 2.4, 2.3,
    2.4, 2.3, 2.2, 2.3, 2.2, 2.3, 2.2, 2.1, 2.2, 2.1,
    2.2, 2.1, 2.0, 2.1, 2.0, 2.1, 2.0, 1.9, 2.0, 1.9,
    2.0, 1.9, 2.0, 1.9, 1.8, 1.9, 1.8, 1.9, 1.8, 1.7,
    1.8, 1.7, 1.8, 1.7, 1.8, 1.7, 1.6, 1.7, 1.6, 1.7,
    1.6, 1.7, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5,
    1.4, 1.5, 1.4, 1.5, 1.4, 1.5, 1.4, 1.3, 1.4, 1.3,
    1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.3, 1.2, 1.3,
    1.2, 1.1, 1.2, 1.1, 1.2, 1.1, 1.2, 1.1, 1.2, 1.2,
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
