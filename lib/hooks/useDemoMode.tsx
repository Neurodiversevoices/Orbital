/**
 * Orbital Demo Mode Hook
 *
 * Provides isolated demo data mode for screenshots, demos, and testing.
 * Never touches real user data. Works completely offline.
 *
 * FOUNDER-ONLY: Demo mode is gated behind EXPO_PUBLIC_FOUNDER_DEMO=1
 * Normal users cannot see, enable, or trigger demo data generation.
 *
 * Usage:
 *   const { isDemoMode, enableDemoMode, disableDemoMode, reseedDemoData } = useDemoMode();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../storage';
import {
  CapacityLog,
  CapacityState,
  Category,
  ShareRecipient,
  ShareConfig,
  AuditEntry,
} from '../../types';

// =============================================================================
// FOUNDER-ONLY GATE
// Demo mode is ONLY available when EXPO_PUBLIC_FOUNDER_DEMO=1
// In production builds, this is unset → demo entry points do not render
// =============================================================================
export const FOUNDER_DEMO_ENABLED = process.env.EXPO_PUBLIC_FOUNDER_DEMO === '1';

/**
 * HARD EXECUTION GUARD — Engine-level protection
 * Call at top of every demo function to prevent execution in production.
 * Throws if demo functions are called without FOUNDER_DEMO_ENABLED=true.
 */
function assertFounderDemo(operation: string): void {
  if (!FOUNDER_DEMO_ENABLED) {
    const error = new Error(`[DemoMode] BLOCKED: ${operation} called without FOUNDER_DEMO_ENABLED`);
    if (__DEV__) {
      console.error(error.message);
    }
    throw error;
  }
}

export type DemoDuration = '30d' | '90d' | '180d' | '365d' | '3y' | '5y' | '10y';

/**
 * Check if a log ID is demo data (starts with 'demo-')
 * Used by cloud sync to block demo data from entering outbox.
 */
export function isDemoLogId(logId: string): boolean {
  return logId.startsWith('demo-');
}

interface DemoModeContextType {
  isDemoMode: boolean;
  isLoading: boolean;
  isFounderDemo: boolean; // True only when EXPO_PUBLIC_FOUNDER_DEMO=1
  enableDemoMode: (duration?: DemoDuration) => Promise<void>;
  disableDemoMode: () => Promise<void>;
  reseedDemoData: (duration?: DemoDuration) => Promise<void>;
  clearDemoData: () => Promise<void>;
  advancedUnlocked: boolean;
  recordLogoTap: () => boolean; // Returns true if demo mode should be toggled
}

const DemoModeContext = createContext<DemoModeContextType | null>(null);

interface DemoModeProviderProps {
  children: ReactNode;
}

// Seeded random for consistent demo data
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

const rng = new SeededRandom();

// Multi-year longitudinal demo patterns
// Designed for institutional credibility: medical record / therapist notes feel
const DEMO_PATTERNS = {
  // Starting baseline (year 0) - slightly below center
  baselineStart: 0.48,

  // Structural drift: gradual improvement over years (1.5% per year)
  yearlyImprovement: 0.015,

  // Seasonal modulation amplitude (capacity lower Nov-Feb, higher May-Aug)
  seasonalAmplitude: 0.08,

  // Day-of-week effects (consistent signature across all years)
  dayOfWeekEffects: {
    0: 0.06,   // Sunday: slightly higher
    1: -0.10,  // Monday: notably harder
    2: -0.03,  // Tuesday: slightly harder
    3: 0.0,    // Wednesday: neutral
    4: 0.02,   // Thursday: slightly better
    5: 0.05,   // Friday: better
    6: 0.07,   // Saturday: higher
  } as Record<number, number>,

  // Time-of-day effects
  timeOfDayEffects: {
    earlyMorning: -0.08,  // before 7am
    morning: 0.06,        // 7-10am
    midday: 0.0,          // 10am-1pm
    afternoon: -0.10,     // 1-5pm (post-lunch dip)
    evening: -0.05,       // 5-9pm
    night: -0.08,         // after 9pm
  },

  // Category correlations (which drivers appear with depleted states)
  categoryCorrelations: {
    sensory: 0.35,
    demand: 0.45,
    social: 0.20,
  },
};

// Generate major crisis events for multi-year records
// Returns array of { startDay, duration, severity } for crisis periods
function generateCrisisEvents(totalDays: number): Array<{ startDay: number; duration: number; severity: number }> {
  const events: Array<{ startDay: number; duration: number; severity: number }> = [];

  // Major crisis every 400-550 days (roughly 12-18 months)
  // Plus smaller quarterly dips
  let lastMajorCrisis = 0;

  for (let day = 30; day < totalDays; day++) {
    const daysSinceLastMajor = day - lastMajorCrisis;

    // Major crisis check (every 400-550 days)
    if (daysSinceLastMajor > 400 && daysSinceLastMajor < 550) {
      // 30% chance per day in this window to start a major crisis
      const hash = (day * 31337) % 100;
      if (hash < 30 && events.filter(e => e.startDay > day - 100).length === 0) {
        events.push({
          startDay: day,
          duration: 12 + (hash % 10), // 12-21 days
          severity: 0.25 + (hash % 15) / 100, // 0.25-0.40 severity
        });
        lastMajorCrisis = day;
        day += 60; // Skip ahead to avoid clustering
        continue;
      }
    }

    // Smaller quarterly dips (every 80-100 days, less severe)
    if (day % 90 > 85 && day % 90 < 95) {
      const hash = (day * 7919) % 100;
      if (hash < 40 && events.filter(e => Math.abs(e.startDay - day) < 30).length === 0) {
        events.push({
          startDay: day,
          duration: 5 + (hash % 5), // 5-9 days
          severity: 0.12 + (hash % 10) / 100, // 0.12-0.22 severity
        });
      }
    }
  }

  return events;
}

// Generate stability plateaus (periods of reduced volatility)
function isInPlateau(dayOffset: number, totalDays: number): boolean {
  // Create plateaus roughly every 200-300 days, lasting 60-120 days
  const cyclePosition = dayOffset % 250;
  return cyclePosition > 80 && cyclePosition < 180;
}

// Premium note templates (polished for screenshots)
const premiumNotes = {
  resourced: [
    'Morning routine complete. Feeling centered.',
    'Good night of sleep, solid start to the day.',
    'Meditation session helped reset capacity.',
    'Post-workout clarity. Energy levels good.',
    'Quiet afternoon, recharged.',
    'Managed boundaries well today.',
    'Work-life balance on point.',
    'Creative flow state this morning.',
  ],
  stretched: [
    'Back-to-back meetings taking a toll.',
    'Pushing through afternoon slump.',
    'Need to pace myself this week.',
    'Noticing early fatigue signals.',
    'Managing but monitoring closely.',
    'Sensory load building up.',
    'Decision fatigue setting in.',
    'Running on reserves.',
  ],
  depleted: [
    'System overload. Need recovery time.',
    'Hit capacity wall mid-afternoon.',
    'Too many demands converging.',
    'Shutting down non-essentials.',
    'Rest is the only priority now.',
    'Overwhelm from accumulated stress.',
    'Capacity depleted. Stepping back.',
    'Need quiet and minimal input.',
  ],
};

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Multi-year capacity calculation with longitudinal patterns
function getCapacityForDayMultiYear(
  dayOffset: number,
  hourOfDay: number,
  totalDays: number,
  crisisEvents: Array<{ startDay: number; duration: number; severity: number }>
): { state: CapacityState; value: number } {
  const entryDate = new Date(Date.now() - dayOffset * 86400000);
  const dayOfWeek = entryDate.getDay();
  const month = entryDate.getMonth(); // 0-11
  const yearsAgo = dayOffset / 365;

  // 1. Start with baseline + structural improvement over years
  let capacity = DEMO_PATTERNS.baselineStart + (yearsAgo * DEMO_PATTERNS.yearlyImprovement);

  // 2. Seasonal modulation (Nov-Feb lower, May-Aug higher)
  // Using cosine wave centered on February (month 1) as the low point
  const seasonalPhase = ((month + 1) / 12) * 2 * Math.PI; // Offset so Feb is trough
  const seasonalEffect = Math.cos(seasonalPhase) * DEMO_PATTERNS.seasonalAmplitude;
  capacity += seasonalEffect;

  // 3. Day-of-week effects (consistent signature across years)
  capacity += DEMO_PATTERNS.dayOfWeekEffects[dayOfWeek] || 0;

  // 4. Time-of-day effects
  if (hourOfDay < 7) {
    capacity += DEMO_PATTERNS.timeOfDayEffects.earlyMorning;
  } else if (hourOfDay < 10) {
    capacity += DEMO_PATTERNS.timeOfDayEffects.morning;
  } else if (hourOfDay < 13) {
    capacity += DEMO_PATTERNS.timeOfDayEffects.midday;
  } else if (hourOfDay < 17) {
    capacity += DEMO_PATTERNS.timeOfDayEffects.afternoon;
  } else if (hourOfDay < 21) {
    capacity += DEMO_PATTERNS.timeOfDayEffects.evening;
  } else {
    capacity += DEMO_PATTERNS.timeOfDayEffects.night;
  }

  // 5. Crisis events (major and minor)
  for (const crisis of crisisEvents) {
    if (dayOffset >= crisis.startDay && dayOffset < crisis.startDay + crisis.duration) {
      // Within crisis: sine wave for natural rise/fall
      const crisisProgress = (dayOffset - crisis.startDay) / crisis.duration;
      const crisisDepth = Math.sin(crisisProgress * Math.PI) * crisis.severity;
      capacity -= crisisDepth;
    } else if (dayOffset >= crisis.startDay + crisis.duration && dayOffset < crisis.startDay + crisis.duration + 14) {
      // Recovery period: gradual return (14 days post-crisis)
      const recoveryProgress = (dayOffset - crisis.startDay - crisis.duration) / 14;
      capacity -= crisis.severity * 0.3 * (1 - recoveryProgress); // Lingering 30% effect
    }
  }

  // 6. Plateau effect: reduced volatility during stable periods
  const inPlateau = isInPlateau(dayOffset, totalDays);

  // 7. Controlled randomness (less during plateaus)
  const volatility = inPlateau ? 0.06 : 0.12;
  capacity += (rng.next() - 0.5) * volatility;

  // Clamp to valid range
  capacity = Math.max(0.08, Math.min(0.92, capacity));

  // Determine state
  let state: CapacityState;
  if (capacity > 0.58) state = 'resourced';
  else if (capacity > 0.32) state = 'stretched';
  else state = 'depleted';

  return { state, value: capacity };
}

function pickCategory(state: CapacityState): Category[] {
  const categories: Category[] = [];

  if (state === 'depleted') {
    // Use correlation weights for depleted states
    if (rng.next() < DEMO_PATTERNS.categoryCorrelations.demand) categories.push('demand');
    if (rng.next() < DEMO_PATTERNS.categoryCorrelations.sensory) categories.push('sensory');
    if (rng.next() < DEMO_PATTERNS.categoryCorrelations.social) categories.push('social');
  } else {
    // Random distribution for other states
    const rand = rng.next();
    if (rand < 0.33) categories.push('sensory');
    else if (rand < 0.66) categories.push('demand');
    else categories.push('social');
  }

  // Ensure at least one category
  if (categories.length === 0) {
    categories.push('demand');
  }

  return categories;
}

function pickNote(state: CapacityState): string {
  const notes = premiumNotes[state];
  return notes[Math.floor(rng.next() * notes.length)];
}

async function generatePremiumDemoData(duration: DemoDuration = '10y'): Promise<{
  logs: CapacityLog[];
  recipients: ShareRecipient[];
  shares: ShareConfig[];
  audit: AuditEntry[];
}> {
  // HARD GUARD: Block demo data generation in production
  assertFounderDemo('generatePremiumDemoData');

  rng.reset(42); // Consistent seed for reproducible data

  const logs: CapacityLog[] = [];
  const now = Date.now();

  // Calculate midnight of today ONCE (for consistent timestamp calculation)
  const midnightDate = new Date(now);
  midnightDate.setHours(0, 0, 0, 0);
  const midnightToday = midnightDate.getTime();

  // Map duration to days (expanded for multi-year support)
  const durationDays: Record<DemoDuration, number> = {
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '365d': 365,
    '3y': 1095,   // 3 years
    '5y': 1825,   // 5 years
    '10y': 3650,  // 10 years
  };
  const totalDays = durationDays[duration];

  // Generate crisis events for the entire duration
  const crisisEvents = generateCrisisEvents(totalDays);

  // Coverage rate varies slightly by era (more consistent in recent years)
  // This creates a natural "record matured over time" feel
  const getBaseCoverage = (dayOffset: number): number => {
    const yearsAgo = dayOffset / 365;
    if (yearsAgo > 7) return 0.75; // Older records: 75% coverage
    if (yearsAgo > 4) return 0.80; // Mid-era: 80% coverage
    if (yearsAgo > 2) return 0.85; // Recent years: 85% coverage
    return 0.88; // Most recent: 88% coverage
  };

  for (let day = 0; day < totalDays; day++) {
    const coverage = getBaseCoverage(day);

    // ALWAYS include entries for first 365 days (guarantees 1-year view has data on every day)
    // Skip some days randomly for older data to simulate natural gaps
    if (day >= 365 && rng.next() > coverage) {
      continue;
    }

    // Generate 2-4 entries per day at different times (morning, afternoon, evening)
    const entriesPerDay = 2 + Math.floor(rng.next() * 3); // 2, 3, or 4 entries
    const currentHour = new Date(now).getHours();

    // Time slots: morning (7-10), midday (11-14), afternoon (15-17), evening (18-21)
    const timeSlots = [
      { start: 7, end: 10 },   // morning
      { start: 11, end: 14 },  // midday
      { start: 15, end: 17 },  // afternoon
      { start: 18, end: 21 },  // evening
    ];

    // Shuffle and pick slots for this day's entries
    const shuffledSlots = timeSlots.sort(() => rng.next() - 0.5).slice(0, entriesPerDay);

    for (let entryIndex = 0; entryIndex < entriesPerDay; entryIndex++) {
      const slot = shuffledSlots[entryIndex] || timeSlots[entryIndex % timeSlots.length];
      let hour: number;
      let minute: number = Math.floor(rng.next() * 60);

      if (day === 0) {
        // For today: only create entries for times that have passed
        const maxHour = Math.max(0, currentHour - 1);
        if (slot.start > maxHour) continue; // Skip future time slots
        hour = slot.start + Math.floor(rng.next() * Math.min(slot.end - slot.start, maxHour - slot.start + 1));
        hour = Math.min(hour, maxHour);
      } else {
        hour = slot.start + Math.floor(rng.next() * (slot.end - slot.start));
      }

      // Calculate timestamp: midnight of (day days ago) + hour/minute offset
      let timestamp = midnightToday - (day * 86400000) + (hour * 3600000) + (minute * 60000);

      // Ensure timestamp is never in the future
      if (timestamp > now) {
        continue; // Skip this entry if it would be in the future
      }

      // Use multi-year pattern generator (state can vary within a day)
      const { state } = getCapacityForDayMultiYear(day, hour, totalDays, crisisEvents);
      const categories = pickCategory(state);
      const note = pickNote(state);

      logs.push({
        id: generateId(),
        state,
        timestamp,
        tags: categories,
        category: categories[0],
        note,
      });
    }
  }

  // Sort newest first
  logs.sort((a, b) => b.timestamp - a.timestamp);

  // Debug: log the timestamp range
  if (__DEV__ && logs.length > 0) {
    const oldestLog = logs[logs.length - 1];
    const newestLog = logs[0];
    const oldestDaysAgo = Math.round((now - oldestLog.timestamp) / 86400000);
    const newestDaysAgo = Math.round((now - newestLog.timestamp) / 86400000);
    console.log(`[DemoData] Generated ${logs.length} logs spanning ${oldestDaysAgo}d to ${newestDaysAgo}d ago (totalDays=${totalDays})`);
  }

  // Create one fake shared recipient (for demo purposes)
  const recipients: ShareRecipient[] = [
    {
      id: 'demo-recipient-1',
      name: 'Dr. Martinez',
      role: 'clinician',
      createdAt: now - (30 * 86400000), // 30 days ago
    },
  ];

  // Create one fake share config (expired)
  const shares: ShareConfig[] = [
    {
      id: 'demo-share-1',
      recipientId: 'demo-recipient-1',
      expiresAt: now - (7 * 86400000), // Expired 7 days ago
      createdAt: now - (21 * 86400000), // Created 21 days ago
      accessToken: 'demo-token-expired',
      isActive: false,
    },
  ];

  // Create audit entries
  const audit: AuditEntry[] = [
    {
      id: 'demo-audit-1',
      action: 'share_created',
      timestamp: now - (21 * 86400000),
      recipientId: 'demo-recipient-1',
      recipientName: 'Dr. Martinez',
      details: '14 days',
    },
    {
      id: 'demo-audit-2',
      action: 'share_accessed',
      timestamp: now - (20 * 86400000),
      recipientId: 'demo-recipient-1',
      recipientName: 'Dr. Martinez',
    },
    {
      id: 'demo-audit-3',
      action: 'share_expired',
      timestamp: now - (7 * 86400000),
      recipientId: 'demo-recipient-1',
      recipientName: 'Dr. Martinez',
    },
    {
      id: 'demo-audit-4',
      action: 'export_generated',
      timestamp: now - (14 * 86400000),
      details: '90-day summary',
    },
  ];

  return { logs, recipients, shares, audit };
}

export function DemoModeProvider({ children }: DemoModeProviderProps) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [advancedUnlocked, setAdvancedUnlocked] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Load demo mode state on mount
  useEffect(() => {
    const loadDemoState = async () => {
      try {
        const enabled = await AsyncStorage.getItem(STORAGE_KEYS.DEMO_MODE_ENABLED);
        setIsDemoMode(enabled === 'true');

        // Check if advanced was previously unlocked
        const unlocked = await AsyncStorage.getItem('@orbital:advanced_unlocked');
        setAdvancedUnlocked(unlocked === 'true');
      } catch (error) {
        if (__DEV__) console.error('[DemoMode] Failed to load state:', error);
      }
      setIsLoading(false);
    };
    loadDemoState();
  }, []);

  // Backup real data before enabling demo mode
  const backupRealData = useCallback(async () => {
    try {
      const logs = await AsyncStorage.getItem(STORAGE_KEYS.LOGS);
      const recipients = await AsyncStorage.getItem(STORAGE_KEYS.RECIPIENTS);
      const shares = await AsyncStorage.getItem(STORAGE_KEYS.SHARES);
      const audit = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOG);

      const backup = JSON.stringify({
        logs: logs || '[]',
        recipients: recipients || '[]',
        shares: shares || '[]',
        audit: audit || '[]',
      });

      await AsyncStorage.setItem(STORAGE_KEYS.REAL_DATA_BACKUP, backup);
    } catch (error) {
      if (__DEV__) console.error('[DemoMode] Failed to backup real data:', error);
    }
  }, []);

  // Restore real data after disabling demo mode
  const restoreRealData = useCallback(async () => {
    try {
      const backup = await AsyncStorage.getItem(STORAGE_KEYS.REAL_DATA_BACKUP);
      if (backup) {
        const { logs, recipients, shares, audit } = JSON.parse(backup);
        await AsyncStorage.setItem(STORAGE_KEYS.LOGS, logs);
        await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, recipients);
        await AsyncStorage.setItem(STORAGE_KEYS.SHARES, shares);
        await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, audit);
      }
    } catch (error) {
      if (__DEV__) console.error('[DemoMode] Failed to restore real data:', error);
    }
  }, []);

  // Enable demo mode (default: 10y to unlock all time range tabs)
  const enableDemoMode = useCallback(async (duration: DemoDuration = '10y') => {
    // HARD GUARD: Block in production
    assertFounderDemo('enableDemoMode');

    console.log('[DemoMode] enableDemoMode called with duration:', duration);

    setIsLoading(true);
    try {
      // Backup real data first
      await backupRealData();

      // Generate demo data
      const { logs, recipients, shares, audit } = await generatePremiumDemoData(duration);

      // Log the timestamp range
      if (logs.length > 0) {
        const now = Date.now();
        const oldest = logs[logs.length - 1];
        const newest = logs[0];
        console.log('[DemoMode] enableDemoMode generated data range:', {
          count: logs.length,
          oldestDaysAgo: Math.round((now - oldest.timestamp) / 86400000),
          newestDaysAgo: Math.round((now - newest.timestamp) / 86400000),
        });
      }

      // Save demo data to main storage keys (so existing hooks work)
      await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, JSON.stringify(recipients));
      await AsyncStorage.setItem(STORAGE_KEYS.SHARES, JSON.stringify(shares));
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(audit));

      // Mark demo mode as enabled
      await AsyncStorage.setItem(STORAGE_KEYS.DEMO_MODE_ENABLED, 'true');
      setIsDemoMode(true);

      console.log('[DemoMode] Enabled with', logs.length, 'demo entries - SAVED');
    } catch (error) {
      console.error('[DemoMode] Failed to enable:', error);
    }
    setIsLoading(false);
  }, [backupRealData]);

  // Disable demo mode
  const disableDemoMode = useCallback(async () => {
    setIsLoading(true);
    try {
      // Restore real data
      await restoreRealData();

      // Clear demo mode flag
      await AsyncStorage.setItem(STORAGE_KEYS.DEMO_MODE_ENABLED, 'false');
      setIsDemoMode(false);

      if (__DEV__) console.log('[DemoMode] Disabled, real data restored');
    } catch (error) {
      if (__DEV__) console.error('[DemoMode] Failed to disable:', error);
    }
    setIsLoading(false);
  }, [restoreRealData]);

  // Reseed demo data (regenerate with same style)
  const reseedDemoData = useCallback(async (duration: DemoDuration = '10y') => {
    // HARD GUARD: Block in production
    assertFounderDemo('reseedDemoData');

    console.log('[DemoMode] reseedDemoData called with duration:', duration, 'isDemoMode:', isDemoMode);

    if (!isDemoMode) {
      console.log('[DemoMode] Skipping reseed - not in demo mode');
      return;
    }

    setIsLoading(true);
    try {
      // Generate new demo data with different seed
      const seed = Date.now() % 100000;
      console.log('[DemoMode] Reseeding with seed:', seed);
      rng.reset(seed);
      const { logs, recipients, shares, audit } = await generatePremiumDemoData(duration);

      // Log the timestamp range of generated data
      if (logs.length > 0) {
        const now = Date.now();
        const oldest = logs[logs.length - 1];
        const newest = logs[0];
        console.log('[DemoMode] Generated data range:', {
          count: logs.length,
          oldestDaysAgo: Math.round((now - oldest.timestamp) / 86400000),
          newestDaysAgo: Math.round((now - newest.timestamp) / 86400000),
        });
      }

      await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, JSON.stringify(recipients));
      await AsyncStorage.setItem(STORAGE_KEYS.SHARES, JSON.stringify(shares));
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(audit));

      console.log('[DemoMode] Reseeded with', logs.length, 'entries - SAVED TO STORAGE');
    } catch (error) {
      console.error('[DemoMode] Failed to reseed:', error);
    }
    setIsLoading(false);
  }, [isDemoMode]);

  // Clear demo data (return to empty/new user state)
  const clearDemoData = useCallback(async () => {
    // HARD GUARD: Block in production
    assertFounderDemo('clearDemoData');

    if (!isDemoMode) return;

    setIsLoading(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LOGS, '[]');
      await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, '[]');
      await AsyncStorage.setItem(STORAGE_KEYS.SHARES, '[]');
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, '[]');

      if (__DEV__) console.log('[DemoMode] Cleared to empty state');
    } catch (error) {
      if (__DEV__) console.error('[DemoMode] Failed to clear:', error);
    }
    setIsLoading(false);
  }, [isDemoMode]);

  // Record logo tap for 5x unlock
  const recordLogoTap = useCallback(() => {
    const now = Date.now();

    // Reset count if more than 2 seconds since last tap
    if (now - lastTapTime > 2000) {
      setLogoTapCount(1);
      setLastTapTime(now);
      return false;
    }

    const newCount = logoTapCount + 1;
    setLogoTapCount(newCount);
    setLastTapTime(now);

    if (newCount >= 5) {
      setLogoTapCount(0);
      setAdvancedUnlocked(true);
      AsyncStorage.setItem('@orbital:advanced_unlocked', 'true');
      return true; // Signal to show advanced settings
    }

    return false;
  }, [logoTapCount, lastTapTime]);

  if (isLoading && !isDemoMode) {
    // Only block initial load, not subsequent operations
    return null;
  }

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        isLoading,
        isFounderDemo: FOUNDER_DEMO_ENABLED,
        enableDemoMode,
        disableDemoMode,
        reseedDemoData,
        clearDemoData,
        advancedUnlocked,
        recordLogoTap,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextType {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
