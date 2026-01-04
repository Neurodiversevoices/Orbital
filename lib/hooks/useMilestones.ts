/**
 * Longitudinal Milestones Hook
 *
 * Computes milestone achievements from signal history.
 * Milestones:
 * - 7-day streak: "Patterns forming"
 * - 30-day baseline: "Baseline established"
 * - 90-day confidence: "High-confidence patterns"
 */

import { useMemo } from 'react';
import { CapacityLog } from '../../types';

export type MilestoneId = 'patterns_forming' | 'baseline_established' | 'high_confidence';

export interface Milestone {
  id: MilestoneId;
  title: string;
  description: string;
  requiredDays: number;
  isAchieved: boolean;
  achievedAt: number | null;
  progress: number; // 0-100
  icon: 'sparkles' | 'target' | 'shield-check';
  color: string;
}

export interface MilestonesData {
  milestones: Milestone[];
  currentStreak: number;
  totalUniqueDays: number;
  nextMilestone: Milestone | null;
  hasAnyMilestone: boolean;
}

/**
 * Get unique dates from logs (YYYY-MM-DD format)
 */
function getUniqueDates(logs: CapacityLog[]): Set<string> {
  const dates = new Set<string>();
  logs.forEach((log) => {
    if (log.localDate) {
      dates.add(log.localDate);
    } else {
      // Fallback: compute from timestamp
      const date = new Date(log.timestamp);
      dates.add(date.toISOString().split('T')[0]);
    }
  });
  return dates;
}

/**
 * Calculate current consecutive day streak
 */
function calculateStreak(logs: CapacityLog[]): number {
  if (logs.length === 0) return 0;

  const dates = Array.from(getUniqueDates(logs)).sort().reverse();
  if (dates.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Check if most recent date is today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0; // Streak broken
  }

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const current = new Date(dates[i - 1]);
    const previous = new Date(dates[i]);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Find when a milestone was first achieved
 */
function findAchievementDate(logs: CapacityLog[], requiredDays: number): number | null {
  if (logs.length === 0) return null;

  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const seenDates = new Set<string>();

  for (const log of sortedLogs) {
    const date = log.localDate || new Date(log.timestamp).toISOString().split('T')[0];
    seenDates.add(date);
    if (seenDates.size >= requiredDays) {
      return log.timestamp;
    }
  }

  return null;
}

export function useMilestones(logs: CapacityLog[]): MilestonesData {
  return useMemo(() => {
    const uniqueDates = getUniqueDates(logs);
    const totalUniqueDays = uniqueDates.size;
    const currentStreak = calculateStreak(logs);

    const milestones: Milestone[] = [
      {
        id: 'patterns_forming',
        title: 'Patterns Forming',
        description: 'Log for 7 unique days to unlock early pattern detection.',
        requiredDays: 7,
        isAchieved: totalUniqueDays >= 7,
        achievedAt: findAchievementDate(logs, 7),
        progress: Math.min(100, Math.round((totalUniqueDays / 7) * 100)),
        icon: 'sparkles',
        color: '#00E5FF',
      },
      {
        id: 'baseline_established',
        title: 'Baseline Established',
        description: 'Log for 30 unique days to establish your personal baseline.',
        requiredDays: 30,
        isAchieved: totalUniqueDays >= 30,
        achievedAt: findAchievementDate(logs, 30),
        progress: Math.min(100, Math.round((totalUniqueDays / 30) * 100)),
        icon: 'target',
        color: '#4CAF50',
      },
      {
        id: 'high_confidence',
        title: 'High-Confidence Patterns',
        description: 'Log for 90 unique days for high-confidence pattern analysis.',
        requiredDays: 90,
        isAchieved: totalUniqueDays >= 90,
        achievedAt: findAchievementDate(logs, 90),
        progress: Math.min(100, Math.round((totalUniqueDays / 90) * 100)),
        icon: 'shield-check',
        color: '#9C27B0',
      },
    ];

    // Find next unachieved milestone
    const nextMilestone = milestones.find((m) => !m.isAchieved) || null;
    const hasAnyMilestone = milestones.some((m) => m.isAchieved);

    return {
      milestones,
      currentStreak,
      totalUniqueDays,
      nextMilestone,
      hasAnyMilestone,
    };
  }, [logs]);
}
