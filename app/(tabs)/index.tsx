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
  Dimensions,
  AccessibilityActionEvent,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  useFrameCallback,
  useAnimatedReaction,
  interpolate,
  interpolateColor,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { Settings, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  SavePulse,
  CategorySelector,
  Composer,
  COMPOSER_HEIGHT,
  ModeInsightsPanel,
  OrgRoleBanner,
} from '../../components';
import ShaderOrb from '../../components/orb/ShaderOrb';
import ShaderTherm from '../../components/orb/ShaderTherm';
import { colors, commonStyles, spacing } from '../../theme';
import { CapacityState, Category } from '../../types';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { useLocale } from '../../lib/hooks/useLocale';
import { useDemoMode, FOUNDER_DEMO_ENABLED } from '../../lib/hooks/useDemoMode';
import { useAppMode } from '../../lib/hooks/useAppMode';
import { useTutorial } from '../../lib/hooks/useTutorial';
import { useSubscription, shouldBypassSubscription } from '../../lib/subscription';
import { Locale } from '../../locales';

function formatDate(locale: Locale): string {
  const localeCode = locale === 'es' ? 'es-MX' : 'en-US';
  return new Date().toLocaleDateString(localeCode, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// CONSTANTS
// =============================================================================

const INITIAL_CAPACITY = 0.82;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.82;
const ORB_HIT_PADDING = 20; // Extra touch forgiveness around orb
const ORB_HIT_SIZE = ORB_SIZE + ORB_HIT_PADDING * 2; // 320x320

// Drag range: 40% of screen width for full 0→1 traversal
const DRAG_RANGE = Dimensions.get('window').width * 0.4;

// Three-detent snap positions
const DETENT_RESOURCED = 1.0;
const DETENT_STRETCHED = 0.5;
const DETENT_DEPLETED = 0.0;

// State thresholds (equal thirds)
const THRESHOLD_RESOURCED = 0.67;
const THRESHOLD_STRETCHED = 0.33;

// Spring physics for detent settlement
const SETTLE_SPRING = {
  damping: 20,
  stiffness: 180,
  mass: 1,
  overshootClamping: true,
};

const stateColors: Record<CapacityState, string> = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
};

// Display labels — "ELEVATED" is the visual label for internal 'stretched' state
const stateLabels: Record<CapacityState, string> = {
  resourced: 'RESOURCED',
  stretched: 'ELEVATED',
  depleted: 'DEPLETED',
};

// =============================================================================
// HELPERS
// =============================================================================

/** Derive CapacityState from a capacity value using equal-thirds thresholds */
function capacityToState(cap: number): CapacityState {
  'worklet';
  if (cap >= THRESHOLD_RESOURCED) return 'resourced';
  if (cap >= THRESHOLD_STRETCHED) return 'stretched';
  return 'depleted';
}

/** Find nearest detent for a given capacity value */
function nearestDetent(cap: number): number {
  'worklet';
  const detents = [DETENT_DEPLETED, DETENT_STRETCHED, DETENT_RESOURCED];
  let nearest = detents[0];
  let minDist = Math.abs(cap - detents[0]);
  for (let i = 1; i < detents.length; i++) {
    const d = Math.abs(cap - detents[i]);
    if (d < minDist) {
      minDist = d;
      nearest = detents[i];
    }
  }
  return nearest;
}

/** Rubberband resistance when dragging past bounds */
function rubberband(raw: number): number {
  'worklet';
  if (raw < 0.0) {
    return -0.1 * (1 - Math.exp(raw));
  } else if (raw > 1.0) {
    return 1.0 + 0.1 * (1 - Math.exp(-(raw - 1.0)));
  }
  return raw;
}

// =============================================================================
// COMPONENT
// =============================================================================

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
  const { modeConfig, currentMode } = useAppMode();
  const { isPro } = useSubscription();
  const bypassesSubscription = shouldBypassSubscription(currentMode);
  const canLogSignal = bypassesSubscription || isPro || !hasHitSignalLimit;

  // ─── State ──────────────────────────────────────────────────────────
  const [currentState, setCurrentState] = useState<CapacityState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // ─── Shared Values ──────────────────────────────────────────────────
  const headerScale = useSharedValue(1);
  const headerOpacity = useSharedValue(1);
  const capacityShared = useSharedValue(INITIAL_CAPACITY);
  const dragStartCapacity = useSharedValue(INITIAL_CAPACITY);
  const labelOpacity = useSharedValue(0); // 0 = hidden (no interaction yet), 1 = visible
  const isDragging = useSharedValue(false);

  // Track previous "zone" for haptic threshold crossing (0, 1, or 2)
  const prevZone = useSharedValue(-1); // -1 = uninitialized

  // ─── Orb↔Therm mode switching ─────────────────────────────────────
  const orbClock = useSharedValue(0);
  const mode = useSharedValue(0.0); // 0.0 = orb, 1.0 = therm
  const crossfadeOrb = useSharedValue(1.0);
  const crossfadeTherm = useSharedValue(0.0);
  const modeDragStart = useSharedValue(0.0);
  const lastModeHapticTime = useSharedValue(0);

  // ═══════════════════════════════════════════════════════════════════
  // HAPTIC CALLBACKS (must run on JS thread, defined before animated reactions)
  // ═══════════════════════════════════════════════════════════════════

  const fireThresholdHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const fireSettleHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const fireModeHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // ─── Lifted clock — single render loop for Orb + Therm ─────────────
  useFrameCallback((info) => {
    orbClock.value = (info.timeSinceFirstFrame ?? 0) / 1000;
  });

  // ─── Crossfade derivation — driven by mode ────────────────────────
  useAnimatedReaction(
    () => mode.value,
    (modeVal) => {
      crossfadeOrb.value = 1.0 - modeVal;
      crossfadeTherm.value = modeVal;
    },
  );

  // ─── Mode haptic — fires at 0.75 crossing, 200ms cooldown ────────
  useAnimatedReaction(
    () => mode.value,
    (current, previous) => {
      if (previous === null || previous === undefined) return;

      const crossedUp = previous < 0.75 && current >= 0.75;
      const crossedDown = previous >= 0.75 && current < 0.75;

      if (crossedUp || crossedDown) {
        // Suppress during settle (abs(mode - target) < 0.005)
        const target = current > 0.5 ? 1.0 : 0.0;
        if (Math.abs(current - target) < 0.005) return;

        // 200ms cooldown via orbClock (seconds)
        const now = orbClock.value;
        if (now - lastModeHapticTime.value > 0.2) {
          lastModeHapticTime.value = now;
          runOnJS(fireModeHaptic)();
        }
      }
    },
  );

  // ─── Keyboard handling ──────────────────────────────────────────────
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        headerScale.value = withTiming(0.85, { duration: 250 });
        headerOpacity.value = withTiming(0.4, { duration: 250 });
      },
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        headerScale.value = withTiming(1, { duration: 250 });
        headerOpacity.value = withTiming(1, { duration: 250 });
      },
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
    transform: [
      {
        translateY: interpolate(headerScale.value, [0.85, 1], [-20, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  // ─── Demo mode seeding ──────────────────────────────────────────────
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

    const todayAvg =
      todayLogs.length > 0
        ? Math.round(
            todayLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / todayLogs.length,
          )
        : null;

    const weekAvg =
      weekLogs.length > 0
        ? weekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / weekLogs.length
        : null;
    const prevWeekAvg =
      prevWeekLogs.length > 0
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

  // ═══════════════════════════════════════════════════════════════════
  // DIRECT MANIPULATION GESTURE — Orb is the input
  // ═══════════════════════════════════════════════════════════════════

  const orbGesture = Gesture.Pan()
    // Only activate on horizontal movement — let vertical scroll through
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onBegin(() => {
      'worklet';
      dragStartCapacity.value = capacityShared.value;
      isDragging.value = true;
      labelOpacity.value = withTiming(0, { duration: 150 });

      // Initialize zone tracking
      const cap = capacityShared.value;
      if (cap >= THRESHOLD_RESOURCED) prevZone.value = 2;
      else if (cap >= THRESHOLD_STRETCHED) prevZone.value = 1;
      else prevZone.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      // Drag LEFT = increase capacity, drag RIGHT = decrease capacity
      const rawCapacity = dragStartCapacity.value - (e.translationX / DRAG_RANGE);

      // Apply rubberband at bounds
      capacityShared.value = rubberband(rawCapacity);

      // Check for zone crossing → haptic
      const clamped = Math.max(0, Math.min(1, rawCapacity));
      let currentZone: number;
      if (clamped >= THRESHOLD_RESOURCED) currentZone = 2;
      else if (clamped >= THRESHOLD_STRETCHED) currentZone = 1;
      else currentZone = 0;

      if (currentZone !== prevZone.value && prevZone.value >= 0) {
        runOnJS(fireThresholdHaptic)();
      }
      prevZone.value = currentZone;
    })
    .onEnd(() => {
      'worklet';
      // Clamp back from rubberband and snap to nearest detent
      const clamped = Math.max(0, Math.min(1, capacityShared.value));
      const target = nearestDetent(clamped);

      capacityShared.value = withSpring(target, SETTLE_SPRING);
      isDragging.value = false;

      // Show state label
      labelOpacity.value = withTiming(1, { duration: 200 });

      // Derive discrete state for saving
      const state = capacityToState(target) as CapacityState;
      runOnJS(setCurrentState)(state);
      runOnJS(fireSettleHaptic)();
    });

  // ═══════════════════════════════════════════════════════════════════
  // MODE SWITCH GESTURE — vertical drag toggles Orb↔Therm
  // ═══════════════════════════════════════════════════════════════════

  const MODE_DRAG_DISTANCE = 150; // pixels for full 0→1 traversal

  const modeGesture = Gesture.Pan()
    .activeOffsetY([-20, 20])
    .failOffsetX([-15, 15])
    .onBegin(() => {
      'worklet';
      modeDragStart.value = mode.value;
    })
    .onUpdate((e) => {
      'worklet';
      // Drag UP (negative translationY) → therm (1.0)
      // Drag DOWN (positive translationY) → orb (0.0)
      const raw = modeDragStart.value - (e.translationY / MODE_DRAG_DISTANCE);
      mode.value = Math.max(0, Math.min(1, raw));
    })
    .onEnd(() => {
      'worklet';
      const target = mode.value > 0.5 ? 1.0 : 0.0;
      mode.value = withSpring(target, {
        damping: 20,
        stiffness: 180,
        mass: 1,
        overshootClamping: true,
      });
    });

  // Compose: horizontal = capacity, vertical = mode switch
  const composedGesture = Gesture.Race(orbGesture, modeGesture);

  // ─── State label animated style ───────────────────────────────────
  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  // ─── State label color (driven by capacity) ──────────────────────
  const labelColorStyle = useAnimatedStyle(() => {
    const c = interpolateColor(
      capacityShared.value,
      [0, 0.33, 0.67, 1],
      ['rgba(244,67,54,0.6)', 'rgba(232,168,48,0.6)', 'rgba(232,168,48,0.6)', 'rgba(0,229,255,0.6)'],
    );
    return { color: c as string };
  });

  /** Capacity-tinted drop shadow under the orb (matches shader ramp) */
  const orbDropShadowStyle = useAnimatedStyle(() => {
    const shadowColor = interpolateColor(
      capacityShared.value,
      [0, 0.5, 1],
      ['#D11A1A', '#E0AD1F', '#0DC6D9'],
    );
    return {
      shadowColor: shadowColor as string,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.6,
      shadowRadius: 40,
      elevation: 28,
    };
  });

  // ─── Handlers ──────────────────────────────────────────────────────

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
        setTimeout(() => {
          setCurrentState(null);
          setSelectedCategory(null);
          setNote('');
          setIsSaving(false);
          // Hide label after save
          labelOpacity.value = withTiming(0, { duration: 200 });
        }, 600);
      } catch (error) {
        if (__DEV__) console.error('Failed to save:', error);
        setIsSaving(false);
      }
    }
  }, [currentState, selectedCategory, note, isSaving, saveEntry, canLogSignal]);

  // ─── Accessibility: increment/decrement by one state ──────────────
  const handleAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    const action = event.nativeEvent.actionName;
    const current = capacityShared.value;
    let target: number;

    if (action === 'increment') {
      // Step up by 0.5 (one state toward resourced)
      target = Math.min(1.0, nearestDetent(current) + 0.5);
    } else if (action === 'decrement') {
      // Step down by 0.5 (one state toward depleted)
      target = Math.max(0.0, nearestDetent(current) - 0.5);
    } else {
      return;
    }

    capacityShared.value = withSpring(target, SETTLE_SPRING);
    labelOpacity.value = withTiming(1, { duration: 200 });
    const state = capacityToState(target);
    setCurrentState(state);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ─── Loading / Tutorial gates ──────────────────────────────────────

  if (tutorialLoading) {
    return (
      <SafeAreaView
        style={[
          commonStyles.screen,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator color="#00E5FF" size="large" />
      </SafeAreaView>
    );
  }

  if (hasSeenTutorial === false) {
    return <Redirect href="/tutorial" />;
  }

  const composerBottomPadding = currentState
    ? COMPOSER_HEIGHT + insets.bottom + spacing.md
    : spacing.md;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={commonStyles.screen} edges={['top', 'left', 'right']}>
      {/* Maestro/iOS: testID on SafeAreaView often missing from a11y tree — use inner View */}
      <View style={styles.orbScreenRoot} testID="orb-screen" collapsable={false}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ─── HEADER (minimal) ─── */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <Pressable
            onPress={() => router.push('/upgrade')}
            style={styles.plansButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Plans"
            testID="open-plans"
          >
            {/* Hide SVG subtree from a11y so Pressable label is the only element (Maestro / VoiceOver). */}
            <View accessibilityElementsHidden>
              <Sparkles color="#FFD700" size={22} />
            </View>
          </Pressable>
          <Text style={[styles.title, { color: `${modeConfig.accentColor}CC` }]}>Orbital</Text>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Settings"
            testID="open-settings"
          >
            <View accessibilityElementsHidden>
              <Settings color={colors.textSecondary} size={24} />
            </View>
          </Pressable>
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
          <View style={styles.content}>
            <Animated.View style={[styles.welcomeSection, welcomeAnimatedStyle]}>
              <Text style={styles.welcomeText}>{t.home.title}</Text>
              <Text style={styles.dateText}>{formatDate(locale)}</Text>
            </Animated.View>

            <OrgRoleBanner mode={currentMode} compact />

            {currentMode !== 'personal' && <ModeInsightsPanel logs={logs} />}

            <View style={[styles.signalBar, { borderColor: `${modeConfig.accentColor}20` }]}>
              <View style={styles.signalItem}>
                <Text style={styles.signalLabel}>{t.core.today.toUpperCase()}</Text>
                <Text
                  style={[
                    styles.signalValue,
                    signalData.todayAvg !== null && {
                      color:
                        signalData.todayAvg >= 70
                          ? modeConfig.accentColor
                          : signalData.todayAvg >= 40
                            ? '#E8A830'
                            : '#F44336',
                    },
                  ]}
                >
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
                <Text
                  style={[
                    styles.signalValue,
                    signalData.totalSignals > 0 && { color: 'rgba(255,255,255,0.85)' },
                  ]}
                >
                  {signalData.totalSignals}
                </Text>
              </View>
            </View>

            <Animated.Text entering={FadeIn.delay(200).duration(400)} style={styles.instruction}>
              {!currentState ? t.home.adjustPrompt : t.home.driversLabel}
            </Animated.Text>

            {/* ─── ORB — hero element + direct manipulation input ─── */}
            <GestureDetector gesture={composedGesture}>
              <Animated.View
                style={styles.orbGestureTarget}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Capacity input. Swipe left for resourced, right for depleted. Swipe up for thermometer view."
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round((currentState === 'resourced' ? 1.0 : currentState === 'stretched' ? 0.5 : currentState === 'depleted' ? 0.0 : INITIAL_CAPACITY) * 100),
                }}
                accessibilityActions={[
                  { name: 'increment' },
                  { name: 'decrement' },
                ]}
                onAccessibilityAction={handleAccessibilityAction}
              >
                {currentState && (
                  <SavePulse trigger={saveTrigger} state={currentState} />
                )}
                <Animated.View style={[styles.instrumentContainer, orbDropShadowStyle]}>
                  <ShaderOrb
                    size={ORB_SIZE}
                    capacity={capacityShared}
                    externalClock={orbClock}
                    uCrossfade={crossfadeOrb}
                  />
                  <View style={styles.thermOverlay}>
                    <ShaderTherm
                      size={ORB_SIZE}
                      capacity={capacityShared}
                      externalClock={orbClock}
                      uCrossfade={crossfadeTherm}
                    />
                  </View>
                </Animated.View>
              </Animated.View>
            </GestureDetector>

            {/* ─── STATE LABEL ─── */}
            <Animated.View style={[styles.stateLabelWrap, labelAnimatedStyle]}>
              <Animated.Text style={[styles.stateLabel, labelColorStyle]}>
                {currentState ? stateLabels[currentState] : stateLabels.resourced}
              </Animated.Text>
            </Animated.View>

            {/* ─── DRIVER TAGS ─── */}
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
          </View>
        </ScrollView>

        {/* ─── COMPOSER (note + submit) — fixed at bottom ─── */}
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
      </View>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  orbScreenRoot: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 0,
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  welcomeSection: { alignItems: 'center', marginBottom: spacing.md },
  welcomeText: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
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
  signalLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  signalValue: { fontSize: 16, fontWeight: '300', color: 'rgba(255,255,255,0.5)' },
  signalIconRow: { flexDirection: 'row', alignItems: 'center' },
  signalDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  instruction: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  // ─── Orb gesture target ───
  orbGestureTarget: {
    width: ORB_HIT_SIZE,
    height: ORB_HIT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  // ─── Instrument container (Orb + Therm stacked) ───
  instrumentContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: "hidden" as const,
  },
  thermOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
  },
  // ─── State label ───
  stateLabelWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    minHeight: 20,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  // ─── Category / Tags ───
  categoryContainer: {
    marginTop: spacing.sm,
    zIndex: 10,
  },
});
