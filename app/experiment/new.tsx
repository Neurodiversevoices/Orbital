/**
 * New Experiment Screen
 *
 * Start a new experiment from a suggestion or custom.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, FlaskConical, ChevronLeft, Check } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useExperiments } from '../../lib/hooks/useExperiments';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { ExperimentSuggestion, EXPERIMENT_CONSTANTS, OBSERVATIONAL_LANGUAGE } from '../../lib/experiments/types';
import { getSuggestion } from '../../lib/experiments/suggestions';

const DURATION_OPTIONS = [
  { weeks: 2, label: '2 weeks' },
  { weeks: 4, label: '4 weeks' },
  { weeks: 6, label: '6 weeks' },
  { weeks: 8, label: '8 weeks' },
];

export default function NewExperimentScreen() {
  const router = useRouter();
  const { logs } = useEnergyLogs();
  const { startExperiment, declineSuggestion, activeExperiment } = useExperiments();

  const [suggestion, setSuggestion] = useState<ExperimentSuggestion | null>(null);
  const [selectedHypothesis, setSelectedHypothesis] = useState<string | null>(null);
  const [customHypothesis, setCustomHypothesis] = useState('');
  const [durationWeeks, setDurationWeeks] = useState<number>(EXPERIMENT_CONSTANTS.DEFAULT_DURATION_WEEKS);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (activeExperiment) {
      router.replace(`/experiment/${activeExperiment.id}`);
      return;
    }
    getSuggestion(logs).then(setSuggestion);
  }, [logs, activeExperiment]);

  const handleStart = async () => {
    if (!suggestion) return;
    const hypothesis = selectedHypothesis === 'custom' ? customHypothesis : selectedHypothesis;
    if (!hypothesis?.trim()) return;

    setIsStarting(true);
    try {
      const exp = await startExperiment(hypothesis.trim(), suggestion, durationWeeks);
      router.replace(`/experiment/${exp.id}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleDecline = async () => {
    await declineSuggestion();
    router.back();
  };

  const canStart = selectedHypothesis && (selectedHypothesis !== 'custom' || customHypothesis.trim());

  if (!suggestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color="rgba(255,255,255,0.7)" size={24} />
          </Pressable>
          <Text style={styles.title}>New Experiment</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyState}>
          <FlaskConical color="rgba(255,255,255,0.2)" size={48} />
          <Text style={styles.emptyTitle}>No patterns detected yet</Text>
          <Text style={styles.emptyText}>
            Keep logging your capacity. When patterns emerge, experiment suggestions will appear here.
          </Text>
          <Pressable style={styles.backButtonLarge} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="rgba(255,255,255,0.7)" size={24} />
        </Pressable>
        <Text style={styles.title}>New Experiment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.patternCard}>
          <View style={styles.patternIcon}>
            <FlaskConical color="#00E5FF" size={24} />
          </View>
          <Text style={styles.patternIntro}>{OBSERVATIONAL_LANGUAGE.intro}</Text>
          <Text style={styles.patternDescription}>{suggestion.patternDescription}</Text>
        </View>

        <Text style={styles.question}>{suggestion.question}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HYPOTHESIS</Text>
          <Text style={styles.sectionSubtitle}>{OBSERVATIONAL_LANGUAGE.hypothesis}</Text>

          {suggestion.hypotheses.map((hyp, index) => {
            const isCustom = hyp.toLowerCase().includes('write your own');
            const isSelected = isCustom ? selectedHypothesis === 'custom' : selectedHypothesis === hyp;

            return (
              <Pressable
                key={index}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => setSelectedHypothesis(isCustom ? 'custom' : hyp)}
              >
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <Check color="#000" size={14} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {isCustom ? 'Write your own...' : hyp}
                </Text>
              </Pressable>
            );
          })}

          {selectedHypothesis === 'custom' && (
            <TextInput
              style={styles.customInput}
              placeholder="Describe what you want to try..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={customHypothesis}
              onChangeText={setCustomHypothesis}
              multiline
              autoFocus
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DURATION</Text>
          <View style={styles.durationOptions}>
            {DURATION_OPTIONS.map(opt => (
              <Pressable
                key={opt.weeks}
                style={[styles.durationOption, durationWeeks === opt.weeks && styles.durationSelected]}
                onPress={() => setDurationWeeks(opt.weeks)}
              >
                <Text style={[styles.durationText, durationWeeks === opt.weeks && styles.durationTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.startButton, !canStart && styles.startButtonDisabled]}
            onPress={handleStart}
            disabled={!canStart || isStarting}
          >
            <FlaskConical color="#000" size={20} />
            <Text style={styles.startButtonText}>
              {isStarting ? 'Starting...' : 'Start Experiment'}
            </Text>
          </Pressable>

          <Pressable style={styles.declineButton} onPress={handleDecline}>
            <Text style={styles.declineButtonText}>Not right now</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>{OBSERVATIONAL_LANGUAGE.abandon}</Text>
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
  patternCard: {
    backgroundColor: 'rgba(0,229,255,0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  patternIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  patternIntro: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xs,
  },
  patternDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  question: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 26,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  optionSelected: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderColor: 'rgba(0,229,255,0.3)',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  optionTextSelected: {
    color: '#00E5FF',
    fontWeight: '500',
  },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
    padding: spacing.md,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  durationOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  durationSelected: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderColor: 'rgba(0,229,255,0.3)',
  },
  durationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  durationTextSelected: {
    color: '#00E5FF',
    fontWeight: '500',
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#00E5FF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  declineButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  declineButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  backButtonLarge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});
