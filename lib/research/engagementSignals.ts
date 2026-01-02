import AsyncStorage from '@react-native-async-storage/async-storage';
import { EngagementSignal, EngagementProfile } from '../../types';

const ENGAGEMENT_SIGNALS_KEY = '@orbital:engagement_signals';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// ENGAGEMENT SIGNAL RECORDING
// ============================================

async function getAllSignals(): Promise<EngagementSignal[]> {
  const data = await AsyncStorage.getItem(ENGAGEMENT_SIGNALS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function saveSignals(signals: EngagementSignal[]): Promise<void> {
  await AsyncStorage.setItem(ENGAGEMENT_SIGNALS_KEY, JSON.stringify(signals));
}

export async function recordEngagementSignal(
  userId: string,
  signalType: EngagementSignal['signalType'],
  metadata?: Record<string, string | number | boolean>
): Promise<EngagementSignal> {
  const signal: EngagementSignal = {
    id: generateId('eng'),
    userId,
    signalType,
    occurredAt: Date.now(),
    metadata,
  };

  const signals = await getAllSignals();
  signals.push(signal);
  await saveSignals(signals);

  return signal;
}

export async function recordSessionStart(userId: string): Promise<EngagementSignal> {
  return await recordEngagementSignal(userId, 'session_start');
}

export async function recordSessionEnd(
  userId: string,
  sessionDurationMs: number
): Promise<EngagementSignal> {
  const signal = await recordEngagementSignal(userId, 'session_end', {
    durationMs: sessionDurationMs,
  });
  signal.sessionDurationMs = sessionDurationMs;

  // Update the saved signal with duration
  const signals = await getAllSignals();
  const index = signals.findIndex((s) => s.id === signal.id);
  if (index >= 0) {
    signals[index] = signal;
    await saveSignals(signals);
  }

  return signal;
}

export async function recordSignalLogged(userId: string): Promise<EngagementSignal> {
  return await recordEngagementSignal(userId, 'signal_logged');
}

export async function recordPatternView(userId: string): Promise<EngagementSignal> {
  return await recordEngagementSignal(userId, 'pattern_view');
}

export async function recordExportGenerated(userId: string): Promise<EngagementSignal> {
  return await recordEngagementSignal(userId, 'export_generated');
}

export async function recordShareCreated(userId: string): Promise<EngagementSignal> {
  return await recordEngagementSignal(userId, 'share_created');
}

// ============================================
// SIGNAL RETRIEVAL
// ============================================

export async function getUserEngagementSignals(userId: string): Promise<EngagementSignal[]> {
  const signals = await getAllSignals();
  return signals.filter((s) => s.userId === userId);
}

export async function getSignalsInDateRange(
  userId: string,
  startDate: number,
  endDate: number
): Promise<EngagementSignal[]> {
  const signals = await getUserEngagementSignals(userId);
  return signals.filter((s) => s.occurredAt >= startDate && s.occurredAt <= endDate);
}

// ============================================
// ENGAGEMENT PROFILE GENERATION
// ============================================

export async function generateEngagementProfile(
  cohortParticipantId: string,
  userId: string
): Promise<EngagementProfile> {
  const signals = await getUserEngagementSignals(userId);

  if (signals.length === 0) {
    return {
      cohortParticipantId,
      totalSessions: 0,
      totalSignalsLogged: 0,
      averageSessionDurationMs: 0,
      averageSignalsPerWeek: 0,
      activeDays: 0,
      longestGapDays: 0,
      engagementPattern: 'new',
      firstEngagementAt: 0,
      lastEngagementAt: 0,
    };
  }

  // Count sessions and signals logged
  const sessions = signals.filter((s) => s.signalType === 'session_start');
  const signalsLogged = signals.filter((s) => s.signalType === 'signal_logged');
  const sessionEnds = signals.filter((s) => s.signalType === 'session_end');

  // Calculate average session duration
  const durations = sessionEnds
    .filter((s) => s.sessionDurationMs !== undefined)
    .map((s) => s.sessionDurationMs!);
  const averageSessionDurationMs =
    durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

  // Calculate active days
  const activeDaysSet = new Set(
    signals.map((s) => new Date(s.occurredAt).toDateString())
  );
  const activeDays = activeDaysSet.size;

  // Find first and last engagement
  const sortedSignals = [...signals].sort((a, b) => a.occurredAt - b.occurredAt);
  const firstEngagementAt = sortedSignals[0].occurredAt;
  const lastEngagementAt = sortedSignals[sortedSignals.length - 1].occurredAt;

  // Calculate longest gap
  let longestGapDays = 0;
  for (let i = 1; i < sortedSignals.length; i++) {
    const gapMs = sortedSignals[i].occurredAt - sortedSignals[i - 1].occurredAt;
    const gapDays = gapMs / (24 * 60 * 60 * 1000);
    if (gapDays > longestGapDays) {
      longestGapDays = gapDays;
    }
  }

  // Calculate signals per week
  const totalWeeks = Math.max(1, (lastEngagementAt - firstEngagementAt) / (7 * 24 * 60 * 60 * 1000));
  const averageSignalsPerWeek = signalsLogged.length / totalWeeks;

  // Determine engagement pattern
  let engagementPattern: EngagementProfile['engagementPattern'];
  const daysSinceFirst = (Date.now() - firstEngagementAt) / (24 * 60 * 60 * 1000);
  const daysSinceLast = (Date.now() - lastEngagementAt) / (24 * 60 * 60 * 1000);

  if (daysSinceFirst < 14) {
    engagementPattern = 'new';
  } else if (daysSinceLast > 14) {
    engagementPattern = 'declining';
  } else if (longestGapDays > 7) {
    engagementPattern = 'sporadic';
  } else if (averageSignalsPerWeek >= 3) {
    engagementPattern = 'consistent';
  } else {
    engagementPattern = 'periodic';
  }

  return {
    cohortParticipantId,
    totalSessions: sessions.length,
    totalSignalsLogged: signalsLogged.length,
    averageSessionDurationMs: Math.round(averageSessionDurationMs),
    averageSignalsPerWeek: Math.round(averageSignalsPerWeek * 10) / 10,
    activeDays,
    longestGapDays: Math.round(longestGapDays * 10) / 10,
    engagementPattern,
    firstEngagementAt,
    lastEngagementAt,
  };
}

// ============================================
// AGGREGATE ENGAGEMENT METRICS
// ============================================

export async function getAggregateEngagementMetrics(
  profiles: EngagementProfile[]
): Promise<{
  totalProfiles: number;
  patternDistribution: Record<EngagementProfile['engagementPattern'], number>;
  averageSessionsPerUser: number;
  averageSignalsPerUser: number;
  averageActiveDays: number;
  medianSessionDuration: number;
}> {
  if (profiles.length === 0) {
    return {
      totalProfiles: 0,
      patternDistribution: { consistent: 0, periodic: 0, sporadic: 0, declining: 0, new: 0 },
      averageSessionsPerUser: 0,
      averageSignalsPerUser: 0,
      averageActiveDays: 0,
      medianSessionDuration: 0,
    };
  }

  const patternDistribution: Record<EngagementProfile['engagementPattern'], number> = {
    consistent: 0,
    periodic: 0,
    sporadic: 0,
    declining: 0,
    new: 0,
  };

  let totalSessions = 0;
  let totalSignals = 0;
  let totalActiveDays = 0;
  const sessionDurations: number[] = [];

  for (const profile of profiles) {
    patternDistribution[profile.engagementPattern]++;
    totalSessions += profile.totalSessions;
    totalSignals += profile.totalSignalsLogged;
    totalActiveDays += profile.activeDays;
    if (profile.averageSessionDurationMs > 0) {
      sessionDurations.push(profile.averageSessionDurationMs);
    }
  }

  // Calculate median session duration
  sessionDurations.sort((a, b) => a - b);
  const medianSessionDuration =
    sessionDurations.length > 0
      ? sessionDurations[Math.floor(sessionDurations.length / 2)]
      : 0;

  return {
    totalProfiles: profiles.length,
    patternDistribution,
    averageSessionsPerUser: Math.round((totalSessions / profiles.length) * 10) / 10,
    averageSignalsPerUser: Math.round((totalSignals / profiles.length) * 10) / 10,
    averageActiveDays: Math.round(totalActiveDays / profiles.length),
    medianSessionDuration: Math.round(medianSessionDuration),
  };
}

// ============================================
// ENGAGEMENT TREND ANALYSIS
// ============================================

export async function analyzeEngagementTrend(
  userId: string,
  periodDays: number = 30
): Promise<{
  periodStart: number;
  periodEnd: number;
  weeklyBreakdown: {
    weekStart: number;
    signalsLogged: number;
    sessionsStarted: number;
    averageSessionDurationMs: number;
  }[];
  trend: 'increasing' | 'decreasing' | 'stable';
}> {
  const now = Date.now();
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000;
  const signals = await getSignalsInDateRange(userId, periodStart, now);

  // Group by week
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeks: Map<number, EngagementSignal[]> = new Map();

  for (const signal of signals) {
    const weekStart = Math.floor(signal.occurredAt / weekMs) * weekMs;
    if (!weeks.has(weekStart)) {
      weeks.set(weekStart, []);
    }
    weeks.get(weekStart)!.push(signal);
  }

  const weeklyBreakdown = Array.from(weeks.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekStart, weekSignals]) => {
      const signalsLogged = weekSignals.filter((s) => s.signalType === 'signal_logged').length;
      const sessionsStarted = weekSignals.filter((s) => s.signalType === 'session_start').length;
      const sessionEnds = weekSignals.filter((s) => s.signalType === 'session_end');
      const durations = sessionEnds
        .filter((s) => s.sessionDurationMs !== undefined)
        .map((s) => s.sessionDurationMs!);
      const avgDuration = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

      return {
        weekStart,
        signalsLogged,
        sessionsStarted,
        averageSessionDurationMs: Math.round(avgDuration),
      };
    });

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (weeklyBreakdown.length >= 2) {
    const firstHalf = weeklyBreakdown.slice(0, Math.floor(weeklyBreakdown.length / 2));
    const secondHalf = weeklyBreakdown.slice(Math.floor(weeklyBreakdown.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, w) => sum + w.signalsLogged, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, w) => sum + w.signalsLogged, 0) / secondHalf.length;

    const changePercent = ((secondHalfAvg - firstHalfAvg) / Math.max(firstHalfAvg, 1)) * 100;

    if (changePercent > 20) trend = 'increasing';
    else if (changePercent < -20) trend = 'decreasing';
  }

  return {
    periodStart,
    periodEnd: now,
    weeklyBreakdown,
    trend,
  };
}
