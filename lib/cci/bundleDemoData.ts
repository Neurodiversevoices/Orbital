/**
 * Bundle CCI Demo Data
 *
 * STATIC demo data for bundle CCI preview.
 * No names or PII - avatars only with capacity history.
 *
 * IMPORTANT: Uses STATIC data (like Circle CCI) to ensure
 * Brief (app) and Artifact (PDF) render IDENTICAL charts.
 */

// Avatar color palette for bundle seats (no names, colors identify seats)
export const AVATAR_COLORS = [
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage
  '#FFEAA7', // Soft Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Lavender
  '#85C1E9', // Light Blue
  '#F8B500', // Amber
  '#00CED1', // Dark Cyan
  '#FF7F50', // Coral Orange
  '#9370DB', // Medium Purple
  '#20B2AA', // Light Sea Green
  '#FFB6C1', // Light Pink
  '#87CEEB', // Sky Blue Light
  '#DEB887', // Burlywood
  '#7B68EE', // Medium Slate Blue
  '#48D1CC', // Medium Turquoise
] as const;

// Capacity pattern types for realistic variation
type CapacityPattern = 'stable_high' | 'stable_mid' | 'stable_low' | 'improving' | 'declining' | 'volatile' | 'recovering';

export interface BundleSeatData {
  id: string;
  seatIndex: number;
  avatarColor: string;
  capacityHistory: number[];
  pattern: CapacityPattern;
}

// =============================================================================
// FABRICATED BUNDLE HISTORIES — Static data for deterministic rendering
// 20 unique patterns to support 10, 15, and 20 seat bundles
// Each pattern is visually distinct after downsampling to 6 points
// =============================================================================

export const FABRICATED_BUNDLE_HISTORIES: { data: number[]; pattern: CapacityPattern }[] = [
  // Seat 1: Stable high with slight dip mid-period
  {
    pattern: 'stable_high',
    data: [
      85, 82, 88, 84, 86, 83, 87, 85, 82, 80,
      78, 75, 72, 70, 68, 72, 75, 78, 80, 82,
      85, 88, 86, 84, 82, 80, 78, 82, 85, 88,
      90, 88, 85, 82, 80, 78, 75, 78, 80, 82,
      85, 88, 90, 88, 85, 82, 80, 82, 85, 88,
      90, 92, 90, 88, 85, 82, 80, 82, 85, 88,
      90, 88, 85, 82, 80, 82, 85, 88, 90, 92,
      90, 88, 85, 88, 90, 92, 90, 88, 85, 88,
      90, 92, 95, 92, 90, 88, 85, 88, 90, 88,
    ],
  },
  // Seat 2: Stretched, gradual improvement
  {
    pattern: 'improving',
    data: [
      35, 38, 40, 42, 40, 38, 42, 45, 48, 50,
      48, 45, 48, 50, 52, 55, 52, 50, 55, 58,
      55, 52, 55, 58, 60, 62, 60, 58, 62, 65,
      62, 60, 62, 65, 68, 70, 68, 65, 68, 70,
      72, 70, 68, 70, 72, 75, 72, 70, 72, 75,
      78, 75, 72, 75, 78, 80, 78, 75, 78, 80,
      82, 80, 78, 80, 82, 85, 82, 80, 82, 85,
      88, 85, 82, 85, 88, 90, 88, 85, 88, 90,
      92, 90, 88, 90, 92, 95, 92, 90, 92, 90,
    ],
  },
  // Seat 3: Declining from resourced to stretched
  {
    pattern: 'declining',
    data: [
      92, 90, 88, 85, 88, 90, 85, 82, 80, 78,
      80, 82, 78, 75, 72, 70, 72, 75, 70, 68,
      65, 68, 70, 65, 62, 60, 62, 65, 60, 58,
      55, 58, 60, 55, 52, 50, 52, 55, 50, 48,
      45, 48, 50, 48, 45, 42, 45, 48, 45, 42,
      40, 42, 45, 42, 40, 38, 40, 42, 40, 38,
      35, 38, 40, 38, 35, 38, 40, 38, 35, 38,
      40, 38, 35, 38, 40, 42, 40, 38, 40, 42,
      45, 42, 40, 42, 45, 48, 45, 42, 45, 42,
    ],
  },
  // Seat 4: Volatile - oscillating pattern
  {
    pattern: 'volatile',
    data: [
      55, 40, 70, 35, 75, 45, 60, 30, 80, 40,
      65, 25, 85, 50, 55, 20, 75, 35, 65, 45,
      80, 30, 60, 40, 85, 25, 70, 45, 55, 20,
      75, 35, 65, 50, 80, 25, 60, 40, 85, 30,
      70, 45, 55, 25, 75, 35, 65, 50, 80, 20,
      60, 40, 85, 30, 70, 45, 55, 25, 75, 35,
      65, 50, 80, 20, 60, 40, 85, 30, 70, 45,
      55, 25, 75, 35, 65, 50, 80, 20, 60, 40,
      85, 30, 70, 45, 55, 35, 75, 40, 65, 50,
    ],
  },
  // Seat 5: Depleted, flat low
  {
    pattern: 'stable_low',
    data: [
      25, 22, 28, 20, 25, 22, 28, 25, 20, 22,
      25, 28, 22, 20, 25, 28, 22, 25, 20, 22,
      28, 25, 22, 20, 25, 28, 22, 25, 20, 28,
      25, 22, 28, 20, 25, 22, 28, 25, 20, 22,
      25, 28, 22, 20, 25, 28, 22, 25, 20, 22,
      28, 25, 22, 20, 25, 28, 22, 25, 20, 28,
      25, 22, 28, 20, 25, 22, 28, 25, 20, 22,
      25, 28, 22, 20, 25, 28, 22, 25, 20, 22,
      28, 25, 22, 28, 25, 22, 28, 25, 22, 25,
    ],
  },
  // Seat 6: Recovery arc - crash then gradual improvement
  {
    pattern: 'recovering',
    data: [
      80, 82, 85, 82, 80, 78, 75, 72, 68, 62,
      55, 48, 40, 32, 25, 20, 18, 15, 18, 20,
      22, 25, 28, 30, 32, 35, 38, 40, 42, 45,
      48, 50, 52, 55, 58, 60, 62, 65, 68, 70,
      72, 68, 70, 72, 75, 72, 75, 78, 75, 78,
      80, 78, 80, 82, 80, 82, 85, 82, 85, 88,
      85, 88, 85, 88, 90, 88, 90, 88, 90, 92,
      90, 92, 90, 88, 90, 92, 90, 88, 90, 92,
      90, 88, 90, 92, 90, 88, 90, 88, 90, 88,
    ],
  },
  // Seat 7: Stable stretched range
  {
    pattern: 'stable_mid',
    data: [
      52, 55, 50, 48, 52, 55, 58, 55, 52, 50,
      48, 52, 55, 58, 55, 52, 50, 48, 52, 55,
      58, 55, 52, 50, 48, 52, 55, 58, 55, 52,
      50, 48, 52, 55, 58, 55, 52, 50, 48, 52,
      55, 58, 55, 52, 50, 48, 52, 55, 58, 55,
      52, 50, 48, 52, 55, 58, 55, 52, 50, 48,
      52, 55, 58, 55, 52, 50, 48, 52, 55, 58,
      55, 52, 50, 48, 52, 55, 58, 55, 52, 50,
      48, 52, 55, 58, 55, 52, 50, 52, 55, 52,
    ],
  },
  // Seat 8: Sharp decline mid-period
  {
    pattern: 'declining',
    data: [
      88, 90, 92, 90, 88, 85, 88, 90, 88, 85,
      82, 80, 78, 75, 72, 68, 65, 60, 55, 50,
      45, 40, 35, 30, 28, 25, 22, 20, 18, 15,
      18, 20, 22, 20, 18, 15, 18, 20, 18, 15,
      12, 15, 18, 15, 12, 10, 12, 15, 12, 10,
      8, 10, 12, 10, 8, 10, 12, 10, 8, 10,
      12, 10, 8, 10, 12, 15, 12, 10, 12, 15,
      18, 15, 12, 15, 18, 20, 18, 15, 18, 20,
      22, 20, 18, 20, 22, 25, 22, 20, 22, 20,
    ],
  },
  // Seat 9: Improving from depleted
  {
    pattern: 'improving',
    data: [
      15, 18, 20, 18, 15, 18, 20, 22, 25, 28,
      30, 28, 30, 32, 35, 38, 35, 38, 40, 42,
      45, 42, 45, 48, 50, 52, 50, 52, 55, 58,
      60, 58, 60, 62, 65, 68, 65, 68, 70, 72,
      75, 72, 75, 78, 80, 78, 80, 82, 85, 82,
      85, 88, 85, 88, 90, 88, 90, 92, 90, 88,
      90, 92, 90, 88, 90, 92, 95, 92, 90, 92,
      95, 92, 90, 92, 95, 92, 90, 92, 95, 92,
      90, 92, 95, 92, 90, 88, 90, 92, 90, 88,
    ],
  },
  // Seat 10: High volatile
  {
    pattern: 'volatile',
    data: [
      75, 90, 65, 85, 70, 95, 60, 88, 72, 92,
      68, 85, 75, 90, 62, 88, 70, 95, 65, 85,
      72, 92, 68, 88, 75, 90, 60, 85, 70, 95,
      65, 88, 72, 92, 68, 85, 75, 90, 62, 88,
      70, 95, 65, 85, 72, 92, 68, 88, 75, 90,
      60, 85, 70, 95, 65, 88, 72, 92, 68, 85,
      75, 90, 62, 88, 70, 95, 65, 85, 72, 92,
      68, 88, 75, 90, 60, 85, 70, 95, 65, 88,
      72, 92, 68, 85, 75, 90, 70, 85, 75, 80,
    ],
  },
  // Seat 11: Stable high, slight uptrend
  {
    pattern: 'stable_high',
    data: [
      72, 75, 78, 75, 72, 75, 78, 80, 78, 75,
      78, 80, 82, 80, 78, 80, 82, 85, 82, 80,
      82, 85, 88, 85, 82, 85, 88, 90, 88, 85,
      88, 90, 88, 85, 88, 90, 92, 90, 88, 90,
      92, 90, 88, 90, 92, 95, 92, 90, 92, 95,
      92, 90, 92, 95, 92, 90, 92, 95, 92, 90,
      92, 95, 92, 90, 92, 95, 92, 90, 92, 95,
      92, 90, 92, 95, 92, 90, 92, 95, 92, 90,
      92, 95, 92, 90, 92, 95, 92, 90, 92, 90,
    ],
  },
  // Seat 12: Mid-range with late decline
  {
    pattern: 'declining',
    data: [
      60, 62, 65, 62, 60, 62, 65, 68, 65, 62,
      65, 68, 70, 68, 65, 68, 70, 68, 65, 62,
      60, 58, 55, 52, 50, 48, 45, 42, 40, 38,
      35, 38, 40, 38, 35, 32, 30, 32, 35, 32,
      30, 28, 25, 28, 30, 28, 25, 22, 20, 22,
      25, 22, 20, 18, 15, 18, 20, 18, 15, 18,
      20, 18, 15, 18, 20, 22, 20, 18, 20, 22,
      25, 22, 20, 22, 25, 28, 25, 22, 25, 28,
      30, 28, 25, 28, 30, 32, 30, 28, 30, 28,
    ],
  },
  // Seat 13: Depleted with brief spike
  {
    pattern: 'recovering',
    data: [
      20, 22, 25, 22, 20, 18, 20, 22, 25, 28,
      30, 35, 40, 48, 55, 62, 68, 72, 75, 72,
      68, 62, 55, 48, 40, 35, 30, 28, 25, 22,
      20, 18, 20, 22, 20, 18, 15, 18, 20, 18,
      15, 18, 20, 22, 20, 18, 20, 22, 25, 22,
      20, 22, 25, 28, 25, 22, 25, 28, 30, 28,
      25, 28, 30, 32, 30, 28, 30, 32, 35, 32,
      30, 32, 35, 38, 35, 32, 35, 38, 40, 38,
      35, 38, 40, 42, 40, 38, 40, 42, 40, 38,
    ],
  },
  // Seat 14: Gradual long-term improvement
  {
    pattern: 'improving',
    data: [
      30, 32, 35, 32, 30, 32, 35, 38, 35, 32,
      35, 38, 40, 38, 35, 38, 40, 42, 40, 38,
      40, 42, 45, 42, 40, 42, 45, 48, 45, 42,
      45, 48, 50, 48, 45, 48, 50, 52, 50, 48,
      50, 52, 55, 52, 50, 52, 55, 58, 55, 52,
      55, 58, 60, 58, 55, 58, 60, 62, 60, 58,
      60, 62, 65, 62, 60, 62, 65, 68, 65, 62,
      65, 68, 70, 68, 65, 68, 70, 72, 70, 68,
      70, 72, 75, 72, 70, 72, 75, 72, 70, 72,
    ],
  },
  // Seat 15: Volatile in low range
  {
    pattern: 'volatile',
    data: [
      35, 15, 45, 20, 40, 25, 50, 18, 42, 22,
      48, 15, 38, 28, 45, 20, 35, 25, 48, 18,
      40, 22, 45, 15, 38, 28, 50, 20, 35, 25,
      42, 18, 48, 22, 38, 15, 45, 28, 35, 20,
      40, 25, 50, 18, 42, 22, 48, 15, 38, 28,
      45, 20, 35, 25, 48, 18, 40, 22, 45, 15,
      38, 28, 50, 20, 35, 25, 42, 18, 48, 22,
      38, 15, 45, 28, 35, 20, 40, 25, 50, 18,
      42, 22, 48, 25, 40, 20, 45, 28, 38, 30,
    ],
  },
  // Seat 16: Stable low with late improvement
  {
    pattern: 'improving',
    data: [
      22, 20, 25, 22, 20, 18, 22, 25, 22, 20,
      18, 22, 25, 22, 20, 18, 22, 25, 22, 20,
      22, 25, 28, 25, 22, 25, 28, 30, 28, 25,
      28, 30, 32, 30, 28, 30, 32, 35, 32, 30,
      32, 35, 38, 35, 32, 35, 38, 40, 38, 35,
      38, 40, 42, 40, 38, 40, 42, 45, 42, 40,
      42, 45, 48, 45, 42, 45, 48, 50, 48, 45,
      48, 50, 52, 50, 48, 50, 52, 55, 52, 50,
      52, 55, 58, 55, 52, 55, 58, 55, 52, 55,
    ],
  },
  // Seat 17: High with mid-period crash and recovery
  {
    pattern: 'recovering',
    data: [
      90, 88, 85, 88, 90, 92, 88, 85, 80, 75,
      68, 60, 50, 40, 32, 25, 20, 25, 32, 40,
      48, 55, 62, 68, 72, 75, 78, 80, 82, 85,
      88, 85, 88, 90, 88, 85, 88, 90, 92, 90,
      88, 90, 92, 90, 88, 90, 92, 95, 92, 90,
      92, 95, 92, 90, 92, 95, 92, 90, 92, 95,
      92, 90, 88, 90, 92, 90, 88, 90, 92, 90,
      88, 90, 92, 90, 88, 90, 92, 90, 88, 90,
      92, 90, 88, 90, 92, 90, 88, 90, 88, 90,
    ],
  },
  // Seat 18: Stretched range, flat
  {
    pattern: 'stable_mid',
    data: [
      45, 48, 50, 48, 45, 42, 45, 48, 50, 48,
      45, 42, 45, 48, 50, 48, 45, 42, 45, 48,
      50, 48, 45, 42, 45, 48, 50, 48, 45, 42,
      45, 48, 50, 48, 45, 42, 45, 48, 50, 48,
      45, 42, 45, 48, 50, 48, 45, 42, 45, 48,
      50, 48, 45, 42, 45, 48, 50, 48, 45, 42,
      45, 48, 50, 48, 45, 42, 45, 48, 50, 48,
      45, 42, 45, 48, 50, 48, 45, 42, 45, 48,
      50, 48, 45, 48, 50, 48, 45, 48, 50, 48,
    ],
  },
  // Seat 19: Steady decline from high
  {
    pattern: 'declining',
    data: [
      95, 92, 90, 92, 95, 92, 90, 88, 85, 82,
      80, 82, 85, 82, 80, 78, 75, 72, 70, 72,
      75, 72, 70, 68, 65, 62, 60, 62, 65, 62,
      60, 58, 55, 52, 50, 52, 55, 52, 50, 48,
      45, 42, 40, 42, 45, 42, 40, 38, 35, 32,
      30, 32, 35, 32, 30, 28, 25, 28, 30, 28,
      25, 22, 20, 22, 25, 22, 20, 18, 15, 18,
      20, 18, 15, 12, 10, 12, 15, 12, 10, 12,
      15, 12, 10, 12, 15, 18, 15, 12, 15, 12,
    ],
  },
  // Seat 20: Stable resourced
  {
    pattern: 'stable_high',
    data: [
      78, 80, 82, 80, 78, 80, 82, 85, 82, 80,
      82, 85, 88, 85, 82, 85, 88, 85, 82, 85,
      88, 85, 82, 80, 82, 85, 88, 85, 82, 85,
      88, 90, 88, 85, 88, 90, 88, 85, 88, 90,
      88, 85, 82, 85, 88, 90, 88, 85, 88, 90,
      88, 85, 82, 85, 88, 90, 88, 85, 88, 90,
      88, 85, 82, 85, 88, 90, 88, 85, 88, 90,
      88, 85, 88, 90, 88, 85, 88, 90, 88, 85,
      88, 90, 88, 85, 88, 90, 88, 85, 88, 85,
    ],
  },
];

/**
 * Generate anonymous seat data for a bundle using STATIC data.
 * This ensures Brief (app) and Artifact (PDF) render identical charts.
 *
 * @param count Number of seats (10, 15, or 20)
 * @returns Array of BundleSeatData with deterministic capacity histories
 */
export function generateBundleSeatData(count: 10 | 15 | 20): BundleSeatData[] {
  const seats: BundleSeatData[] = [];

  for (let i = 0; i < count; i++) {
    const historyData = FABRICATED_BUNDLE_HISTORIES[i];

    seats.push({
      id: `seat-${i + 1}`,
      seatIndex: i,
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      capacityHistory: historyData.data,
      pattern: historyData.pattern,
    });
  }

  return seats;
}

/**
 * Calculate aggregate capacity from all seats
 * Returns average capacity history across all seats
 */
export function calculateAggregateCapacity(seats: BundleSeatData[]): number[] {
  if (seats.length === 0) return [];

  const historyLength = seats[0].capacityHistory.length;
  const aggregate: number[] = [];

  for (let day = 0; day < historyLength; day++) {
    const dayTotal = seats.reduce((sum, seat) => sum + seat.capacityHistory[day], 0);
    aggregate.push(Math.round(dayTotal / seats.length));
  }

  return aggregate;
}

/**
 * Get current capacity state for a seat
 */
export function getSeatCapacityState(seat: BundleSeatData): 'resourced' | 'stretched' | 'depleted' {
  const currentValue = seat.capacityHistory[seat.capacityHistory.length - 1];
  if (currentValue >= 66) return 'resourced';
  if (currentValue >= 33) return 'stretched';
  return 'depleted';
}

/**
 * Get aggregate statistics for bundle
 */
export function getBundleStats(seats: BundleSeatData[]): {
  resourcedCount: number;
  stretchedCount: number;
  depletedCount: number;
  averageCapacity: number;
} {
  let resourcedCount = 0;
  let stretchedCount = 0;
  let depletedCount = 0;
  let totalCapacity = 0;

  seats.forEach(seat => {
    const state = getSeatCapacityState(seat);
    if (state === 'resourced') resourcedCount++;
    else if (state === 'stretched') stretchedCount++;
    else depletedCount++;

    totalCapacity += seat.capacityHistory[seat.capacityHistory.length - 1];
  });

  return {
    resourcedCount,
    stretchedCount,
    depletedCount,
    averageCapacity: Math.round(totalCapacity / seats.length),
  };
}
