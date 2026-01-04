/**
 * Aggregate Calculation Utilities for Team Mode and School Zone
 *
 * Privacy-first: Never expose individual data.
 * Minimum threshold enforcement for all aggregates.
 * Capacity-only language - no medical/diagnostic terms.
 */

import {
  CapacityLog,
  CapacityState,
  Category,
  TeamAggregate,
  SchoolZoneAggregate,
  SchoolSummaryCard,
  TeamActionSuggestion,
  TEAM_MIN_PARTICIPANTS,
  SCHOOL_MIN_STUDENTS,
  CAPACITY_TO_TEAM_LABEL,
  TEAM_ACTION_TEMPLATES,
  EnvironmentFactor,
} from '../types';
import { getLocalDate } from './baselineUtils';

// ============================================
// TEAM MODE AGGREGATES
// ============================================

/**
 * Calculate team aggregate from logs
 * Returns aggregate-only data, never individual entries
 */
export function calculateTeamAggregate(
  logs: CapacityLog[],
  teamId: string,
  periodDays: number = 7
): TeamAggregate {
  const now = Date.now();
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000;
  const periodEnd = now;

  // Filter logs for this team in the period
  const teamLogs = logs.filter(
    (log) => log.teamId === teamId && log.timestamp >= periodStart
  );

  // Count unique participants (by unique user patterns, simulated here by unique dates)
  const uniqueParticipants = new Set(
    teamLogs.map((log) => log.localDate || getLocalDate(log.timestamp))
  );
  const participantCount = uniqueParticipants.size;

  // Privacy threshold check
  const hasEnoughParticipants = participantCount >= TEAM_MIN_PARTICIPANTS;

  // Calculate capacity distribution
  let capacityDistribution = { plenty: 0, elevated: 0, nearLimit: 0 };
  if (hasEnoughParticipants) {
    const total = teamLogs.length;
    if (total > 0) {
      const resourcedCount = teamLogs.filter((l) => l.state === 'resourced').length;
      const stretchedCount = teamLogs.filter((l) => l.state === 'stretched').length;
      const depletedCount = teamLogs.filter((l) => l.state === 'depleted').length;

      capacityDistribution = {
        plenty: Math.round((resourcedCount / total) * 100),
        elevated: Math.round((stretchedCount / total) * 100),
        nearLimit: Math.round((depletedCount / total) * 100),
      };
    }
  }

  // Calculate top drivers
  const driverCounts: Record<Category, number> = {
    sensory: 0,
    demand: 0,
    social: 0,
  };
  teamLogs.forEach((log) => {
    log.tags.forEach((tag) => {
      if (tag === 'sensory' || tag === 'demand' || tag === 'social') {
        driverCounts[tag]++;
      }
    });
    if (log.category) {
      driverCounts[log.category]++;
    }
  });

  const totalDrivers = driverCounts.sensory + driverCounts.demand + driverCounts.social;
  const topDrivers = (['sensory', 'demand', 'social'] as Category[])
    .map((driver) => ({
      driver,
      count: driverCounts[driver],
      percentage: totalDrivers > 0 ? Math.round((driverCounts[driver] / totalDrivers) * 100) : 0,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  // Calculate weekly trend (direction only)
  let weeklyTrend: 'improving' | 'stable' | 'declining' | null = null;
  if (hasEnoughParticipants && teamLogs.length >= 14) {
    const midpoint = periodStart + (periodEnd - periodStart) / 2;
    const firstHalf = teamLogs.filter((l) => l.timestamp < midpoint);
    const secondHalf = teamLogs.filter((l) => l.timestamp >= midpoint);

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const stateToPercent = (state: CapacityState) =>
        state === 'resourced' ? 100 : state === 'stretched' ? 50 : 0;

      const firstAvg =
        firstHalf.reduce((sum, l) => sum + stateToPercent(l.state), 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, l) => sum + stateToPercent(l.state), 0) / secondHalf.length;

      const diff = secondAvg - firstAvg;
      if (diff > 5) weeklyTrend = 'improving';
      else if (diff < -5) weeklyTrend = 'declining';
      else weeklyTrend = 'stable';
    }
  }

  // Calculate participation confidence
  const expectedSignals = participantCount * periodDays;
  const signalRate = expectedSignals > 0 ? teamLogs.length / expectedSignals : 0;
  const participationConfidence: 'high' | 'medium' | 'low' =
    signalRate >= 0.7 ? 'high' : signalRate >= 0.3 ? 'medium' : 'low';

  return {
    teamId,
    periodStart,
    periodEnd,
    participantCount,
    hasEnoughParticipants,
    capacityDistribution,
    topDrivers,
    weeklyTrend,
    participationConfidence,
    totalSignals: teamLogs.length,
  };
}

/**
 * Generate action suggestions based on team aggregate
 * Plain language, no surveillance framing
 */
export function generateTeamSuggestions(aggregate: TeamAggregate): TeamActionSuggestion[] {
  if (!aggregate.hasEnoughParticipants) {
    return [];
  }

  const suggestions: TeamActionSuggestion[] = [];

  // Check for high near-limit percentage
  if (aggregate.capacityDistribution.nearLimit > 30) {
    suggestions.push(TEAM_ACTION_TEMPLATES.find((t) => t.id === 'priority_reset')!);
  }

  // Check for declining trend
  if (aggregate.weeklyTrend === 'declining') {
    suggestions.push(TEAM_ACTION_TEMPLATES.find((t) => t.id === 'support_resources')!);
  }

  // Check for high demand driver
  const demandDriver = aggregate.topDrivers.find((d) => d.driver === 'demand');
  if (demandDriver && demandDriver.percentage > 40) {
    suggestions.push(TEAM_ACTION_TEMPLATES.find((t) => t.id === 'reduce_meetings')!);
  }

  // Check for high sensory driver
  const sensoryDriver = aggregate.topDrivers.find((d) => d.driver === 'sensory');
  if (sensoryDriver && sensoryDriver.percentage > 40) {
    suggestions.push(TEAM_ACTION_TEMPLATES.find((t) => t.id === 'quiet_hours')!);
    suggestions.push(TEAM_ACTION_TEMPLATES.find((t) => t.id === 'environment_check')!);
  }

  // Sort by priority and limit to top 3
  return suggestions
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

// ============================================
// SCHOOL ZONE AGGREGATES
// ============================================

/**
 * Calculate school zone aggregate from logs
 * Returns aggregate-only data, never individual student data
 */
export function calculateSchoolZoneAggregate(
  logs: CapacityLog[],
  schoolZoneId: string,
  periodDays: number = 7
): SchoolZoneAggregate {
  const now = Date.now();
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000;
  const periodEnd = now;

  // Filter logs for this school zone in the period
  const schoolLogs = logs.filter(
    (log) => log.schoolZoneId === schoolZoneId && log.timestamp >= periodStart
  );

  // Count unique students (simulated by unique dates)
  const uniqueStudents = new Set(
    schoolLogs.map((log) => log.localDate || getLocalDate(log.timestamp))
  );
  const studentCount = uniqueStudents.size;

  // Privacy threshold check
  const hasEnoughStudents = studentCount >= SCHOOL_MIN_STUDENTS;

  // Calculate capacity distribution
  let capacityDistribution = { plenty: 0, elevated: 0, nearLimit: 0 };
  if (hasEnoughStudents) {
    const total = schoolLogs.length;
    if (total > 0) {
      const resourcedCount = schoolLogs.filter((l) => l.state === 'resourced').length;
      const stretchedCount = schoolLogs.filter((l) => l.state === 'stretched').length;
      const depletedCount = schoolLogs.filter((l) => l.state === 'depleted').length;

      capacityDistribution = {
        plenty: Math.round((resourcedCount / total) * 100),
        elevated: Math.round((stretchedCount / total) * 100),
        nearLimit: Math.round((depletedCount / total) * 100),
      };
    }
  }

  // Calculate top drivers
  const driverCounts: Record<Category, number> = {
    sensory: 0,
    demand: 0,
    social: 0,
  };
  schoolLogs.forEach((log) => {
    log.tags.forEach((tag) => {
      if (tag === 'sensory' || tag === 'demand' || tag === 'social') {
        driverCounts[tag]++;
      }
    });
    if (log.category) {
      driverCounts[log.category]++;
    }
  });

  const totalDrivers = driverCounts.sensory + driverCounts.demand + driverCounts.social;
  const topDrivers = (['sensory', 'demand', 'social'] as Category[])
    .map((driver) => ({
      driver,
      count: driverCounts[driver],
      percentage: totalDrivers > 0 ? Math.round((driverCounts[driver] / totalDrivers) * 100) : 0,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  // Calculate participation confidence
  const expectedSignals = studentCount * periodDays;
  const signalRate = expectedSignals > 0 ? schoolLogs.length / expectedSignals : 0;
  const participationConfidence: 'high' | 'medium' | 'low' =
    signalRate >= 0.7 ? 'high' : signalRate >= 0.3 ? 'medium' : 'low';

  return {
    schoolZoneId,
    periodStart,
    periodEnd,
    studentCount,
    hasEnoughStudents,
    capacityDistribution,
    topDrivers,
    participationConfidence,
    totalSignals: schoolLogs.length,
  };
}

// ============================================
// SCHOOL SUMMARY CARD (CAREGIVER)
// ============================================

/**
 * Generate School Summary Card for caregiver export
 * Shows student's own data (not aggregate), notes excluded by default
 */
export function generateSchoolSummaryCard(
  logs: CapacityLog[],
  studentId: string,
  periodDays: number = 14
): SchoolSummaryCard {
  const now = Date.now();
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000;

  // Filter logs for this student in the period
  const studentLogs = logs.filter((log) => log.timestamp >= periodStart);

  // Calculate date range
  const startDate = new Date(periodStart).toISOString().split('T')[0];
  const endDate = new Date(now).toISOString().split('T')[0];

  // Calculate capacity trend
  let capacityTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (studentLogs.length >= 4) {
    const midpoint = periodStart + (now - periodStart) / 2;
    const firstHalf = studentLogs.filter((l) => l.timestamp < midpoint);
    const secondHalf = studentLogs.filter((l) => l.timestamp >= midpoint);

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const stateToPercent = (state: CapacityState) =>
        state === 'resourced' ? 100 : state === 'stretched' ? 50 : 0;

      const firstAvg =
        firstHalf.reduce((sum, l) => sum + stateToPercent(l.state), 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, l) => sum + stateToPercent(l.state), 0) / secondHalf.length;

      const diff = secondAvg - firstAvg;
      if (diff > 8) capacityTrend = 'improving';
      else if (diff < -8) capacityTrend = 'declining';
    }
  }

  // Calculate average capacity
  const stateToPercent = (state: CapacityState) =>
    state === 'resourced' ? 100 : state === 'stretched' ? 50 : 0;
  const averageCapacity =
    studentLogs.length > 0
      ? Math.round(
          studentLogs.reduce((sum, l) => sum + stateToPercent(l.state), 0) / studentLogs.length
        )
      : 50;

  // Calculate common drivers
  const driverCounts: Record<Category, number> = {
    sensory: 0,
    demand: 0,
    social: 0,
  };
  studentLogs.forEach((log) => {
    log.tags.forEach((tag) => {
      if (tag === 'sensory' || tag === 'demand' || tag === 'social') {
        driverCounts[tag]++;
      }
    });
    if (log.category) {
      driverCounts[log.category]++;
    }
  });

  const totalLogs = studentLogs.length;
  const commonDrivers = (['sensory', 'demand', 'social'] as Category[])
    .map((driver) => {
      const count = driverCounts[driver];
      const frequency: 'frequent' | 'occasional' | 'rare' =
        count > totalLogs * 0.5 ? 'frequent' : count > totalLogs * 0.2 ? 'occasional' : 'rare';
      return { driver, frequency };
    })
    .filter((d) => driverCounts[d.driver] > 0);

  // Default environment factors based on capacity and drivers
  const helps: EnvironmentFactor[] = [];
  const drains: EnvironmentFactor[] = [];

  // Add helpful factors based on common patterns
  if (driverCounts.sensory > totalLogs * 0.3) {
    helps.push('quiet_space', 'sensory_tools');
    drains.push('loud_environment', 'bright_lights');
  }
  if (driverCounts.demand > totalLogs * 0.3) {
    helps.push('movement_breaks', 'extra_time');
    drains.push('time_pressure', 'multiple_instructions');
  }
  if (driverCounts.social > totalLogs * 0.3) {
    helps.push('small_groups', 'check_ins');
    drains.push('crowded_spaces', 'social_demands');
  }

  return {
    studentId,
    generatedAt: now,
    dateRange: { start: startDate, end: endDate },
    capacityTrend,
    averageCapacity,
    commonDrivers,
    environmentFactors: { helps, drains },
    totalEntries: studentLogs.length,
    includesNotes: false,
  };
}

/**
 * Format School Summary Card as shareable text
 */
export function formatSchoolSummaryCardAsText(card: SchoolSummaryCard): string {
  const trendEmoji =
    card.capacityTrend === 'improving' ? '+' : card.capacityTrend === 'declining' ? '-' : '=';

  const lines = [
    '=== CAPACITY SUMMARY CARD ===',
    '',
    `Period: ${card.dateRange.start} to ${card.dateRange.end}`,
    `Entries: ${card.totalEntries}`,
    '',
    `Average Capacity: ${card.averageCapacity}%`,
    `Trend: ${card.capacityTrend} (${trendEmoji})`,
    '',
    'Common Drivers:',
    ...card.commonDrivers.map((d) => `  - ${d.driver}: ${d.frequency}`),
    '',
    'What Helps:',
    ...card.environmentFactors.helps.map((f) => `  [x] ${f.replace(/_/g, ' ')}`),
    '',
    'What Drains:',
    ...card.environmentFactors.drains.map((f) => `  [x] ${f.replace(/_/g, ' ')}`),
    '',
    '---',
    'Generated by Orbital',
    'Notes excluded for privacy.',
  ];

  return lines.join('\n');
}
