/**
 * Experiment Mode - Main Screen
 *
 * Lists experiments, shows active experiment status.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, FlaskConical, Plus, ChevronRight, Check, XCircle } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useExperiments } from '../../lib/hooks/useExperiments';
import { Experiment, OBSERVATIONAL_LANGUAGE } from '../../lib/experiments/types';

function ExperimentCard({ experiment, onPress }: { experiment: Experiment; onPress: () => void }) {
  const statusColors = {
    active: colors.primary,
    concluded: '#0E8C7B',
    abandoned: colors.textTertiary,
  };

  const statusLabels = {
    active: 'Active',
    concluded: 'Concluded',
    abandoned: 'Abandoned',
  };

  const daysActive = Math.ceil((Date.now() - experiment.createdAt) / (24 * 60 * 60 * 1000));
  const totalDays = experiment.durationWeeks * 7;
  const progress = experiment.status === 'active' ? Math.min(100, (daysActive / totalDays) * 100) : 100;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColors[experiment.status]}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[experiment.status] }]} />
          <Text style={[styles.statusText, { color: statusColors[experiment.status] }]}>
            {statusLabels[experiment.status]}
          </Text>
        </View>
        <ChevronRight color={colors.textTertiary} size={18} />
      </View>

      <Text style={styles.hypothesis} numberOfLines={2} maxFontSizeMultiplier={1.5}>{experiment.hypothesis}</Text>
      <Text style={styles.trigger} maxFontSizeMultiplier={1.5}>{experiment.triggerDescription}</Text>

      {experiment.status === 'active' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText} maxFontSizeMultiplier={1.5}>Day {daysActive} of {totalDays}</Text>
        </View>
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Check color="#0E8C7B" size={14} />
          <Text style={styles.statText} maxFontSizeMultiplier={1.5}>{experiment.followedCount} followed</Text>
        </View>
        <View style={styles.stat}>
          <XCircle color="#DC2626" size={14} />
          <Text style={styles.statText} maxFontSizeMultiplier={1.5}>{experiment.notFollowedCount} not followed</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ExperimentScreen() {
  const router = useRouter();
  const { experiments, activeExperiment, isLoading } = useExperiments();

  const concludedExperiments = experiments.filter(e => e.status === 'concluded');
  const abandonedExperiments = experiments.filter(e => e.status === 'abandoned');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FlaskConical color={colors.primary} size={24} />
          <Text style={styles.title} maxFontSizeMultiplier={1.5}>Experiments</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textSecondary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro} maxFontSizeMultiplier={1.5}>{OBSERVATIONAL_LANGUAGE.noJudgment}</Text>

        {activeExperiment ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>CURRENT EXPERIMENT</Text>
            <ExperimentCard
              experiment={activeExperiment}
              onPress={() => router.push(`/experiment/${activeExperiment.id}`)}
            />
          </View>
        ) : (
          <Pressable
            style={styles.startButton}
            onPress={() => router.push('/experiment/new')}
          >
            <Plus color="#FFFFFF" size={20} />
            <Text style={styles.startButtonText} maxFontSizeMultiplier={1.5}>Start an Experiment</Text>
          </Pressable>
        )}

        {concludedExperiments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>CONCLUDED</Text>
            {concludedExperiments.map(exp => (
              <ExperimentCard
                key={exp.id}
                experiment={exp}
                onPress={() => router.push(`/experiment/${exp.id}`)}
              />
            ))}
          </View>
        )}

        {abandonedExperiments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>ABANDONED</Text>
            {abandonedExperiments.map(exp => (
              <ExperimentCard
                key={exp.id}
                experiment={exp}
                onPress={() => router.push(`/experiment/${exp.id}`)}
              />
            ))}
          </View>
        )}

        {experiments.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <FlaskConical color={colors.textTertiary} size={48} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.5}>No experiments yet</Text>
            <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>
              When patterns emerge in your capacity data, you can run experiments to explore what helps.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText} maxFontSizeMultiplier={1.5}>
            Experiments help you explore patterns without judgment.{'\n'}
            You observe. You decide what it means.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  intro: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.lg,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hypothesis: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  trigger: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.hairline,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
