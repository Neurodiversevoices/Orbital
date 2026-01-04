/**
 * Milestones Panel Component
 *
 * Displays longitudinal milestone progress:
 * - 7-day: Patterns forming
 * - 30-day: Baseline established
 * - 90-day: High-confidence patterns
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Sparkles, Target, ShieldCheck, ChevronRight, Flame } from 'lucide-react-native';
import { spacing, borderRadius } from '../theme';
import { useMilestones, Milestone } from '../lib/hooks/useMilestones';
import { CapacityLog } from '../types';

interface MilestonesPanelProps {
  logs: CapacityLog[];
  compact?: boolean;
}

const iconMap = {
  sparkles: Sparkles,
  target: Target,
  'shield-check': ShieldCheck,
};

function MilestoneItem({
  milestone,
  delay,
  compact,
}: {
  milestone: Milestone;
  delay: number;
  compact?: boolean;
}) {
  const Icon = iconMap[milestone.icon];

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(300)}
      style={[
        styles.milestoneItem,
        compact && styles.milestoneItemCompact,
        milestone.isAchieved && styles.milestoneItemAchieved,
        { borderColor: milestone.isAchieved ? `${milestone.color}40` : 'rgba(255,255,255,0.06)' },
      ]}
    >
      <View
        style={[
          styles.milestoneIcon,
          {
            backgroundColor: milestone.isAchieved ? `${milestone.color}20` : 'rgba(255,255,255,0.05)',
          },
        ]}
      >
        <Icon
          size={compact ? 16 : 20}
          color={milestone.isAchieved ? milestone.color : 'rgba(255,255,255,0.3)'}
        />
      </View>

      <View style={styles.milestoneContent}>
        <View style={styles.milestoneHeader}>
          <Text
            style={[
              styles.milestoneTitle,
              compact && styles.milestoneTitleCompact,
              milestone.isAchieved && { color: milestone.color },
            ]}
          >
            {milestone.title}
          </Text>
          {milestone.isAchieved && (
            <View style={[styles.achievedBadge, { backgroundColor: `${milestone.color}20` }]}>
              <Text style={[styles.achievedBadgeText, { color: milestone.color }]}>Achieved</Text>
            </View>
          )}
        </View>

        {!compact && (
          <Text style={styles.milestoneDescription}>{milestone.description}</Text>
        )}

        {!milestone.isAchieved && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${milestone.progress}%`, backgroundColor: milestone.color },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {milestone.progress}% · {milestone.requiredDays - Math.round(milestone.progress * milestone.requiredDays / 100)} days to go
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export function MilestonesPanel({ logs, compact = false }: MilestonesPanelProps) {
  const { milestones, currentStreak, totalUniqueDays, nextMilestone } = useMilestones(logs);

  if (compact) {
    // Show only next milestone or most recent achievement
    const displayMilestone = nextMilestone || milestones[milestones.length - 1];

    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={styles.streakContainer}>
            <Flame size={14} color="#FF9800" />
            <Text style={styles.streakText}>{currentStreak} day streak</Text>
          </View>
          <Text style={styles.daysText}>{totalUniqueDays} unique days</Text>
        </View>

        {displayMilestone && (
          <MilestoneItem milestone={displayMilestone} delay={0} compact />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Journey</Text>
        <View style={styles.streakContainer}>
          <Flame size={14} color="#FF9800" />
          <Text style={styles.streakText}>{currentStreak} day streak</Text>
        </View>
      </View>

      <Text style={styles.headerSubtitle}>
        {totalUniqueDays} unique days logged · Pattern history is retained forever
      </Text>

      <View style={styles.milestonesContainer}>
        {milestones.map((milestone, index) => (
          <MilestoneItem
            key={milestone.id}
            milestone={milestone}
            delay={index * 100}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  compactContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.md,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,152,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9800',
  },
  daysText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  milestonesContainer: {
    gap: spacing.sm,
  },
  milestoneItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  milestoneItemCompact: {
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  milestoneItemAchieved: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  milestoneTitleCompact: {
    fontSize: 12,
  },
  milestoneDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    lineHeight: 16,
  },
  achievedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  achievedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
});
