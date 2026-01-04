/**
 * Baseline & Streak Calculation Utilities
 *
 * Patterns unlock after 7 TOTAL distinct local dates with >= 1 entry each (non-consecutive).
 * Consecutive-day bonuses include confidence labels and Weekly Summary Card.
 */

import {
  CapacityLog,
  CapacityState,
  BaselineStats,
  ConfidenceTier,
  WeeklySummary,
  Tag,
} from '../types';

/**
 * Get the local date string (YYYY-MM-DD) for a timestamp
 */
export function getLocalDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's local date string (YYYY-MM-DD)
 */
export function getTodayLocalDate(): string {
  return getLocalDate(Date.now());
}

/**
 * Extract unique local dates from logs, using localDate field if available,
 * otherwise falling back to computing from timestamp
 */
export function getUniqueDates(logs: CapacityLog[]): Set<string> {
  const dates = new Set<string>();
  for (const log of logs) {
    const date = log.localDate || getLocalDate(log.timestamp);
    dates.add(date);
  }
  return dates;
}

/**
 * Calculate consecutive streak information from a set of dates
 * Returns { currentStreak, longestStreak, streakWindows }
 */
export function calculateStreaks(uniqueDates: Set<string>): {
  currentStreak: number;
  longestStreak: number;
  longestStreakWindow: { start: string; end: string } | null;
  currentStreakWindow: { start: string; end: string } | null;
} {
  if (uniqueDates.size === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      longestStreakWindow: null,
      currentStreakWindow: null,
    };
  }

  // Sort dates chronologically
  const sortedDates = Array.from(uniqueDates).sort();

  // Helper to check if two dates are consecutive
  const areConsecutive = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1 + 'T00:00:00');
    const d2 = new Date(date2 + 'T00:00:00');
    const diffMs = d2.getTime() - d1.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays === 1;
  };

  // Find all streaks
  const streaks: { start: string; end: string; length: number }[] = [];
  let streakStart = sortedDates[0];
  let streakLength = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    if (areConsecutive(sortedDates[i - 1], sortedDates[i])) {
      streakLength++;
    } else {
      // End of streak
      streaks.push({
        start: streakStart,
        end: sortedDates[i - 1],
        length: streakLength,
      });
      streakStart = sortedDates[i];
      streakLength = 1;
    }
  }
  // Don't forget the last streak
  streaks.push({
    start: streakStart,
    end: sortedDates[sortedDates.length - 1],
    length: streakLength,
  });

  // Find longest streak
  let longestStreak = 0;
  let longestStreakWindow: { start: string; end: string } | null = null;
  for (const streak of streaks) {
    if (streak.length > longestStreak) {
      longestStreak = streak.length;
      longestStreakWindow = { start: streak.start, end: streak.end };
    }
  }

  // Calculate current streak (must include today or yesterday)
  const today = getTodayLocalDate();
  const yesterday = getLocalDate(Date.now() - 24 * 60 * 60 * 1000);

  let currentStreak = 0;
  let currentStreakWindow: { start: string; end: string } | null = null;

  // Find the most recent streak that includes today or yesterday
  for (let i = streaks.length - 1; i >= 0; i--) {
    const streak = streaks[i];
    // Check if this streak ends today or yesterday (meaning it's still "current")
    if (streak.end === today || streak.end === yesterday) {
      currentStreak = streak.length;
      currentStreakWindow = { start: streak.start, end: streak.end };
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
    longestStreakWindow,
    currentStreakWindow,
  };
}

/**
 * Calculate confidence tier based on total unique days logged
 */
export function getConfidenceTier(baselineDays: number): ConfidenceTier {
  if (baselineDays < 7) return 'building';
  if (baselineDays < 14) return 'baseline';
  if (baselineDays < 28) return 'growing';
  return 'high';
}

/**
 * Get human-readable confidence tier label
 */
export function getConfidenceTierLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case 'building':
      return 'Building Baseline';
    case 'baseline':
      return 'Baseline';
    case 'growing':
      return 'Growing';
    case 'high':
      return 'High Confidence';
  }
}

/**
 * Calculate complete baseline statistics from logs
 */
export function calculateBaselineStats(logs: CapacityLog[]): BaselineStats {
  const uniqueDates = getUniqueDates(logs);
  const baselineDays = uniqueDates.size;
  const { currentStreak, longestStreak } = calculateStreaks(uniqueDates);

  return {
    baselineDays,
    patternsUnlocked: baselineDays >= 7,
    currentStreak,
    longestStreak,
    hasHighConfidenceWeek: longestStreak >= 7,
    confidenceTier: getConfidenceTier(baselineDays),
    baselineProgress: Math.min(baselineDays, 7),
  };
}

/**
 * Find the most recent 7-day streak window for Weekly Summary
 * Returns null if no 7+ day streak exists
 */
export function findMostRecent7DayStreakWindow(
  logs: CapacityLog[]
): { start: string; end: string } | null {
  const uniqueDates = getUniqueDates(logs);
  const { longestStreak, longestStreakWindow } = calculateStreaks(uniqueDates);

  if (longestStreak < 7 || !longestStreakWindow) {
    return null;
  }

  // For the most recent 7-day streak, we want the last 7 days of the longest streak
  // (or any 7-day streak if there are multiple)
  const sortedDates = Array.from(uniqueDates).sort();

  // Find all 7+ day streaks and return the most recent one
  const streaks: { start: string; end: string }[] = [];
  let streakStart = sortedDates[0];
  let streakDates = [sortedDates[0]];

  const areConsecutive = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1 + 'T00:00:00');
    const d2 = new Date(date2 + 'T00:00:00');
    const diffMs = d2.getTime() - d1.getTime();
    return diffMs / (1000 * 60 * 60 * 24) === 1;
  };

  for (let i = 1; i < sortedDates.length; i++) {
    if (areConsecutive(sortedDates[i - 1], sortedDates[i])) {
      streakDates.push(sortedDates[i]);
    } else {
      if (streakDates.length >= 7) {
        // Take the last 7 days of this streak
        const start = streakDates[streakDates.length - 7];
        const end = streakDates[streakDates.length - 1];
        streaks.push({ start, end });
      }
      streakStart = sortedDates[i];
      streakDates = [sortedDates[i]];
    }
  }
  // Check the last streak
  if (streakDates.length >= 7) {
    const start = streakDates[streakDates.length - 7];
    const end = streakDates[streakDates.length - 1];
    streaks.push({ start, end });
  }

  // Return the most recent (last) 7-day window
  return streaks.length > 0 ? streaks[streaks.length - 1] : null;
}

/**
 * Calculate Weekly Summary for a given 7-day window
 */
export function calculateWeeklySummary(
  logs: CapacityLog[],
  window: { start: string; end: string }
): WeeklySummary {
  // Filter logs within the date window
  const windowLogs = logs.filter((log) => {
    const logDate = log.localDate || getLocalDate(log.timestamp);
    return logDate >= window.start && logDate <= window.end;
  });

  // Capacity distribution
  const stateToPercent = (state: CapacityState): number => {
    switch (state) {
      case 'resourced':
        return 100;
      case 'stretched':
        return 50;
      case 'depleted':
        return 0;
    }
  };

  const resourcedCount = windowLogs.filter((l) => l.state === 'resourced').length;
  const stretchedCount = windowLogs.filter((l) => l.state === 'stretched').length;
  const depletedCount = windowLogs.filter((l) => l.state === 'depleted').length;
  const totalEntries = windowLogs.length;

  const averagePercent =
    totalEntries > 0
      ? Math.round(
          windowLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) /
            totalEntries
        )
      : 0;

  // Top drivers/tags
  const tagCounts = new Map<Tag, number>();
  for (const log of windowLogs) {
    for (const tag of log.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topDrivers = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Notes count
  const notesCount = windowLogs.filter(
    (log) => log.note || log.detailsText
  ).length;

  return {
    startDate: window.start,
    endDate: window.end,
    capacitySummary: {
      resourced: resourcedCount,
      stretched: stretchedCount,
      depleted: depletedCount,
      averagePercent,
    },
    topDrivers,
    notesCount,
    totalEntries,
  };
}

/**
 * Format a date range for display (e.g., "Dec 25 - Dec 31")
 */
export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = endDate.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}
