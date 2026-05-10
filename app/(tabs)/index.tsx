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
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { Settings, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SavePulse, CategorySelector, Composer, COMPOSER_HEIGHT, ModeInsightsPanel, OrgRoleBanner } from '../../components';
import { GlassOrb } from '../../components/GlassOrb';

// Dynamically load ClinicalGauge — falls back to GlassOrb when native Skia module isn't available.
// Same dynamic-require pattern as the previous ClinicalOrb load: keeps non-Skia
// build configurations (web preview, certain expo-go variants) working.
let ClinicalGaugeComponent: typeof import('../../components/orb/ClinicalGauge').default | null = null;
try {
  ClinicalGaugeComponent = require('../../components/orb/ClinicalGauge').default;
} catch {
  // RNSkiaModule not in this build — GlassOrb will be used instead
}
import { colors, commonStyles, spacing } from '../../theme';
import { CapacityState, Category } from '../../types';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { useLocale } from '../../lib/hooks/useLocale';
import { useDemoMode, FOUNDER_DEMO_ENABLED } from '../../lib/hooks/useDemoMode';
import { useAppMode } from '../../lib/hooks/useAppMode';
import { useTutorial } from '../../lib/hooks/useTutorial';
import { useSubscription, shouldBypassSubscription } from '../../lib/subscription';
import { useGlassStyle } from '../../lib/hooks/useAccessibility';
import { useOptionalSubBrand } from '../../lib/platform/SubBrandProvider';
import { recordAuditEvent } from '../../lib/platform/trustCore';
import { Locale } from '../../locales';

function formatDate(locale: Locale): string {
  const localeCode = locale === 'es' ? 'es-MX' : 'en-US';
  return new Date().toLocaleDateString(localeCode, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

const stateColors: Record<CapacityState, string> = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // FOUNDER-ONLY: Demo param only works when EXPO_PUBLIC_FOUNDER_DEMO=1
  const forceDemo = FOUNDER_DEMO_ENABLED && params.demo === '1';
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const { hasSeenTutorial, isLoading: tutorialLoading } = useTutorial();
  const { logs, saveEntry, refresh, currentMonthSignalCount, hasHitSignalLimit, signalsRemaining } = useEnergyLogs();
  const { t, locale } = useLocale();
  const { isDemoMode, enableDemoMode, reseedDemoData } = useDemoMode();
  const { modeConfig, currentMode } = useAppMode();
  const { isPro, hasAccess } = useSubscription();
  // Audit Phase 5 followup B4: glass surfaces should respect Reduce Transparency.
  // The signalBar is one of the most prominent glass surfaces on the home tab —
  // demoing the useGlassStyle() pattern here.
  const glassStyle = useGlassStyle();
  // Sub-brand posture — when auditLogging is on (workspace/enterprise/health/
  // edu/gov), capacity saves emit an audit event. `useOptionalSubBrand`
  // returns null if the home tab is somehow rendered above the provider —
  // we degrade silently rather than crash.
  const subBrandCtx = useOptionalSubBrand();
  const posture = subBrandCtx?.posture;
  const bypassesSubscription = shouldBypassSubscription(currentMode);
  const canLogSignal = bypassesSubscription || isPro || !hasHitSignalLimit;
  const [currentState, setCurrentState] = useState<CapacityState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const headerScale = useSharedValue(1);
  const headerOpacity = useSharedValue(1);
  const capacityShared = useSharedValue(0.82);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        headerScale.value = withTiming(0.85, { duration: 250 });
        headerOpacity.value = withTiming(0.4, { duration: 250 });
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

  const welcomeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(headerOpacity.value, [0.4, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(headerScale.value, [0.85, 1], [-20, 0], Extrapolation.CLAMP) }],
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

  const signalData = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const prevWeekStart = weekAgo - 7 * 24 * 60 * 60 * 1000;

    const todayLogs = logs.filter((log) => log.timestamp >= todayStart);
    const weekLogs = logs.filter((log) => log.timestamp >= weekAgo);
    const prevWeekLogs = logs.filter((log) => log.timestamp >= prevWeekStart && log.timestamp < weekAgo);

    const stateToPercent = (state: CapacityState) => {
      if (state === 'resourced') return 100;
      if (state === 'stretched') return 50;
      return 0;
    };

    const todayAvg = todayLogs.length > 0
      ? Math.round(todayLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / todayLogs.length)
      : null;

    const weekAvg = weekLogs.length > 0
      ? weekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / weekLogs.length
      : null;
    const prevWeekAvg = prevWeekLogs.length > 0
      ? prevWeekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / prevWeekLogs.length
      : null;

    let trend: 'up' | 'down' | 'stable' | null = null;
    if (logs.length >= 14 && weekAvg !== null && prevWeekAvg !== null) {
      const diff = weekAvg - prevWeekAvg;
      if (diff > 8) trend = 'up';
      else if (diff < -8) trend = 'down';
      else trend = 'stable';
    }

    const todayDepletedCount = todayLogs.filter((log) => log.state === 'depleted').length;
    const hasAlert = todayDepletedCount >= 2;
    const totalSignals = logs.length;

    return { todayAvg, trend, hasAlert, totalSignals };
  }, [logs]);

  const handleStateChange = useCallback((state: CapacityState) => {
    setCurrentState(state);
  }, []);

  // Bridge between discrete CapacityState (the persisted schema) and the gauge's
  // continuous 0..1 value. The neutral midpoint (0.82) mirrors the previous
  // ClinicalOrb default — it keeps the needle in "resourced" range until the
  // user has explicitly logged a state.
  const currentCapacityNumber = useMemo(() => {
    if (currentState === 'depleted') return 0.18;
    if (currentState === 'stretched') return 0.5;
    if (currentState === 'resourced') return 0.82;
    return 0.82;
  }, [currentState]);

  // Keep the shared value in sync with the discrete state so the needle
  // animates smoothly whenever state changes (including resets after save).
  useEffect(() => {
    capacityShared.value = withSpring(currentCapacityNumber, {
      damping: 18,
      stiffness: 110,
      mass: 1,
    });
  }, [currentCapacityNumber]);

  // VoiceOver / Switch Control / AssistiveTouch increment + decrement come
  // through here. The gauge itself already snaps `next` to GAUGE_A11Y_STEP
  // (5%); we additionally snap onto the discrete CapacityState bands so the
  // existing capacity_logs schema remains source-of-truth.
  const handleGaugeCapacityChange = useCallback((next: number) => {
    capacityShared.value = next;
    if (next < 0.33) handleStateChange('depleted');
    else if (next <= 0.66) handleStateChange('stretched');
    else handleStateChange('resourced');
  }, [capacityShared, handleStateChange]);

  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  }, []);

  const canSave = currentState !== null;
  const accentColor = currentState ? stateColors[currentState] : colors.good;

  const handleSave = useCallback(async () => {
    if (currentState && !isSaving && canLogSignal) {
      Keyboard.dismiss();
      setIsSaving(true);
      setSaveTrigger((prev) => prev + 1);

      try {
        const tags = selectedCategory ? [selectedCategory] : [];
        const trimmedNote = note.trim() || undefined;
        await saveEntry(currentState, tags, trimmedNote, trimmedNote);
        // Posture-driven audit hook. Currently only one representative call
        // — full coverage (memory edits, permission grants, etc.) is a
        // followup. Wrapped in try/catch so audit failures never break the
        // primary save flow.
        if (posture?.auditLogging) {
          try {
            await recordAuditEvent({ action: 'capacity.log', target: 'self' });
          } catch (err) {
            if (__DEV__) console.warn('[home] audit failed', err);
          }
        }
        // HIG: confirm successful capacity log with a system success haptic (iOS only).
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
      <SafeAreaView style={[commonStyles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#00E5FF" size="large" />
      </SafeAreaView>
    );
  }

  if (hasSeenTutorial === false) {
    return <Redirect href="/tutorial" />;
  }

  const composerBottomPadding = currentState ? COMPOSER_HEIGHT + insets.bottom + spacing.md : spacing.md;

  return (
    <SafeAreaView style={commonStyles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <Pressable onPress={() => router.push('/upgrade')} style={styles.plansButton}>
            <Sparkles color="#FFD700" size={22} />
          </Pressable>
          <Text style={[styles.title, { color: `${modeConfig.accentColor}CC` }]}>Orbital</Text>
          <Pressable onPress={() => router.push('/settings')} style={styles.settingsButton}>
            <Settings color={colors.textSecondary} size={24} />
          </Pressable>
        </Animated.View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: composerBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={!keyboardVisible}
        >
          <View style={styles.content}>
            <Animated.View style={[styles.welcomeSection, welcomeAnimatedStyle]}>
              <Text style={styles.welcomeText}>{t.home.title}</Text>
              <Text style={styles.dateText}>{formatDate(locale)}</Text>
            </Animated.View>

            {/* Org Role Banner - shows participant status for org modes */}
            <OrgRoleBanner mode={currentMode} compact />

            {/* Mode-specific insights panel */}
            {currentMode !== 'personal' && (
              <ModeInsightsPanel logs={logs} />
            )}

            <View style={[
              styles.signalBar,
              glassStyle,
              { borderColor: `${modeConfig.accentColor}20` },
            ]}>
              <View style={styles.signalItem}>
                <Text style={styles.signalLabel}>{t.core.today.toUpperCase()}</Text>
                <Text style={[
                  styles.signalValue,
                  signalData.todayAvg !== null && {
                    color: signalData.todayAvg >= 70 ? modeConfig.accentColor : signalData.todayAvg >= 40 ? '#E8A830' : '#F44336'
                  }
                ]}>
                  {signalData.todayAvg !== null ? signalData.todayAvg + '%' : '—'}
                </Text>
              </View>
              <View style={styles.signalDivider} />
              <View style={styles.signalItem}>
                <Text style={styles.signalLabel}>{t.core.trend.toUpperCase()}</Text>
                <View style={styles.signalIconRow}>
                  {signalData.trend === 'up' && <TrendingUp size={16} color={modeConfig.accentColor} />}
                  {signalData.trend === 'down' && <TrendingDown size={16} color="#F44336" />}
                  {signalData.trend === 'stable' && <Minus size={16} color="#E8A830" />}
                  {signalData.trend === null && <Minus size={16} color="rgba(255,255,255,0.3)" />}
                </View>
              </View>
              <View style={styles.signalDivider} />
              <View style={styles.signalItem}>
                <Text style={styles.signalLabel}>{t.core.signals.toUpperCase()}</Text>
                <Text style={[styles.signalValue, signalData.totalSignals > 0 && { color: 'rgba(255,255,255,0.85)' }]}>
                  {signalData.totalSignals}
                </Text>
              </View>
            </View>

            <Animated.Text entering={FadeIn.delay(200).duration(400)} style={styles.instruction}>
              {!currentState ? t.home.adjustPrompt : t.home.driversLabel}
            </Animated.Text>

            <View style={styles.orbContainer}>
              {currentState && <SavePulse trigger={saveTrigger} state={currentState} />}
              {ClinicalGaugeComponent ? (
                <ClinicalGaugeComponent
                  capacity={capacityShared}
                  currentCapacity={currentCapacityNumber}
                  onCapacityChange={handleGaugeCapacityChange}
                  showReadout={false}
                />
              ) : (
                <GlassOrb state={currentState} onStateChange={handleStateChange} onSave={handleSave} />
              )}
            </View>

            {currentState && (
              <Animated.View
                entering={SlideInDown.duration(300).springify()}
                exiting={FadeOut.duration(200)}
                style={styles.categoryContainer}
              >
                <CategorySelector selected={selectedCategory} onSelect={handleCategorySelect} accentColor={accentColor} />
              </Animated.View>
            )}
          </View>
        </ScrollView>

        {currentState && (
          <Animated.View entering={SlideInDown.duration(300).springify()} exiting={FadeOut.duration(200)}>
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

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  plansButton: { padding: spacing.sm },
  title: {
    fontSize: 22,
    fontWeight: '200',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 229, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  settingsButton: { padding: spacing.sm },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: spacing.md },
  welcomeSection: { alignItems: 'center', marginBottom: spacing.md },
  welcomeText: { fontSize: 18, fontWeight: '300', color: 'rgba(255, 255, 255, 0.9)', letterSpacing: 0.5 },
  dateText: { fontSize: 12, fontWeight: '400', color: 'rgba(255, 255, 255, 0.4)', marginTop: 4 },
  signalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  signalItem: { alignItems: 'center', paddingHorizontal: spacing.md, minWidth: 70 },
  signalLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  signalValue: { fontSize: 16, fontWeight: '300', color: 'rgba(255,255,255,0.5)' },
  signalIconRow: { flexDirection: 'row', alignItems: 'center' },
  signalDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  instruction: { fontSize: 14, fontWeight: '400', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: 0.5, marginBottom: spacing.sm, textAlign: 'center' },
  // Gauge is ~320×76; we pad vertically so the composer/category container
  // doesn't crowd the gauge after the orb→gauge swap.
  orbContainer: { justifyContent: 'center', alignItems: 'center', zIndex: 1, paddingVertical: spacing.lg },
  categoryContainer: { marginTop: spacing.md, zIndex: 10 },
  // Signal limit banner styles
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
  },
  limitBannerBlocked: {
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderColor: 'rgba(244,67,54,0.3)',
  },
  limitBannerText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  limitBannerTextBlocked: {
    fontSize: 12,
    color: '#F44336',
  },
  limitBannerLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  limitBannerLinkBlocked: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
  },
});
