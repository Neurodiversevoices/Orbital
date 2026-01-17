/**
 * Bundle CCI Demo Data
 *
 * Generates anonymous seat data for bundle CCI preview.
 * No names or PII - avatars only with capacity history.
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

/**
 * Generate a 90-day capacity history based on pattern type
 */
function generateCapacityHistory(pattern: CapacityPattern): number[] {
  const history: number[] = [];

  switch (pattern) {
    case 'stable_high':
      // Consistently resourced (70-90)
      for (let i = 0; i < 90; i++) {
        history.push(70 + Math.random() * 20);
      }
      break;

    case 'stable_mid':
      // Consistently stretched (40-60)
      for (let i = 0; i < 90; i++) {
        history.push(40 + Math.random() * 20);
      }
      break;

    case 'stable_low':
      // Consistently depleted (15-35)
      for (let i = 0; i < 90; i++) {
        history.push(15 + Math.random() * 20);
      }
      break;

    case 'improving':
      // Trend from depleted to resourced
      for (let i = 0; i < 90; i++) {
        const base = 20 + (i / 90) * 60;
        history.push(Math.min(95, Math.max(5, base + (Math.random() - 0.5) * 15)));
      }
      break;

    case 'declining':
      // Trend from resourced to stretched
      for (let i = 0; i < 90; i++) {
        const base = 85 - (i / 90) * 40;
        history.push(Math.min(95, Math.max(5, base + (Math.random() - 0.5) * 15)));
      }
      break;

    case 'volatile':
      // Oscillating between states
      for (let i = 0; i < 90; i++) {
        const wave = Math.sin(i * 0.15) * 30;
        history.push(Math.min(95, Math.max(5, 50 + wave + (Math.random() - 0.5) * 10)));
      }
      break;

    case 'recovering':
      // Sharp drop then gradual recovery
      for (let i = 0; i < 90; i++) {
        let value: number;
        if (i < 20) {
          // Initial stable high
          value = 75 + Math.random() * 10;
        } else if (i < 35) {
          // Sharp decline
          value = 75 - ((i - 20) / 15) * 50;
        } else {
          // Gradual recovery
          value = 25 + ((i - 35) / 55) * 50;
        }
        history.push(Math.min(95, Math.max(5, value + (Math.random() - 0.5) * 8)));
      }
      break;
  }

  return history.map(v => Math.round(v));
}

/**
 * Pattern distribution for realistic bundle composition
 */
const PATTERN_DISTRIBUTION: CapacityPattern[] = [
  'stable_high', 'stable_high', 'stable_high',  // 30% resourced
  'stable_mid', 'stable_mid',                    // 20% stretched
  'stable_low',                                   // 10% depleted
  'improving', 'improving',                       // 20% improving
  'declining',                                    // 10% declining
  'volatile',                                     // 10% volatile
];

/**
 * Generate anonymous seat data for a bundle
 * @param count Number of seats (10, 15, or 20)
 * @returns Array of BundleSeatData without names
 */
export function generateBundleSeatData(count: 10 | 15 | 20): BundleSeatData[] {
  const seats: BundleSeatData[] = [];

  for (let i = 0; i < count; i++) {
    // Deterministic pattern selection based on seat index for consistency
    const patternIndex = i % PATTERN_DISTRIBUTION.length;
    const pattern = PATTERN_DISTRIBUTION[patternIndex];

    seats.push({
      id: `seat-${i + 1}`,
      seatIndex: i,
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      capacityHistory: generateCapacityHistory(pattern),
      pattern,
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
