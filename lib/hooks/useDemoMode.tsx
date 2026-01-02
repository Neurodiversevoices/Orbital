/**
 * Orbital Demo Mode Hook
 *
 * Provides isolated demo data mode for screenshots, demos, and testing.
 * Never touches real user data. Works completely offline.
 *
 * Activation:
 * - Settings → Advanced → Demo Mode toggle
 * - Long-press Orbital logo 5 times
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

type DemoDuration = '30d' | '90d' | '180d' | '365d';

interface DemoModeContextType {
  isDemoMode: boolean;
  isLoading: boolean;
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

// Premium demo data patterns
const DEMO_PATTERNS = {
  // Baseline hovers around 50-55%, creating a realistic "average person" feel
  baselineTarget: 0.52,

  // Crisis period: days 25-32 (a visible dip)
  crisisStart: 25,
  crisisEnd: 32,
  crisisSeverity: -0.25,

  // Recovery trend: days 33-45 (gradual improvement)
  recoveryStart: 33,
  recoveryEnd: 45,

  // Good streak: days 60-70 (stable high period)
  goodStreakStart: 60,
  goodStreakEnd: 70,

  // Category correlations (which drivers appear with depleted states)
  categoryCorrelations: {
    sensory: 0.35,  // 35% of depleted logs have sensory
    demand: 0.45,   // 45% have demand
    social: 0.20,   // 20% have social
  },
};

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

function getCapacityForDay(dayOffset: number, hourOfDay: number): { state: CapacityState; value: number } {
  let capacity = DEMO_PATTERNS.baselineTarget;

  // Time of day effects
  if (hourOfDay < 7) capacity -= 0.1;
  else if (hourOfDay >= 7 && hourOfDay < 10) capacity += 0.08;
  else if (hourOfDay >= 13 && hourOfDay < 15) capacity -= 0.12;
  else if (hourOfDay >= 21) capacity -= 0.08;

  // Day of week (Monday harder)
  const dayOfWeek = new Date(Date.now() - dayOffset * 86400000).getDay();
  if (dayOfWeek === 1) capacity -= 0.1;
  if (dayOfWeek === 5) capacity += 0.05;
  if (dayOfWeek === 0 || dayOfWeek === 6) capacity += 0.08;

  // Crisis period
  if (dayOffset >= DEMO_PATTERNS.crisisStart && dayOffset <= DEMO_PATTERNS.crisisEnd) {
    const crisisProgress = (dayOffset - DEMO_PATTERNS.crisisStart) / (DEMO_PATTERNS.crisisEnd - DEMO_PATTERNS.crisisStart);
    const crisisDepth = Math.sin(crisisProgress * Math.PI) * DEMO_PATTERNS.crisisSeverity;
    capacity += crisisDepth;
  }

  // Recovery trend
  if (dayOffset >= DEMO_PATTERNS.recoveryStart && dayOffset <= DEMO_PATTERNS.recoveryEnd) {
    const recoveryProgress = (dayOffset - DEMO_PATTERNS.recoveryStart) / (DEMO_PATTERNS.recoveryEnd - DEMO_PATTERNS.recoveryStart);
    capacity += recoveryProgress * 0.15;
  }

  // Good streak
  if (dayOffset >= DEMO_PATTERNS.goodStreakStart && dayOffset <= DEMO_PATTERNS.goodStreakEnd) {
    capacity += 0.12;
  }

  // Add controlled randomness
  capacity += (rng.next() - 0.5) * 0.15;
  capacity = Math.max(0.1, Math.min(0.95, capacity));

  // Determine state
  let state: CapacityState;
  if (capacity > 0.6) state = 'resourced';
  else if (capacity > 0.35) state = 'stretched';
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

async function generatePremiumDemoData(duration: DemoDuration = '90d'): Promise<{
  logs: CapacityLog[];
  recipients: ShareRecipient[];
  shares: ShareConfig[];
  audit: AuditEntry[];
}> {
  rng.reset(42); // Consistent seed for reproducible data

  const logs: CapacityLog[] = [];
  const now = Date.now();

  // Map duration to days
  const durationDays: Record<DemoDuration, number> = {
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '365d': 365,
  };
  const totalDays = durationDays[duration];

  // Realistic signal generation: 1 signal per day, with ~85% coverage (natural gaps)
  // This ensures SIGNALS count = approximately the number of days with some realistic gaps
  const COVERAGE_RATE = 0.85; // 85% of days have a signal

  for (let day = 0; day < totalDays; day++) {
    // Skip some days randomly to simulate natural gaps (15% chance of no signal)
    if (rng.next() > COVERAGE_RATE) {
      continue;
    }

    // Generate exactly ONE signal per day (consistent with Orbital's mental model)
    // Varied time of day for realism
    const currentHour = new Date(now).getHours();
    const timeSlot = rng.next();
    let hour: number;

    if (day === 0) {
      // For today, only use hours that have already passed
      // Use morning hours if it's still early, or spread across elapsed hours
      hour = Math.max(1, Math.floor(rng.next() * Math.min(currentHour, 22)));
    } else if (timeSlot < 0.3) {
      // Morning (8-11am) - 30% chance
      hour = 8 + Math.floor(rng.next() * 4);
    } else if (timeSlot < 0.7) {
      // Afternoon (12-5pm) - 40% chance
      hour = 12 + Math.floor(rng.next() * 6);
    } else {
      // Evening (6-9pm) - 30% chance
      hour = 18 + Math.floor(rng.next() * 4);
    }

    const minute = Math.floor(rng.next() * 60);

    // Calculate timestamp: X days ago at specified hour:minute
    const entryDate = new Date(now);
    entryDate.setDate(entryDate.getDate() - day);
    entryDate.setHours(hour, minute, 0, 0);
    const timestamp = entryDate.getTime();

    // Skip entries that would be in the future (safety check)
    if (timestamp > now) continue;

    const { state } = getCapacityForDay(day, hour);
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

  // Sort newest first
  logs.sort((a, b) => b.timestamp - a.timestamp);

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
        console.error('[DemoMode] Failed to load state:', error);
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
      console.error('[DemoMode] Failed to backup real data:', error);
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
      console.error('[DemoMode] Failed to restore real data:', error);
    }
  }, []);

  // Enable demo mode
  const enableDemoMode = useCallback(async (duration: DemoDuration = '90d') => {
    setIsLoading(true);
    try {
      // Backup real data first
      await backupRealData();

      // Generate demo data
      const { logs, recipients, shares, audit } = await generatePremiumDemoData(duration);

      // Save demo data to main storage keys (so existing hooks work)
      await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, JSON.stringify(recipients));
      await AsyncStorage.setItem(STORAGE_KEYS.SHARES, JSON.stringify(shares));
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(audit));

      // Mark demo mode as enabled
      await AsyncStorage.setItem(STORAGE_KEYS.DEMO_MODE_ENABLED, 'true');
      setIsDemoMode(true);

      console.log('[DemoMode] Enabled with', logs.length, 'demo entries');
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

      console.log('[DemoMode] Disabled, real data restored');
    } catch (error) {
      console.error('[DemoMode] Failed to disable:', error);
    }
    setIsLoading(false);
  }, [restoreRealData]);

  // Reseed demo data (regenerate with same style)
  const reseedDemoData = useCallback(async (duration: DemoDuration = '90d') => {
    if (!isDemoMode) return;

    setIsLoading(true);
    try {
      // Generate new demo data with different seed
      rng.reset(Date.now() % 100000);
      const { logs, recipients, shares, audit } = await generatePremiumDemoData(duration);

      await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, JSON.stringify(recipients));
      await AsyncStorage.setItem(STORAGE_KEYS.SHARES, JSON.stringify(shares));
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(audit));

      console.log('[DemoMode] Reseeded with', logs.length, 'entries');
    } catch (error) {
      console.error('[DemoMode] Failed to reseed:', error);
    }
    setIsLoading(false);
  }, [isDemoMode]);

  // Clear demo data (return to empty/new user state)
  const clearDemoData = useCallback(async () => {
    if (!isDemoMode) return;

    setIsLoading(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LOGS, '[]');
      await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, '[]');
      await AsyncStorage.setItem(STORAGE_KEYS.SHARES, '[]');
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, '[]');

      console.log('[DemoMode] Cleared to empty state');
    } catch (error) {
      console.error('[DemoMode] Failed to clear:', error);
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
