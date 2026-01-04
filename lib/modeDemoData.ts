/**
 * Mode-Specific Demo Data Generator
 *
 * Generates realistic 14-day demo data for each of the 7 app modes.
 * Each mode has unique patterns, note templates, and variability.
 *
 * Non-negotiables:
 * - Pattern history is NEVER deleted
 * - No raw text sent to analytics
 * - Demo data is isolated and clearly marked
 */

import { CapacityLog, CapacityState, Category, AppMode } from '../types';

// Seeded random for reproducible demo data
class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  reset(seed: number = 12345) {
    this.seed = seed;
  }
}

// Mode-specific patterns
interface ModePattern {
  baselineTarget: number;
  variability: number;
  weekdayDip: number;
  weekendBoost: number;
  morningBoost: number;
  afternoonDip: number;
  stressDay: number; // Day of week (0=Sun, 1=Mon, etc.)
  categoryWeights: Record<Category, number>;
}

const MODE_PATTERNS: Record<AppMode, ModePattern> = {
  personal: {
    baselineTarget: 0.55,
    variability: 0.15,
    weekdayDip: 0.05,
    weekendBoost: 0.1,
    morningBoost: 0.08,
    afternoonDip: 0.12,
    stressDay: 1, // Monday
    categoryWeights: { sensory: 0.3, demand: 0.45, social: 0.25 },
  },
  caregiver: {
    baselineTarget: 0.48,
    variability: 0.18,
    weekdayDip: 0.08,
    weekendBoost: 0.05, // Less weekend boost for caregivers
    morningBoost: 0.05,
    afternoonDip: 0.15,
    stressDay: 3, // Wednesday
    categoryWeights: { sensory: 0.35, demand: 0.4, social: 0.25 },
  },
  employer: {
    baselineTarget: 0.52,
    variability: 0.12,
    weekdayDip: 0.1,
    weekendBoost: 0.15,
    morningBoost: 0.06,
    afternoonDip: 0.1,
    stressDay: 1, // Monday
    categoryWeights: { sensory: 0.2, demand: 0.55, social: 0.25 },
  },
  school_district: {
    baselineTarget: 0.50,
    variability: 0.16,
    weekdayDip: 0.12,
    weekendBoost: 0.18,
    morningBoost: 0.04,
    afternoonDip: 0.18,
    stressDay: 5, // Friday
    categoryWeights: { sensory: 0.4, demand: 0.35, social: 0.25 },
  },
  university: {
    baselineTarget: 0.54,
    variability: 0.2,
    weekdayDip: 0.08,
    weekendBoost: 0.08,
    morningBoost: -0.05, // Students struggle in mornings
    afternoonDip: 0.08,
    stressDay: 4, // Thursday (before Friday deadlines)
    categoryWeights: { sensory: 0.25, demand: 0.5, social: 0.25 },
  },
  healthcare: {
    baselineTarget: 0.45,
    variability: 0.2,
    weekdayDip: 0.05,
    weekendBoost: 0.02, // Healthcare works weekends too
    morningBoost: 0.1,
    afternoonDip: 0.15,
    stressDay: 2, // Tuesday (post-weekend surge)
    categoryWeights: { sensory: 0.35, demand: 0.45, social: 0.2 },
  },
  demo: {
    baselineTarget: 0.58,
    variability: 0.18,
    weekdayDip: 0.06,
    weekendBoost: 0.12,
    morningBoost: 0.08,
    afternoonDip: 0.1,
    stressDay: 1,
    categoryWeights: { sensory: 0.33, demand: 0.34, social: 0.33 },
  },
};

// Mode-specific note templates
const MODE_NOTES: Record<AppMode, Record<CapacityState, string[]>> = {
  personal: {
    resourced: [
      'Good sleep, feeling centered.',
      'Morning routine on point.',
      'Post-workout clarity.',
      'Quiet afternoon reset.',
    ],
    stretched: [
      'Back-to-back meetings.',
      'Decision fatigue setting in.',
      'Need to pace myself.',
      'Running on reserves.',
    ],
    depleted: [
      'System overload.',
      'Need recovery time.',
      'Shutting down non-essentials.',
      'Rest is the priority.',
    ],
  },
  caregiver: {
    resourced: [
      'Kids had a good morning.',
      'Family time was restorative.',
      'Got some help today.',
      'Quiet moment to myself.',
    ],
    stretched: [
      'Managing multiple schedules.',
      'No break in the day.',
      'Emotional labor adding up.',
      'Need respite soon.',
    ],
    depleted: [
      'Too many needs at once.',
      'Haven\'t slept enough.',
      'Feeling overwhelmed.',
      'Need support.',
    ],
  },
  employer: {
    resourced: [
      'Team meeting went well.',
      'Made progress on goals.',
      'Good collaboration today.',
      'Manageable workload.',
    ],
    stretched: [
      'Deadline pressure building.',
      'Too many priorities.',
      'Meetings consuming the day.',
      'Need focus time.',
    ],
    depleted: [
      'Burnout signals.',
      'Work-life balance off.',
      'Need time off.',
      'Capacity exceeded.',
    ],
  },
  school_district: {
    resourced: [
      'Students engaged today.',
      'Prep time available.',
      'Supportive colleagues.',
      'Manageable class size.',
    ],
    stretched: [
      'Classroom management intensive.',
      'Documentation piling up.',
      'No planning period today.',
      'Parent communications heavy.',
    ],
    depleted: [
      'Behavior challenges all day.',
      'Too many IEP meetings.',
      'No support available.',
      'Need mental health day.',
    ],
  },
  university: {
    resourced: [
      'Assignment submitted early.',
      'Study group helped.',
      'Balanced schedule today.',
      'Got enough sleep.',
    ],
    stretched: [
      'Midterms approaching.',
      'Multiple papers due.',
      'Part-time job exhausting.',
      'Need study breaks.',
    ],
    depleted: [
      'All-nighter caught up.',
      'Overwhelmed with deadlines.',
      'Anxiety affecting focus.',
      'Need extension.',
    ],
  },
  healthcare: {
    resourced: [
      'Shift was manageable.',
      'Team coverage adequate.',
      'Patient outcomes good.',
      'Got breaks today.',
    ],
    stretched: [
      'High patient volume.',
      'Short-staffed again.',
      'Emotional cases today.',
      'Running behind all day.',
    ],
    depleted: [
      'Double shift aftermath.',
      'Critical care burnout.',
      'Need time off urgently.',
      'Compassion fatigue.',
    ],
  },
  demo: {
    resourced: [
      'Demonstrating high capacity.',
      'Sample positive day.',
      'Example of resourced state.',
      'Demo wellness data.',
    ],
    stretched: [
      'Sample moderate load.',
      'Demo stretched state.',
      'Example work pressure.',
      'Simulated busy period.',
    ],
    depleted: [
      'Demo depleted state.',
      'Sample low capacity.',
      'Example overload scenario.',
      'Simulated burnout.',
    ],
  },
};

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate demo data for a specific mode
 * @param mode The app mode to generate data for
 * @param days Number of days of data (default 14)
 * @param seed Random seed for reproducibility
 */
export function generateModeDemoData(
  mode: AppMode,
  days: number = 14,
  seed: number = 42
): CapacityLog[] {
  const rng = new SeededRandom(seed + mode.length * 1000);
  const pattern = MODE_PATTERNS[mode];
  const notes = MODE_NOTES[mode];
  const logs: CapacityLog[] = [];
  const now = Date.now();

  // Coverage rate (85% of days have a signal)
  const COVERAGE_RATE = 0.85;

  for (let day = 0; day < days; day++) {
    // Skip some days randomly
    if (rng.next() > COVERAGE_RATE) {
      continue;
    }

    // Calculate base capacity for this day
    let capacity = pattern.baselineTarget;

    // Time of day effects
    const timeSlot = rng.next();
    let hour: number;
    if (timeSlot < 0.3) {
      hour = 8 + Math.floor(rng.next() * 4); // Morning
      capacity += pattern.morningBoost;
    } else if (timeSlot < 0.7) {
      hour = 12 + Math.floor(rng.next() * 6); // Afternoon
      capacity -= pattern.afternoonDip;
    } else {
      hour = 18 + Math.floor(rng.next() * 4); // Evening
    }

    // Day of week effects
    const entryDate = new Date(now);
    entryDate.setDate(entryDate.getDate() - day);
    const dayOfWeek = entryDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      capacity += pattern.weekendBoost;
    } else {
      capacity -= pattern.weekdayDip;
    }

    // Stress day effect
    if (dayOfWeek === pattern.stressDay) {
      capacity -= 0.15;
    }

    // Add variability
    capacity += (rng.next() - 0.5) * pattern.variability * 2;
    capacity = Math.max(0.1, Math.min(0.95, capacity));

    // Determine state
    let state: CapacityState;
    if (capacity > 0.6) state = 'resourced';
    else if (capacity > 0.35) state = 'stretched';
    else state = 'depleted';

    // Pick category based on weights
    let category: Category;
    const catRoll = rng.next();
    if (catRoll < pattern.categoryWeights.sensory) {
      category = 'sensory';
    } else if (catRoll < pattern.categoryWeights.sensory + pattern.categoryWeights.demand) {
      category = 'demand';
    } else {
      category = 'social';
    }

    // Pick note
    const stateNotes = notes[state];
    const note = stateNotes[Math.floor(rng.next() * stateNotes.length)];

    // Calculate timestamp
    const minute = Math.floor(rng.next() * 60);
    entryDate.setHours(hour, minute, 0, 0);
    const timestamp = entryDate.getTime();

    // Skip future entries
    if (timestamp > now) continue;

    logs.push({
      id: generateId(),
      state,
      timestamp,
      tags: [category],
      category,
      note,
      localDate: entryDate.toISOString().split('T')[0],
    });
  }

  // Sort newest first
  logs.sort((a, b) => b.timestamp - a.timestamp);

  return logs;
}

/**
 * Generate aggregate demo data for institutional modes
 * Used for team/staff/student insights panels
 */
export interface AggregateDemoData {
  participantCount: number;
  avgCapacity: number;
  trend: 'up' | 'down' | 'stable';
  topDriver: Category;
  depletedPercentage: number;
  weeklySignals: number;
}

export function generateAggregateData(mode: AppMode, seed: number = 42): AggregateDemoData {
  const rng = new SeededRandom(seed + mode.length * 500);
  const pattern = MODE_PATTERNS[mode];

  const participantCount = Math.floor(30 + rng.next() * 70);
  const avgCapacity = Math.round(pattern.baselineTarget * 100 + (rng.next() - 0.5) * 20);

  const trendRoll = rng.next();
  const trend = trendRoll < 0.33 ? 'up' : trendRoll < 0.66 ? 'stable' : 'down';

  const categories: Category[] = ['sensory', 'demand', 'social'];
  const topDriver = categories.sort((a, b) =>
    pattern.categoryWeights[b] - pattern.categoryWeights[a]
  )[0];

  const depletedPercentage = Math.round((1 - pattern.baselineTarget) * 30 + rng.next() * 15);
  const weeklySignals = Math.floor(participantCount * 5 + rng.next() * participantCount * 2);

  return {
    participantCount,
    avgCapacity,
    trend,
    topDriver,
    depletedPercentage,
    weeklySignals,
  };
}
