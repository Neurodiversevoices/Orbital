import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  useFrameCallback,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SavePulse, CategorySelector, Composer, COMPOSER_HEIGHT } from '../../components';
import { ClassificationLabel } from '../../components/ClassificationLabel';
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

// Agent 2 & 3 outputs — import when available
let Avatar: React.ComponentType<{ capacity: Animated.SharedValue<number>; size: number }> | null = null;
let RadarRing: React.ComponentType<{ size: number }> | null = null;
try {
  Avatar = require('../../components/Avatar').Avatar;
} catch {}
try {
  RadarRing = require('../../components/RadarRing').RadarRing;
} catch {}

// =============================================================================
// CONSTANTS
// =============================================================================

const INITIAL_CAPACITY = 0.82;
const ORB_SIZE = 280;
const ORB_HIT_PADDING = 20;
const ORB_HIT_SIZE = ORB_SIZE + ORB_HIT_PADDING * 2;
const AVATAR_SIZE = 48;
const RADAR_SIZE = 340;

// Drag range: 40% of screen width for full 0-1 traversal
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

// =============================================================================
// HELPERS
// =============================================================================

function capacityToState(cap: number): CapacityState {
  'worklet';
  if (cap >= THRESHOLD_RESOURCED) return 'resourced';
  if (cap >= THRESHOLD_STRETCHED) return 'stretched';
  return 'depleted';
}

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
// HEALTHKIT AVAILABILITY HOOK
// =============================================================================

function useHealthKitAvailable(): boolean {
  const [available, setAvailable] = useState(Platform.OS === 'ios');
  // On Android, HealthKit is never available
  // On iOS, assume available (real check would use expo-health)
  return available;
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
  const { saveEntry, refresh, hasHitSignalLimit } = useEnergyLogs();
  const { t } = useLocale();
  const { isDemoMode, enableDemoMode, reseedDemoData } = useDemoMode();
  const { modeConfig, currentMode } = useAppMode();
  const { isPro } = useSubscription();
  const bypassesSubscription = shouldBypassSubscription(currentMode);
  const canLogSignal = bypassesSubscription || isPro || !hasHitSignalLimit;
  const healthKitAvailable = useHealthKitAvailable();

  // --- State ---
  const [currentState, setCurrentState] = useState<CapacityState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // --- Shared Values ---
  const headerScale = useSharedValue(1);
  const headerOpacity = useSharedValue(1);
  const capacityShared = useSharedValue(INITIAL_CAPACITY);
  const dragStartCapacity = useSharedValue(INITIAL_CAPACITY);
  const labelOpacity = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const prevZone = useSharedValue(-1);

  // --- Orb/Therm mode switching ---
  const orbClock = useSharedValue(0);
  const mode = useSharedValue(0.0);
  const crossfadeOrb = useSharedValue(1.0);
  const crossfadeTherm = useSharedValue(0.0);
  const modeDragStart = useSharedValue(0.0);
  const lastModeHapticTime = useSharedValue(0);

  // --- Haptic callbacks ---
  const fireThresholdHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const fireSettleHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const fireModeHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // --- Lifted clock ---
  useFrameCallback((info) => {
    orbClock.value = (info.timeSinceFirstFrame ?? 0) / 1000;
  });

  // --- Crossfade derivation ---
  useAnimatedReaction(
    () => mode.value,
    (modeVal) => {
      crossfadeOrb.value = 1.0 - modeVal;
      crossfadeTherm.value = modeVal;
    },
  );

  // --- Mode haptic ---
  useAnimatedReaction(
    () => mode.value,
    (current, previous) => {
      if (previous === null || previous === undefined) return;
      const crossedUp = previous < 0.75 && current >= 0.75;
      const crossedDown = previous >= 0.75 && current < 0.75;
      if (crossedUp || crossedDown) {
        const target = current > 0.5 ? 1.0 : 0.0;
        if (Math.abs(current - target) < 0.005) return;
        const now = orbClock.value;
        if (now - lastModeHapticTime.value > 0.2) {
          lastModeHapticTime.value = now;
          runOnJS(fireModeHaptic)();
        }
      }
    },
  );

  // --- Keyboard handling ---
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

  // --- Demo mode seeding ---
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

  // --- Direct manipulation gesture ---
  const orbGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onBegin(() => {
      'worklet';
      dragStartCapacity.value = capacityShared.value;
      isDragging.value = true;
      labelOpacity.value = withTiming(0, { duration: 150 });
      const cap = capacityShared.value;
      if (cap >= THRESHOLD_RESOURCED) prevZone.value = 2;
      else if (cap >= THRESHOLD_STRETCHED) prevZone.value = 1;
      else prevZone.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      const rawCapacity = dragStartCapacity.value - (e.translationX / DRAG_RANGE);
      capacityShared.value = rubberband(rawCapacity);
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
      const clamped = Math.max(0, Math.min(1, capacityShared.value));
      const target = nearestDetent(clamped);
      capacityShared.value = withSpring(target, SETTLE_SPRING);
      isDragging.value = false;
      labelOpacity.value = withTiming(1, { duration: 200 });
      const state = capacityToState(target) as CapacityState;
      runOnJS(setCurrentState)(state);
      runOnJS(fireSettleHaptic)();
    });

  // --- Mode switch gesture ---
  const MODE_DRAG_DISTANCE = 150;

  const modeGesture = Gesture.Pan()
    .activeOffsetY([-20, 20])
    .failOffsetX([-15, 15])
    .onBegin(() => {
      'worklet';
      modeDragStart.value = mode.value;
    })
    .onUpdate((e) => {
      'worklet';
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

  const composedGesture = Gesture.Race(orbGesture, modeGesture);

  // --- Handlers ---
  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  }, []);

  const canSave = currentState !== null;
  const stateColors: Record<CapacityState, string> = {
    resourced: '#06B6D4',
    stretched: '#F59E0B',
    depleted: '#DC2626',
  };
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
          labelOpacity.value = withTiming(0, { duration: 200 });
        }, 600);
      } catch (error) {
        if (__DEV__) console.error('Failed to save:', error);
        setIsSaving(false);
      }
    }
  }, [currentState, selectedCategory, note, isSaving, saveEntry, canLogSignal]);

  // --- Accessibility ---
  const handleAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    const action = event.nativeEvent.actionName;
    const current = capacityShared.value;
    let target: number;
    if (action === 'increment') {
      target = Math.min(1.0, nearestDetent(current) + 0.5);
    } else if (action === 'decrement') {
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

  // --- Loading / Tutorial gates ---
  if (tutorialLoading) {
    return (
      <SafeAreaView
        style={[commonStyles.screen, { justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (hasSeenTutorial === false) {
    return <Redirect href="/tutorial" />;
  }

  const composerBottomPadding = currentState
    ? COMPOSER_HEIGHT + insets.bottom + spacing.md
    : spacing.md;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <SafeAreaView style={commonStyles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* HEADER */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          {/* Avatar slot — renders if Agent 2 component exists */}
          <View style={styles.avatarSlot}>
            {Avatar && (
              <Avatar capacity={capacityShared} size={AVATAR_SIZE} />
            )}
          </View>
          <Text style={[styles.title, { color: `${modeConfig.accentColor}CC` }]}>
            Orbital
          </Text>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
          >
            <Settings color={colors.textSecondary} size={24} />
          </Pressable>
        </Animated.View>

        {/* HealthKit-unavailable banner */}
        {!healthKitAvailable && (
          <View style={styles.hkBanner}>
            <Text style={styles.hkBannerText}>
              Connect HealthKit on iPhone for live signals
            </Text>
          </View>
        )}

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
            {/* RADAR RING — background layer behind orb */}
            {RadarRing && (
              <View style={styles.radarContainer}>
                <RadarRing size={RADAR_SIZE} />
              </View>
            )}

            {/* ORB — hero element + direct manipulation input */}
            <GestureDetector gesture={composedGesture}>
              <Animated.View
                style={styles.orbGestureTarget}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Capacity input. Swipe left for resourced, right for depleted. Swipe up for thermometer view."
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(
                    (currentState === 'resourced'
                      ? 1.0
                      : currentState === 'stretched'
                        ? 0.5
                        : currentState === 'depleted'
                          ? 0.0
                          : INITIAL_CAPACITY) * 100,
                  ),
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
                <View style={styles.instrumentContainer}>
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
                </View>
              </Animated.View>
            </GestureDetector>

            {/* CLASSIFICATION LABEL — capacity % only */}
            <View style={styles.labelWrap}>
              <ClassificationLabel
                capacity={capacityShared}
                opacity={labelOpacity}
              />
            </View>

            {/* DRIVER TAGS */}
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

        {/* COMPOSER — fixed at bottom */}
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

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
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
  avatarSlot: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  hkBanner: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  hkBannerText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  radarContainer: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    zIndex: 0,
  },
  orbGestureTarget: {
    width: ORB_HIT_SIZE,
    height: ORB_HIT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    zIndex: 1,
  },
  instrumentContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  thermOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
  },
  labelWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    minHeight: 20,
  },
  categoryContainer: {
    marginTop: spacing.sm,
    zIndex: 10,
  },
});
