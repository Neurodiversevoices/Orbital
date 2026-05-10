/**
 * Load Tab — "Today's Demand"
 *
 * Surfaces the day's demand load: how much is pulling on the user.
 * Components: demand load score, contributor decomposition, add-event CTA,
 * recent demand log.
 *
 * TODO (data wiring): replace placeholder demand decomposition values with
 * derivations from `lib/health` (HRV deficit / RHR drift / sleep deficit) and
 * actual Supabase queries on `capacity_logs` filtered to demand-tagged entries.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Zap, X } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EmptyState } from '../../components';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';

// =============================================================================
// LIGHT THEME TOKENS (per CLAUDE.md May 2026 spec)
// =============================================================================
const LIGHT = {
  background: '#FFFFFF',
  textPrimary: '#0F1624',
  textSecondary: 'rgba(15, 22, 36, 0.62)',
  textTertiary: 'rgba(15, 22, 36, 0.38)',
  hairline: 'rgba(15, 22, 36, 0.10)',
  cardShadow: 'rgba(15, 22, 36, 0.06)',
  accent: '#2DD4BF',
  amber: '#F59E0B',
  crimson: '#DC2626',
  cyan: '#06B6D4',
};

// Note: CLAUDE.md prefers JetBrains Mono; only Space Mono ships in
// @expo-google-fonts/space-mono — keep SpaceMono until JBM is loaded.
const MONO_FONT = 'SpaceMono_400Regular';
const SANS_FONT_BOLD = 'DMSans_700Bold';

// =============================================================================
// DEMAND DECOMPOSITION — placeholder formulas
// TODO: pull these from `lib/health/index.ts` HealthKit adapter and
// `user_daily_metrics` table once wired.
// =============================================================================
interface DemandContributor {
  key: string;
  label: string;
  weight: number; // 0..1
  description: string;
}

function getDemandContributors(loggedDemandCount: number): DemandContributor[] {
  // Placeholder values — TODO: replace with real signals.
  const hrvDeficit = 0.42; // TODO: from HealthKit Recovery metric
  const rhrDrift = 0.28; // TODO: from HealthKit RHR delta vs 30D baseline
  const sleepDeficit = 0.55; // TODO: from sleep duration vs personal target
  const loggedDemand = Math.min(1, loggedDemandCount / 4); // weight by today's logs

  return [
    {
      key: 'hrv',
      label: 'HRV deficit',
      weight: hrvDeficit,
      description: 'Heart-rate variability below 30-day baseline.',
    },
    {
      key: 'rhr',
      label: 'Resting HR drift',
      weight: rhrDrift,
      description: 'Resting heart rate elevated vs baseline.',
    },
    {
      key: 'sleep',
      label: 'Sleep deficit',
      weight: sleepDeficit,
      description: 'Last night fell short of your sleep target.',
    },
    {
      key: 'logged',
      label: 'Logged demand events',
      weight: loggedDemand,
      description: 'Self-reported pulls today.',
    },
  ];
}

function computeDemandScore(contributors: DemandContributor[]): number {
  if (contributors.length === 0) return 0;
  const sum = contributors.reduce((acc, c) => acc + c.weight, 0);
  // demand = (hrvDeficit + rhrDrift + sleepDeficit + loggedDemand) / 4 → 0..1
  // surface as 0..100 for legibility
  return Math.round((sum / contributors.length) * 100);
}

function scoreColor(score: number): string {
  if (score >= 70) return LIGHT.crimson;
  if (score >= 40) return LIGHT.amber;
  return LIGHT.accent;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function LoadScreen() {
  const { logs, saveEntry } = useEnergyLogs();
  const [showComposer, setShowComposer] = useState(false);
  const [eventNote, setEventNote] = useState('');

  const now = useMemo(() => new Date(), []);
  const timeLabel = useMemo(
    () =>
      now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    [now]
  );

  // TODO: real category filter once `Tag` taxonomy exposes `demand` cleanly.
  // For skeleton: filter logs whose tags include 'demand'.
  const demandLogs = useMemo(
    () =>
      logs.filter((l) => Array.isArray(l.tags) && l.tags.includes('demand')),
    [logs]
  );

  const todayDemandCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return demandLogs.filter((l) => l.timestamp >= start.getTime()).length;
  }, [demandLogs]);

  const contributors = useMemo(
    () => getDemandContributors(todayDemandCount),
    [todayDemandCount]
  );
  const score = useMemo(() => computeDemandScore(contributors), [contributors]);

  const recent = useMemo(() => demandLogs.slice(0, 7), [demandLogs]);

  const handleSubmitEvent = useCallback(async () => {
    if (!eventNote.trim()) {
      setShowComposer(false);
      return;
    }
    try {
      // TODO: clinical copy from `lib/copy/clinical.ts` not yet present —
      // using the user's literal note for now.
      await saveEntry('stretched', ['demand'], eventNote.trim());
      setEventNote('');
      setShowComposer(false);
    } catch {
      // swallow — UI feedback can be added once toast utility is wired
    }
  }, [eventNote, saveEntry]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <Text
            style={styles.eyebrow}
            maxFontSizeMultiplier={1.5}
            accessibilityRole="text"
          >
            {`DEMAND · TODAY · ${timeLabel}`}
          </Text>
          <Text
            style={styles.headline}
            maxFontSizeMultiplier={1.5}
            accessibilityRole="header"
          >
            What&apos;s pulling on you today.
          </Text>
        </Animated.View>

        {/* Demand load score card */}
        <View
          style={styles.card}
          accessibilityRole="summary"
          accessibilityLabel={`Today's demand score is ${score} out of 100`}
        >
          <Text style={styles.cardEyebrow} maxFontSizeMultiplier={1.5}>
            DEMAND LOAD
          </Text>
          <View style={styles.scoreRow}>
            <Text
              style={[styles.scoreNumber, { color: scoreColor(score) }]}
              maxFontSizeMultiplier={1.5}
            >
              {score}
            </Text>
            <Text style={styles.scoreUnit} maxFontSizeMultiplier={1.5}>
              / 100
            </Text>
          </View>
          <Text style={styles.cardCaption} maxFontSizeMultiplier={1.5}>
            {/* TODO: clinical copy strings */}
            Composite of HRV, RHR, sleep, and self-reported demand.
          </Text>
        </View>

        {/* Decomposition list */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow} maxFontSizeMultiplier={1.5}>
            DECOMPOSITION
          </Text>
          {contributors.map((c) => (
            <View
              key={c.key}
              style={styles.decompRow}
              accessibilityRole="text"
              accessibilityLabel={`${c.label}: ${Math.round(c.weight * 100)} percent`}
            >
              <View style={styles.decompTextCol}>
                <Text style={styles.decompLabel} maxFontSizeMultiplier={1.5}>
                  {c.label}
                </Text>
                <Text style={styles.decompDesc} maxFontSizeMultiplier={1.5}>
                  {c.description}
                </Text>
              </View>
              <Text
                style={[styles.decompWeight, { color: scoreColor(c.weight * 100) }]}
                maxFontSizeMultiplier={1.5}
              >
                {Math.round(c.weight * 100)}%
              </Text>
            </View>
          ))}
        </View>

        {/* Add demand event CTA */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a demand event"
          accessibilityHint="Opens a text field to log a new demand event"
          onPress={() => setShowComposer(true)}
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Plus color="#FFFFFF" size={20} />
          <Text style={styles.ctaText} maxFontSizeMultiplier={1.5}>
            Add a demand event
          </Text>
        </Pressable>

        {/* Recent demand log */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow} maxFontSizeMultiplier={1.5}>
            RECENT DEMAND · LAST 7
          </Text>
          {recent.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No demand events yet"
              description="When you log a demand event, it will show up here."
              size="compact"
            />
          ) : (
            recent.map((log) => (
              <View
                key={log.id}
                style={styles.logRow}
                accessibilityRole="text"
                accessibilityLabel={`Demand event on ${new Date(log.timestamp).toLocaleString()}`}
              >
                <Text style={styles.logTime} maxFontSizeMultiplier={1.5}>
                  {new Date(log.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text
                  style={styles.logText}
                  maxFontSizeMultiplier={1.5}
                  numberOfLines={2}
                >
                  {log.note || log.detailsText || '(no note)'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Composer modal — minimal text input */}
      <Modal
        visible={showComposer}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComposer(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss demand event entry"
            style={styles.modalBackdrop}
            onPress={() => setShowComposer(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} maxFontSizeMultiplier={1.5}>
                New demand event
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setShowComposer(false)}
                hitSlop={12}
              >
                <X color={LIGHT.textSecondary} size={22} />
              </Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              value={eventNote}
              onChangeText={setEventNote}
              placeholder="What's pulling on you right now?"
              placeholderTextColor={LIGHT.textTertiary}
              multiline
              autoFocus
              accessibilityLabel="Demand event note"
              maxFontSizeMultiplier={1.5}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save demand event"
              onPress={handleSubmitEvent}
              style={({ pressed }) => [
                styles.cta,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.ctaText} maxFontSizeMultiplier={1.5}>
                Save event
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LIGHT.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 48,
  },
  header: { marginBottom: 24 },
  eyebrow: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    color: LIGHT.textSecondary,
    marginBottom: 8,
  },
  headline: {
    fontFamily: SANS_FONT_BOLD,
    fontSize: 28,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    lineHeight: 34,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LIGHT.hairline,
    padding: 16,
    marginBottom: 16,
    shadowColor: LIGHT.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardEyebrow: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: LIGHT.textSecondary,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreNumber: {
    fontFamily: SANS_FONT_BOLD,
    fontSize: 56,
    fontWeight: '700',
  },
  scoreUnit: {
    fontFamily: MONO_FONT,
    fontSize: 14,
    color: LIGHT.textSecondary,
    marginLeft: 8,
  },
  cardCaption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: LIGHT.textSecondary,
    lineHeight: 18,
  },
  decompRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT.hairline,
  },
  decompTextCol: { flex: 1, paddingRight: 12 },
  decompLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: LIGHT.textPrimary,
    marginBottom: 2,
  },
  decompDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: LIGHT.textSecondary,
    lineHeight: 16,
  },
  decompWeight: {
    fontFamily: MONO_FONT,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  cta: {
    height: 54,
    borderRadius: 14,
    backgroundColor: LIGHT.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,22,36,0.06)',
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  logRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT.hairline,
  },
  logTime: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    color: LIGHT.textTertiary,
    marginBottom: 4,
    letterSpacing: 0.6,
  },
  logText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: LIGHT.textPrimary,
    lineHeight: 20,
  },

  // Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,22,36,0.32)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: LIGHT.hairline,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: SANS_FONT_BOLD,
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT.textPrimary,
  },
  modalInput: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LIGHT.hairline,
    padding: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: LIGHT.textPrimary,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
});
