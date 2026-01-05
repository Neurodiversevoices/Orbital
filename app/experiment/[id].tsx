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
            <ChevronLeft color="rgba(255,255,255,0.7)" size={24} />
          </Pressable>
          <Text style={styles.title}>Loading...</Text>
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
            <ChevronLeft color="rgba(255,255,255,0.7)" size={24} />
          </Pressable>
          <Text style={styles.title}>{OBSERVATIONAL_LANGUAGE.tracking}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.experimentCard}>
            <View style={styles.beakerBadge}>
              <FlaskConical color="#00E5FF" size={20} />
            </View>
            <Text style={styles.hypothesis}>{experiment.hypothesis}</Text>
            <Text style={styles.trigger}>{experiment.triggerDescription}</Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Day {daysActive} of {totalDays}</Text>
              <Text style={styles.progressRemaining}>{daysRemaining} days remaining</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{experiment.followedCount}</Text>
              <Text style={styles.statLabel}>Followed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{experiment.notFollowedCount}</Text>
              <Text style={styles.statLabel}>Not Followed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{experiment.skippedCount}</Text>
              <Text style={styles.statLabel}>Skipped</Text>
            </View>
          </View>

          <View style={styles.followupSection}>
            <Text style={styles.followupQuestion}>{OBSERVATIONAL_LANGUAGE.followup}</Text>
            <View style={styles.followupButtons}>
              <Pressable style={[styles.followupButton, styles.followupYes]} onPress={() => handleFollowup('yes')}>
                <Check color="#fff" size={20} />
                <Text style={styles.followupButtonText}>Yes</Text>
              </Pressable>
              <Pressable style={[styles.followupButton, styles.followupNo]} onPress={() => handleFollowup('no')}>
                <XIcon color="#fff" size={20} />
                <Text style={styles.followupButtonText}>No</Text>
              </Pressable>
              <Pressable style={[styles.followupButton, styles.followupSkip]} onPress={() => handleFollowup('skipped')}>
                <SkipForward color="#fff" size={20} />
                <Text style={styles.followupButtonText}>Skip</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.concludeButton} onPress={handleConclude}>
              <Text style={styles.concludeButtonText}>Conclude Early & View Results</Text>
            </Pressable>
            <Pressable style={styles.abandonButton} onPress={handleAbandon}>
              <Trash2 color="#F44336" size={16} />
              <Text style={styles.abandonButtonText}>Abandon Experiment</Text>
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>{OBSERVATIONAL_LANGUAGE.noJudgment}</Text>
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
          <ChevronLeft color="rgba(255,255,255,0.7)" size={24} />
        </Pressable>
        <Text style={styles.title}>Experiment Results</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.experimentCard}>
          <View style={[styles.beakerBadge, experiment.status === 'abandoned' && styles.beakerAbandoned]}>
            <FlaskConical color={experiment.status === 'abandoned' ? '#666' : '#4CAF50'} size={20} />
          </View>
          <Text style={styles.hypothesis}>{experiment.hypothesis}</Text>
          <Text style={styles.trigger}>{experiment.triggerDescription}</Text>
          <View style={[styles.statusPill, experiment.status === 'abandoned' && styles.statusAbandoned]}>
            <Text style={[styles.statusPillText, experiment.status === 'abandoned' && styles.statusAbandoned]}>
              {experiment.status === 'concluded' ? 'Concluded' : 'Abandoned'}
            </Text>
          </View>
        </View>

        {result && formatted && experiment.status === 'concluded' && (
          <>
            <View style={styles.resultSection}>
              <Text style={styles.resultIntro}>{OBSERVATIONAL_LANGUAGE.resultIntro}</Text>
              <Text style={styles.resultHeadline}>{formatted.headline}</Text>
            </View>

            <View style={styles.comparisonRow}>
              <View style={[styles.comparisonBox, styles.comparisonFollowed]}>
                <Text style={styles.comparisonTitle}>When Followed</Text>
                <Text style={styles.comparisonDetail}>{formatted.followedSummary}</Text>
              </View>
              <View style={[styles.comparisonBox, styles.comparisonNotFollowed]}>
                <Text style={styles.comparisonTitle}>When Not Followed</Text>
                <Text style={styles.comparisonDetail}>{formatted.notFollowedSummary}</Text>
              </View>
            </View>

            <View style={styles.conclusionBox}>
              <Text style={styles.conclusionText}>{formatted.conclusion}</Text>
            </View>
          </>
        )}

        {experiment.status === 'abandoned' && (
          <View style={styles.abandonedBox}>
            <Text style={styles.abandonedText}>
              This experiment was stopped before completion. No results were calculated.
            </Text>
          </View>
        )}

        <Pressable style={styles.newExperimentButton} onPress={() => router.push('/experiment/new')}>
          <FlaskConical color="#000" size={18} />
          <Text style={styles.newExperimentText}>Start New Experiment</Text>
        </Pressable>

        <Text style={styles.disclaimer}>{OBSERVATIONAL_LANGUAGE.closing}</Text>
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
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  beakerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  beakerAbandoned: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hypothesis: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  trigger: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  statusPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderRadius: 12,
  },
  statusAbandoned: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.4)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
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
    color: 'rgba(255,255,255,0.7)',
  },
  progressRemaining: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  followupSection: {
    backgroundColor: 'rgba(0,229,255,0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  followupQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
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
    backgroundColor: '#4CAF50',
  },
  followupNo: {
    backgroundColor: '#F44336',
  },
  followupSkip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  followupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  concludeButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
  },
  concludeButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
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
    color: '#F44336',
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },
  resultSection: {
    marginBottom: spacing.lg,
  },
  resultIntro: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  resultHeadline: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  comparisonRow: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  comparisonBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  comparisonFollowed: {
    borderColor: 'rgba(76,175,80,0.3)',
  },
  comparisonNotFollowed: {
    borderColor: 'rgba(244,67,54,0.3)',
  },
  comparisonTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xs,
  },
  comparisonDetail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  conclusionBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  conclusionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    textAlign: 'center',
  },
  abandonedBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  abandonedText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  newExperimentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#00E5FF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  newExperimentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
