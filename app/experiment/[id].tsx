/**
 * Experiment Detail Screen
 *
 * Shows active experiment status or concluded results.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, FlaskConical, Check, X as XIcon, SkipForward, Trash2 } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useExperiments } from '../../lib/hooks/useExperiments';
import { Experiment, ExperimentResult, OBSERVATIONAL_LANGUAGE } from '../../lib/experiments/types';
import { getExperiment } from '../../lib/experiments/storage';
import { analyzeExperiment, formatResultForDisplay } from '../../lib/experiments/analysis';

export default function ExperimentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { endExperiment, abandonCurrentExperiment, recordFollowup, refresh } = useExperiments();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExperiment();
  }, [id]);

  const loadExperiment = async () => {
    if (!id) return;
    setIsLoading(true);
    const exp = await getExperiment(id);
    setExperiment(exp);
    if (exp && exp.status !== 'active') {
      const res = await analyzeExperiment(exp);
      setResult(res);
    }
    setIsLoading(false);
  };

  const handleFollowup = async (followed: 'yes' | 'no' | 'skipped') => {
    await recordFollowup(followed);
    await refresh();
    await loadExperiment();
  };

  const handleConclude = () => {
    Alert.alert(
      'Conclude Experiment',
      'End this experiment and view results?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Conclude',
          onPress: async () => {
            await endExperiment();
            await loadExperiment();
          },
        },
      ]
    );
  };

  const handleAbandon = () => {
    Alert.alert(
      'Abandon Experiment',
      'Stop this experiment without results?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            await abandonCurrentExperiment();
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading || !experiment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={colors.textSecondary} size={24} />
          </Pressable>
          <Text style={styles.title} maxFontSizeMultiplier={1.5}>Loading...</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>
    );
  }

  const daysActive = Math.ceil((Date.now() - experiment.createdAt) / (24 * 60 * 60 * 1000));
  const totalDays = experiment.durationWeeks * 7;
  const progress = Math.min(100, (daysActive / totalDays) * 100);
  const daysRemaining = Math.max(0, totalDays - daysActive);

  if (experiment.status === 'active') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={colors.textSecondary} size={24} />
          </Pressable>
          <Text style={styles.title} maxFontSizeMultiplier={1.5}>{OBSERVATIONAL_LANGUAGE.tracking}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.experimentCard}>
            <View style={styles.beakerBadge}>
              <FlaskConical color={colors.primary} size={20} />
            </View>
            <Text style={styles.hypothesis} maxFontSizeMultiplier={1.5}>{experiment.hypothesis}</Text>
            <Text style={styles.trigger} maxFontSizeMultiplier={1.5}>{experiment.triggerDescription}</Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel} maxFontSizeMultiplier={1.5}>Day {daysActive} of {totalDays}</Text>
              <Text style={styles.progressRemaining} maxFontSizeMultiplier={1.5}>{daysRemaining} days remaining</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.5}>{experiment.followedCount}</Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={1.5}>Followed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.5}>{experiment.notFollowedCount}</Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={1.5}>Not Followed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue} maxFontSizeMultiplier={1.5}>{experiment.skippedCount}</Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={1.5}>Skipped</Text>
            </View>
          </View>

          <View style={styles.followupSection}>
            <Text style={styles.followupQuestion} maxFontSizeMultiplier={1.5}>{OBSERVATIONAL_LANGUAGE.followup}</Text>
            <View style={styles.followupButtons}>
              <Pressable style={[styles.followupButton, styles.followupYes]} onPress={() => handleFollowup('yes')}>
                <Check color="#fff" size={20} />
                <Text style={styles.followupButtonText} maxFontSizeMultiplier={1.5}>Yes</Text>
              </Pressable>
              <Pressable style={[styles.followupButton, styles.followupNo]} onPress={() => handleFollowup('no')}>
                <XIcon color="#fff" size={20} />
                <Text style={styles.followupButtonText} maxFontSizeMultiplier={1.5}>No</Text>
              </Pressable>
              <Pressable style={[styles.followupButton, styles.followupSkip]} onPress={() => handleFollowup('skipped')}>
                <SkipForward color={colors.textPrimary} size={20} />
                <Text style={[styles.followupButtonText, styles.followupSkipText]} maxFontSizeMultiplier={1.5}>Skip</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.concludeButton} onPress={handleConclude}>
              <Text style={styles.concludeButtonText} maxFontSizeMultiplier={1.5}>Conclude Early & View Results</Text>
            </Pressable>
            <Pressable style={styles.abandonButton} onPress={handleAbandon}>
              <Trash2 color="#DC2626" size={16} />
              <Text style={styles.abandonButtonText} maxFontSizeMultiplier={1.5}>Abandon Experiment</Text>
            </Pressable>
          </View>

          <Text style={styles.disclaimer} maxFontSizeMultiplier={1.5}>{OBSERVATIONAL_LANGUAGE.noJudgment}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Concluded or abandoned
  const formatted = result ? formatResultForDisplay(result) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.textSecondary} size={24} />
        </Pressable>
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>Experiment Results</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.experimentCard}>
          <View style={[styles.beakerBadge, experiment.status === 'abandoned' && styles.beakerAbandoned]}>
            <FlaskConical color={experiment.status === 'abandoned' ? colors.textTertiary : '#0E8C7B'} size={20} />
          </View>
          <Text style={styles.hypothesis} maxFontSizeMultiplier={1.5}>{experiment.hypothesis}</Text>
          <Text style={styles.trigger} maxFontSizeMultiplier={1.5}>{experiment.triggerDescription}</Text>
          <View style={[styles.statusPill, experiment.status === 'abandoned' && styles.statusAbandoned]}>
            <Text style={[styles.statusPillText, experiment.status === 'abandoned' && styles.statusAbandonedText]} maxFontSizeMultiplier={1.5}>
              {experiment.status === 'concluded' ? 'Concluded' : 'Abandoned'}
            </Text>
          </View>
        </View>

        {result && formatted && experiment.status === 'concluded' && (
          <>
            <View style={styles.resultSection}>
              <Text style={styles.resultIntro} maxFontSizeMultiplier={1.5}>{OBSERVATIONAL_LANGUAGE.resultIntro}</Text>
              <Text style={styles.resultHeadline} maxFontSizeMultiplier={1.5}>{formatted.headline}</Text>
            </View>

            <View style={styles.comparisonRow}>
              <View style={[styles.comparisonBox, styles.comparisonFollowed]}>
                <Text style={styles.comparisonTitle} maxFontSizeMultiplier={1.5}>When Followed</Text>
                <Text style={styles.comparisonDetail} maxFontSizeMultiplier={1.5}>{formatted.followedSummary}</Text>
              </View>
              <View style={[styles.comparisonBox, styles.comparisonNotFollowed]}>
                <Text style={styles.comparisonTitle} maxFontSizeMultiplier={1.5}>When Not Followed</Text>
                <Text style={styles.comparisonDetail} maxFontSizeMultiplier={1.5}>{formatted.notFollowedSummary}</Text>
              </View>
            </View>

            <View style={styles.conclusionBox}>
              <Text style={styles.conclusionText} maxFontSizeMultiplier={1.5}>{formatted.conclusion}</Text>
            </View>
          </>
        )}

        {experiment.status === 'abandoned' && (
          <View style={styles.abandonedBox}>
            <Text style={styles.abandonedText} maxFontSizeMultiplier={1.5}>
              This experiment was stopped before completion. No results were calculated.
            </Text>
          </View>
        )}

        <Pressable style={styles.newExperimentButton} onPress={() => router.push('/experiment/new')}>
          <FlaskConical color="#FFFFFF" size={18} />
          <Text style={styles.newExperimentText} maxFontSizeMultiplier={1.5}>Start New Experiment</Text>
        </Pressable>

        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.5}>{OBSERVATIONAL_LANGUAGE.closing}</Text>
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
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  experimentCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  beakerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(45,212,191,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  beakerAbandoned: {
    backgroundColor: colors.backgroundSubtle,
  },
  hypothesis: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  trigger: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  statusPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: 'rgba(14,140,123,0.14)',
    borderRadius: 12,
  },
  statusAbandoned: {
    backgroundColor: colors.backgroundSubtle,
  },
  statusAbandonedText: {
    color: colors.textTertiary,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  progressRemaining: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.hairline,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  followupSection: {
    backgroundColor: 'rgba(45,212,191,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.25)',
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  followupQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  followupButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  followupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  followupYes: {
    backgroundColor: '#0E8C7B',
  },
  followupNo: {
    backgroundColor: '#DC2626',
  },
  followupSkip: {
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  followupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  followupSkipText: {
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  concludeButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  concludeButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  abandonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  abandonButtonText: {
    fontSize: 14,
    color: '#DC2626',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },
  resultSection: {
    marginBottom: spacing.lg,
  },
  resultIntro: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  resultHeadline: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  comparisonRow: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  comparisonBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  comparisonFollowed: {
    borderColor: 'rgba(14,140,123,0.4)',
  },
  comparisonNotFollowed: {
    borderColor: 'rgba(220,38,38,0.4)',
  },
  comparisonTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  comparisonDetail: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  conclusionBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  conclusionText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    textAlign: 'center',
  },
  abandonedBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  abandonedText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  newExperimentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  newExperimentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
