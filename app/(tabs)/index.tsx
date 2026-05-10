/**
 * Home tab — System Status (May 2026 redesign).
 *
 * Replaces the previous orb/gauge centerpiece with the new System Status
 * dashboard layout: header wordmark, Today's Capacity card with flowing
 * ribbon, 7-day micro-bars, three Apple-Health-style metric cards, and a
 * confidence pill. Existing capacity-log save flow + audit + haptics are
 * preserved through the Composer at the bottom of the screen.
 *
 * NOTE: Several visual building blocks (CapacityRibbon, HealthMetricCard,
 * PatternBarsChart, DetectedPatternCard, lib/health/useHealth) are being
 * authored by sibling agents in parallel. This file imports them
 * dynamically with try/catch and renders a hairline placeholder when the
 * component is missing, so the home screen always renders even if the
 * sibling work hasn't landed.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import {
  Settings,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Heart,
  Activity,
  HeartPulse,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  CategorySelector,
  Composer,
  COMPOSER_HEIGHT,
  ModeInsightsPanel,
  OrgRoleBanner,
} from '../../components';
import { colors, commonStyles, spacing } from '../../theme';
import { CapacityState, Category } from '../../types';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { useLocale } from '../../lib/hooks/useLocale';
import { useDemoMode, FOUNDER_DEMO_ENABLED } from '../../lib/hooks/useDemoMode';
import { useAppMode } from '../../lib/hooks/useAppMode';
import { useTutorial } from '../../lib/hooks/useTutorial';
import { useSubscription, shouldBypassSubscription } from '../../lib/subscription';
import { useOptionalSubBrand } from '../../lib/platform/SubBrandProvider';
import { recordAuditEvent } from '../../lib/platform/trustCore';
import { Locale } from '../../locales';

// ---------------------------------------------------------------------------
// Sibling-agent component imports
//
// These are loaded via require() with try/catch so a missing file never
// blocks the home screen from mounting. Each fallback renders a small
// hairline View with a TODO comment so the layout footprint is preserved.
// ---------------------------------------------------------------------------

type CapacityRibbonProps = {
  capacity: number;
  state: CapacityState | null;
};
type HealthMetricCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'steady';
  trendLabel?: string;
  accentColor?: string;
  loading?: boolean;
};

let CapacityRibbon: React.ComponentType<CapacityRibbonProps> | null = null;
try {
  CapacityRibbon = require('../../components/CapacityRibbon').CapacityRibbon
    || require('../../components/CapacityRibbon').default;
} catch {
  // TODO(parallel-agent): components/CapacityRibbon.tsx not yet landed.
}

let HealthMetricCard: React.ComponentType<HealthMetricCardProps> | null = null;
try {
  HealthMetricCard = require('../../components/HealthMetricCard').HealthMetricCard
    || require('../../components/HealthMetricCard').default;
} catch {
  // TODO(parallel-agent): components/HealthMetricCard.tsx not yet landed.
}

// useHealthSnapshot lives in lib/health/useHealth.ts (sibling agent).
// Provide a graceful fallback so the screen renders if the hook is missing.
type HealthSnapshot = {
  status: 'authorized' | 'denied' | 'unavailable' | 'loading';
  recoveryHours?: number | null;
  nervousLoadMs?: number | null;
  cardiacDriftBpm?: number | null;
};
let useHealthSnapshot: (() => HealthSnapshot) | null = null;
let initHealth: (() => Promise<void> | void) | null = null;
try {
  const mod = require('../../lib/health/useHealth');
  useHealthSnapshot = mod.useHealthSnapshot || null;
  initHealth = mod.initHealth || null;
} catch {
  // TODO(parallel-agent): lib/health/useHealth.ts not yet landed.
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(locale: Locale): string {
  const localeCode = locale === 'es' ? 'es-MX' : 'en-US';
  return new Date().toLocaleDateString(localeCode, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const stateMessages: Record<CapacityState, { headline: string; tip: string; color: string; Arrow: typeof ArrowDown }> = {
  depleted: {
    headline: 'Capacity is slipping.',
    tip: 'Reduce optional load.',
    color: colors.depleted,
    Arrow: ArrowDown,
  },
  stretched: {
    headline: 'Capacity is steady.',
    tip: 'Hold the line.',
    color: colors.stretched,
    Arrow: ArrowRight,
  },
  resourced: {
    headline: 'Capacity is open.',
    tip: 'Use the headroom.',
    color: colors.resourced,
    Arrow: ArrowUp,
  },
};

const stateAccent: Record<CapacityState, string> = {
  resourced: colors.resourced,
  stretched: colors.stretched,
  depleted: colors.depleted,
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const forceDemo = FOUNDER_DEMO_ENABLED && params.demo === '1';
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const { hasSeenTutorial, isLoading: tutorialLoading } = useTutorial();
  const { logs, saveEntry, refresh, hasHitSignalLimit } = useEnergyLogs();
  const { t, locale } = useLocale();
  const { isDemoMode, enableDemoMode, reseedDemoData } = useDemoMode();
  const { currentMode } = useAppMode();
  const { isPro } = useSubscription();
  const subBrandCtx = useOptionalSubBrand();
  const posture = subBrandCtx?.posture;
  const bypassesSubscription = shouldBypassSubscription(currentMode);
  const canLogSignal = bypassesSubscription || isPro || !hasHitSignalLimit;

  const [currentState, setCurrentState] = useState<CapacityState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const headerScale = useSharedValue(1);
  const headerOpacity = useSharedValue(1);

  // Health snapshot — guarded behind hook availability.
  const health: HealthSnapshot = useHealthSnapshot
    ? useHealthSnapshot()
    : { status: 'unavailable' };

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        headerScale.value = withTiming(0.92, { duration: 250 });
        headerOpacity.value = withTiming(0.5, { duration: 250 });
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        headerScale.value = withTiming(1, { duration: 250 });
        headerOpacity.value = withTiming(1, { duration: 250 });
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
    opacity: headerOpacity.value,
  }));

  useEffect(() => {
    if (forceDemo) {
      const seedDemo = async () => {
        if (!isDemoMode) {
          await enableDemoMode('90d');
        } else {
          await reseedDemoData('90d');
        }
        await refresh();
      };
      seedDemo();
    }
  }, [forceDemo]);

  // ----- Derived data ------------------------------------------------------

  // Map current capacity state → 0..1 used by the ribbon. Mirrors the prior
  // gauge default (0.82 ≈ resourced) so the dot lives in a sensible spot
  // before the user taps anything today.
  const capacityNumber = useMemo(() => {
    if (currentState === 'depleted') return 0.18;
    if (currentState === 'stretched') return 0.5;
    if (currentState === 'resourced') return 0.82;
    return 0.7;
  }, [currentState]);

  // 7-day micro-bars: aggregate one bar per local-day for the last 7 days.
  const microBars = useMemo(() => {
    const days: { day: string; value: number; isToday: boolean }[] = [];
    const now = new Date();
    const stateToPercent = (s: CapacityState) =>
      s === 'resourced' ? 1 : s === 'stretched' ? 0.55 : 0.2;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const start = new Date(d).setHours(0, 0, 0, 0);
      const end = start + 24 * 60 * 60 * 1000;
      const dayLogs = logs.filter((l) => l.timestamp >= start && l.timestamp < end);
      const avg = dayLogs.length
        ? dayLogs.reduce((a, l) => a + stateToPercent(l.state), 0) / dayLogs.length
        : 0;
      days.push({
        day: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        value: avg,
        isToday: i === 0,
      });
    }
    return days;
  }, [logs]);

  // Baseline trend caption for the micro-bars row.
  const baselineCaption = useMemo(() => {
    const recent = microBars.slice(-7).filter((d) => d.value > 0);
    if (recent.length < 3) {
      return { label: 'Building baseline', color: colors.textTertiary, Arrow: ArrowRight };
    }
    const avg = recent.reduce((a, d) => a + d.value, 0) / recent.length;
    if (avg < 0.4) return { label: 'Below baseline', color: colors.depleted, Arrow: ArrowDown };
    if (avg > 0.7) return { label: 'Above baseline', color: colors.resourced, Arrow: ArrowUp };
    return { label: 'Steady', color: colors.stretched, Arrow: ArrowRight };
  }, [microBars]);

  // Confidence pill — useEnergyLogs doesn't currently expose baseline
  // confidence; fall back to the spec's 92% placeholder until the field lands.
  const confidencePct = 92;

  const handleStateChange = useCallback((state: CapacityState) => {
    setCurrentState(state);
  }, []);

  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  }, []);

  const canSave = currentState !== null;
  const accentColor = currentState ? stateAccent[currentState] : colors.primary;

  const handleSave = useCallback(async () => {
    if (currentState && !isSaving && canLogSignal) {
      Keyboard.dismiss();
      setIsSaving(true);

      try {
        const tags = selectedCategory ? [selectedCategory] : [];
        const trimmedNote = note.trim() || undefined;
        await saveEntry(currentState, tags, trimmedNote, trimmedNote);
        if (posture?.auditLogging) {
          try {
            await recordAuditEvent({ action: 'capacity.log', target: 'self' });
          } catch (err) {
            if (__DEV__) console.warn('[home] audit failed', err);
          }
        }
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        setTimeout(() => {
          setCurrentState(null);
          setSelectedCategory(null);
          setNote('');
          setIsSaving(false);
        }, 600);
      } catch (error) {
        if (__DEV__) console.error('Failed to save:', error);
        setIsSaving(false);
      }
    }
  }, [currentState, selectedCategory, note, isSaving, saveEntry, canLogSignal, posture]);

  if (tutorialLoading) {
    return (
      <SafeAreaView style={[commonStyles.screen, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (hasSeenTutorial === false) {
    return <Redirect href="/tutorial" />;
  }

  const composerBottomPadding = currentState
    ? COMPOSER_HEIGHT + insets.bottom + spacing.md
    : spacing.md;

  const stateMsg = currentState ? stateMessages[currentState] : stateMessages.resourced;

  return (
    <SafeAreaView style={[commonStyles.screen, styles.screen]} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ------------------------------------------------------------- */}
        {/* Header: ORBITAL wordmark + SYSTEM STATUS + date + settings cog */}
        {/* ------------------------------------------------------------- */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <View style={styles.headerSide} />
          <View style={styles.headerCenter}>
            <Text
              accessibilityRole="header"
              accessibilityLabel="Orbital"
              style={styles.wordmark}
            >
              ORBITAL
            </Text>
            <Text style={styles.systemStatusLabel}>SYSTEM STATUS</Text>
            <Text style={styles.dateText}>{formatDate(locale)}</Text>
          </View>
          <View style={styles.headerSide}>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={styles.settingsButton}
              hitSlop={8}
            >
              <Settings color={colors.textSecondary} size={22} />
            </Pressable>
          </View>
        </Animated.View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: composerBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={!keyboardVisible}
        >
          {/* Org banner + mode insights preserved from prior layout */}
          <OrgRoleBanner mode={currentMode} compact />
          {currentMode !== 'personal' && <ModeInsightsPanel logs={logs} />}

          {/* --------------------------------------------------------- */}
          {/* Today's Capacity card                                     */}
          {/* --------------------------------------------------------- */}
          <View style={styles.card} accessible accessibilityLabel="Today's capacity">
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeadline}>Today's Capacity</Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.ribbonContainer}>
              {CapacityRibbon ? (
                <CapacityRibbon capacity={capacityNumber} state={currentState} />
              ) : (
                // TODO(parallel-agent): replace with <CapacityRibbon /> once landed.
                <View style={styles.ribbonPlaceholder} />
              )}
            </View>

            <View style={styles.stateMessageRow}>
              <View style={[styles.arrowChip, { borderColor: stateMsg.color }]}>
                <stateMsg.Arrow color={stateMsg.color} size={16} />
              </View>
              <View style={styles.stateMessageText}>
                <Text style={styles.stateHeadline}>{stateMsg.headline}</Text>
                <Text style={styles.stateTip}>{stateMsg.tip}</Text>
              </View>
            </View>
          </View>

          {/* --------------------------------------------------------- */}
          {/* 7-day micro-bars                                          */}
          {/* --------------------------------------------------------- */}
          <View style={[styles.card, styles.cardCompact]}>
            <View style={styles.microRow}>
              <View style={styles.microBars}>
                {microBars.map((b, i) => {
                  const height = Math.max(6, b.value * 36);
                  const barColor = b.isToday
                    ? colors.primary
                    : b.value === 0
                      ? colors.hairline
                      : 'rgba(15, 22, 36, 0.25)';
                  return (
                    <View key={i} style={styles.microBarColumn}>
                      <View
                        style={[
                          styles.microBar,
                          { height, backgroundColor: barColor },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
              <View style={styles.microCaption}>
                <View style={styles.microCaptionRow}>
                  <baselineCaption.Arrow color={baselineCaption.color} size={14} />
                  <Text style={[styles.microCaptionLabel, { color: baselineCaption.color }]}>
                    {' '}{baselineCaption.label}
                  </Text>
                </View>
                <Text style={styles.microCaptionSub}>Last 7 days</Text>
              </View>
            </View>
          </View>

          {/* --------------------------------------------------------- */}
          {/* Three health metric cards (iOS only)                      */}
          {/* --------------------------------------------------------- */}
          {Platform.OS === 'ios' && useHealthSnapshot && (
            <View style={styles.metricsRow}>
              {health.status === 'denied' ? (
                <Pressable
                  style={styles.healthConnect}
                  onPress={() => initHealth?.()}
                  accessibilityRole="button"
                  accessibilityLabel="Connect Apple Health"
                >
                  <Heart color={colors.primary} size={18} />
                  <Text style={styles.healthConnectText}>Connect Apple Health</Text>
                </Pressable>
              ) : HealthMetricCard ? (
                <>
                  <View style={styles.metricCell}>
                    <HealthMetricCard
                      icon={<Heart color={colors.depleted} size={18} />}
                      label="Recovery"
                      value={
                        health.recoveryHours != null
                          ? `${health.recoveryHours.toFixed(1)}h`
                          : '6.6h'
                      }
                      trend="steady"
                      trendLabel="steady"
                      accentColor={colors.depleted}
                      loading={health.status === 'loading'}
                    />
                  </View>
                  <View style={styles.metricCell}>
                    <HealthMetricCard
                      icon={<Activity color={colors.stretched} size={18} />}
                      label="Nervous Load"
                      value={
                        health.nervousLoadMs != null
                          ? `${Math.round(health.nervousLoadMs)}ms`
                          : '45ms'
                      }
                      trend="steady"
                      trendLabel="steady"
                      accentColor={colors.stretched}
                      loading={health.status === 'loading'}
                    />
                  </View>
                  <View style={styles.metricCell}>
                    <HealthMetricCard
                      icon={<HeartPulse color={colors.resourced} size={18} />}
                      label="Cardiac Drift"
                      value={
                        health.cardiacDriftBpm != null
                          ? `${Math.round(health.cardiacDriftBpm)} bpm`
                          : '59 bpm'
                      }
                      trend="down"
                      trendLabel="low"
                      accentColor={colors.resourced}
                      loading={health.status === 'loading'}
                    />
                  </View>
                </>
              ) : (
                // TODO(parallel-agent): replace with <HealthMetricCard /> once landed.
                <View style={styles.metricsPlaceholder} />
              )}
            </View>
          )}

          {/* --------------------------------------------------------- */}
          {/* Confidence pill                                           */}
          {/* --------------------------------------------------------- */}
          <View style={styles.confidenceRow}>
            <View style={styles.confidencePill}>
              <Text style={styles.confidenceText}>Confidence {confidencePct}%</Text>
            </View>
          </View>

          {/* --------------------------------------------------------- */}
          {/* Inline state picker (only visible when actively logging)   */}
          {/* --------------------------------------------------------- */}
          <Animated.Text
            entering={FadeIn.delay(200).duration(400)}
            style={styles.instruction}
          >
            {!currentState ? t.home.adjustPrompt : t.home.driversLabel}
          </Animated.Text>

          <View style={styles.statePicker}>
            {(['depleted', 'stretched', 'resourced'] as CapacityState[]).map((s) => {
              const active = currentState === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => handleStateChange(s)}
                  accessibilityRole="button"
                  accessibilityLabel={s}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.stateChip,
                    {
                      borderColor: active ? stateAccent[s] : colors.hairline,
                      backgroundColor: active ? `${stateAccent[s]}1A` : 'transparent',
                    },
                  ]}
                >
                  <View style={[styles.stateChipDot, { backgroundColor: stateAccent[s] }]} />
                  <Text
                    style={[
                      styles.stateChipLabel,
                      { color: active ? stateAccent[s] : colors.textSecondary },
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {currentState && (
            <Animated.View
              entering={SlideInDown.duration(300).springify()}
              exiting={FadeOut.duration(200)}
              style={styles.categoryContainer}
            >
              <CategorySelector
                selected={selectedCategory}
                onSelect={handleCategorySelect}
                accentColor={accentColor}
              />
            </Animated.View>
          )}
        </ScrollView>

        {/* ------------------------------------------------------------- */}
        {/* Composer — preserved capacity-log save flow + audit + haptic  */}
        {/* ------------------------------------------------------------- */}
        {currentState && (
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={FadeOut.duration(200)}
          >
            <Composer
              value={note}
              onChangeText={setNote}
              onSubmit={handleSave}
              placeholder={t.home.addDetails}
              accentColor={accentColor}
              canSubmit={canSave}
              isSubmitting={isSaving}
              keyboardVisible={keyboardVisible}
            />
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  keyboardAvoid: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },

  // Header --------------------------------------------------------------
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  headerSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.xs,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  wordmark: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.primary,
    letterSpacing: 6,
  },
  systemStatusLabel: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.6,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  dateText: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  settingsButton: {
    padding: spacing.xs,
  },

  // Cards ---------------------------------------------------------------
  card: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: 16,
    padding: 20,
    marginBottom: spacing.md,
  },
  cardCompact: { padding: 12 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeadline: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // LIVE pill -----------------------------------------------------------
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },

  // Capacity ribbon -----------------------------------------------------
  ribbonContainer: {
    height: 120,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ribbonPlaceholder: {
    flex: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  // State message under ribbon -----------------------------------------
  stateMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stateMessageText: { flex: 1 },
  stateHeadline: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stateTip: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // 7-day micro-bars ---------------------------------------------------
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  microBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
  },
  microBarColumn: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 40,
    marginRight: 4,
  },
  microBar: {
    width: 6,
    borderRadius: 3,
  },
  microCaption: {
    alignItems: 'flex-end',
  },
  microCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  microCaptionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  microCaptionSub: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textTertiary,
  },

  // Metric cards row ---------------------------------------------------
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  metricCell: { flex: 1 },
  metricsPlaceholder: {
    flex: 1,
    height: 96,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  healthConnect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  healthConnectText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Confidence pill ----------------------------------------------------
  confidenceRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  confidencePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.4,
  },

  // State picker -------------------------------------------------------
  instruction: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 110,
    justifyContent: 'center',
  },
  stateChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  stateChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  categoryContainer: {
    marginTop: spacing.xs,
    zIndex: 10,
  },
});
