/**
 * Intervention Sensitivity Layer Screen
 *
 * Shows:
 * - Active interventions being tracked
 * - Historical intervention effects with before/after comparison
 * - Most/least effective interventions
 * - Suggested interventions based on patterns
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Play,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Calendar,
  BarChart3,
  Sparkles,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { ScopeSelectorCompact, DemoBadge, InsufficientSignalsWarning } from '../../components/qsb';
import { useInterventionSensitivity, QSBScope, InterventionType, ConfidenceLevel } from '../../lib/qsb';

const INTERVENTION_LABELS: Record<InterventionType, string> = {
  schedule_change: 'Schedule Change',
  workload_adjustment: 'Workload Adjustment',
  break_added: 'Break Added',
  meeting_reduction: 'Meeting Reduction',
  deadline_extension: 'Deadline Extension',
  support_added: 'Support Added',
  environment_change: 'Environment Change',
  custom: 'Custom',
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: '#0E8C7B',
  medium: '#F59E0B',
  low: 'rgba(15,22,36,0.38)',
};

export default function InterventionSensitivityScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<QSBScope>('personal');
  const { data: result, isLoading } = useInterventionSensitivity(scope);

  const data = result?.success ? result.data : null;
  const error = result && !result.success ? result.error : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </Pressable>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.5}>Intervention Sensitivity</Text>
        <View style={styles.headerRight}>
          <ScopeSelectorCompact scope={scope} onScopeChange={setScope} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Demo Badge */}
        {data?.isDemo && (
          <Animated.View entering={FadeIn.duration(300)}>
            <DemoBadge variant="banner" />
          </Animated.View>
        )}

        {/* Error State */}
        {error && (
          <InsufficientSignalsWarning
            required={error.required}
            actual={error.actual}
          />
        )}

        {data && (
          <>
            {/* Active Interventions */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Play color={colors.primary} size={18} />
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Active Interventions</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText} maxFontSizeMultiplier={1.5}>{data.activeInterventions.length}</Text>
                </View>
              </View>

              {data.activeInterventions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>No active interventions being tracked</Text>
                  <Text style={styles.emptySubtext} maxFontSizeMultiplier={1.5}>
                    Add interventions to see how they affect your capacity
                  </Text>
                </View>
              ) : (
                <View style={styles.interventionsList}>
                  {data.activeInterventions.map((intervention, index) => (
                    <View key={intervention.id} style={styles.activeItem}>
                      <View style={styles.activeIndicator} />
                      <View style={styles.activeContent}>
                        <Text style={styles.activeName} maxFontSizeMultiplier={1.5}>{intervention.label}</Text>
                        <Text style={styles.activeDate} maxFontSizeMultiplier={1.5}>
                          Started {formatDate(intervention.startDate)}
                          {intervention.isOngoing && ' • Ongoing'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Most Effective */}
            {data.mostEffective && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.highlightCard}>
                <View style={styles.highlightHeader}>
                  <TrendingUp color="#0E8C7B" size={20} />
                  <Text style={styles.highlightTitle} maxFontSizeMultiplier={1.5}>Most Effective</Text>
                </View>
                <Text style={styles.highlightName} maxFontSizeMultiplier={1.5}>{data.mostEffective.intervention.label}</Text>
                <View style={styles.effectRow}>
                  <View style={styles.effectItem}>
                    <Text style={styles.effectLabel} maxFontSizeMultiplier={1.5}>Before</Text>
                    <Text style={styles.effectValue} maxFontSizeMultiplier={1.5}>{data.mostEffective.preCapacityAvg}</Text>
                  </View>
                  <View style={styles.effectArrow}>
                    <TrendingUp color="#0E8C7B" size={16} />
                  </View>
                  <View style={styles.effectItem}>
                    <Text style={styles.effectLabel} maxFontSizeMultiplier={1.5}>After</Text>
                    <Text style={[styles.effectValue, { color: '#0E8C7B' }]} maxFontSizeMultiplier={1.5}>
                      {data.mostEffective.postCapacityAvg}
                    </Text>
                  </View>
                  <View style={styles.changeContainer}>
                    <Text style={styles.changeValue} maxFontSizeMultiplier={1.5}>+{data.mostEffective.changePercent.toFixed(1)}%</Text>
                  </View>
                </View>
                {data.mostEffective.isStatisticallySignificant && (
                  <View style={styles.significanceBadge}>
                    <CheckCircle2 color="#0E8C7B" size={12} />
                    <Text style={styles.significanceText} maxFontSizeMultiplier={1.5}>Statistically significant</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Historical Effects */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <BarChart3 color={colors.textSecondary} size={18} />
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Historical Effects</Text>
              </View>

              <View style={styles.effectsList}>
                {data.historicalEffects.map((effect, index) => {
                  const isPositive = effect.changePercent > 0;
                  const changeColor = isPositive ? '#0E8C7B' : effect.changePercent < 0 ? '#DC2626' : colors.textTertiary;

                  return (
                    <View key={effect.intervention.id} style={styles.historyItem}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyName} maxFontSizeMultiplier={1.5}>{effect.intervention.label}</Text>
                        <View style={[styles.changeBadge, { backgroundColor: `${changeColor}22` }]}>
                          <Text style={[styles.changeBadgeText, { color: changeColor }]} maxFontSizeMultiplier={1.5}>
                            {isPositive ? '+' : ''}{effect.changePercent.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyDates} maxFontSizeMultiplier={1.5}>
                          {formatDate(effect.intervention.startDate)}
                          {effect.intervention.endDate && ` – ${formatDate(effect.intervention.endDate)}`}
                        </Text>
                        <View style={[styles.confidenceBadge, { borderColor: CONFIDENCE_COLORS[effect.confidence] }]}>
                          <Text style={[styles.confidenceText, { color: CONFIDENCE_COLORS[effect.confidence] }]} maxFontSizeMultiplier={1.5}>
                            {effect.confidence}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.historyBar}>
                        <View style={styles.historyBarBefore}>
                          <View style={[styles.historyBarFill, { width: `${effect.preCapacityAvg}%` }]} />
                        </View>
                        <View style={styles.historyBarAfter}>
                          <View
                            style={[
                              styles.historyBarFill,
                              { width: `${effect.postCapacityAvg}%`, backgroundColor: changeColor },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={styles.historyLabels}>
                        <Text style={styles.historyLabelText} maxFontSizeMultiplier={1.5}>Before: {effect.preCapacityAvg}</Text>
                        <Text style={styles.historyLabelText} maxFontSizeMultiplier={1.5}>After: {effect.postCapacityAvg}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Suggested Interventions */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Lightbulb color="#F59E0B" size={18} />
                <Text style={styles.cardTitle} maxFontSizeMultiplier={1.5}>Suggested Interventions</Text>
              </View>
              <Text style={styles.cardSubtitle} maxFontSizeMultiplier={1.5}>
                Based on patterns from similar profiles
              </Text>

              <View style={styles.suggestionsList}>
                {data.suggestedInterventions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionItem}>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionName} maxFontSizeMultiplier={1.5}>{suggestion.label}</Text>
                      <View style={styles.suggestionMeta}>
                        <View style={[styles.confidenceBadge, { borderColor: CONFIDENCE_COLORS[suggestion.confidence] }]}>
                          <Text style={[styles.confidenceText, { color: CONFIDENCE_COLORS[suggestion.confidence] }]} maxFontSizeMultiplier={1.5}>
                            {suggestion.confidence} confidence
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.impactBadge}>
                      <Sparkles color="#0E8C7B" size={12} />
                      <Text style={styles.impactText} maxFontSizeMultiplier={1.5}>+{suggestion.expectedImpact}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* How It Works */}
            <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.infoCard}>
              <Text style={styles.infoTitle} maxFontSizeMultiplier={1.5}>How Intervention Tracking Works</Text>
              <Text style={styles.infoText} maxFontSizeMultiplier={1.5}>
                This layer helps you understand which changes actually improve your capacity:{'\n\n'}
                1. Log an intervention when you make a change{'\n'}
                2. Continue logging capacity signals as usual{'\n'}
                3. After enough data, see before/after comparisons{'\n'}
                4. Confidence levels indicate statistical reliability{'\n\n'}
                <Text style={{ fontWeight: '600' }}>Privacy note:</Text> Only aggregate patterns are analyzed.
                Individual context notes are never shared.
              </Text>
            </Animated.View>

            {/* Cohort Info */}
            {data.cohortSize && (
              <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.cohortInfo}>
                <Text style={styles.cohortText} maxFontSizeMultiplier={1.5}>
                  Based on {data.cohortSize.toLocaleString()} participants
                </Text>
              </Animated.View>
            )}
          </>
        )}
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
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  headerRight: {
    marginRight: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  countBadge: {
    backgroundColor: 'rgba(45,212,191,0.18)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  interventionsList: {
    gap: spacing.sm,
  },
  activeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  activeContent: {
    flex: 1,
  },
  activeName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  activeDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  highlightCard: {
    backgroundColor: 'rgba(45,212,191,0.10)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0E8C7B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  highlightName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  effectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  effectItem: {
    alignItems: 'center',
  },
  effectLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  effectValue: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  effectArrow: {
    paddingHorizontal: spacing.md,
  },
  changeContainer: {
    backgroundColor: 'rgba(45,212,191,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  significanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
  significanceText: {
    fontSize: 11,
    color: '#0E8C7B',
  },
  effectsList: {
    gap: spacing.md,
  },
  historyItem: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  changeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  historyDates: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  confidenceBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  historyBar: {
    gap: 4,
  },
  historyBarBefore: {
    height: 4,
    backgroundColor: colors.hairline,
    borderRadius: 2,
    overflow: 'hidden',
  },
  historyBarAfter: {
    height: 4,
    backgroundColor: colors.hairline,
    borderRadius: 2,
    overflow: 'hidden',
  },
  historyBarFill: {
    height: '100%',
    backgroundColor: colors.textTertiary,
    borderRadius: 2,
  },
  historyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  historyLabelText: {
    fontSize: 10,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  suggestionsList: {
    gap: spacing.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  suggestionMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(45,212,191,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  impactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  infoCard: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cohortInfo: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cohortText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});
