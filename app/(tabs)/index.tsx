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
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { Settings, Sparkles } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SavePulse, CategorySelector, Composer, COMPOSER_HEIGHT } from '../../components';
import ShaderOrb from '../../components/orb/ShaderOrb';
import { colors, commonStyles, spacing } from '../../theme';
import { CapacityState, Category } from '../../types';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { useLocale } from '../../lib/hooks/useLocale';
import { useDemoMode, FOUNDER_DEMO_ENABLED } from '../../lib/hooks/useDemoMode';
import { useAppMode } from '../../lib/hooks/useAppMode';
import { useTutorial } from '../../lib/hooks/useTutorial';
import { useSubscription, shouldBypassSubscription } from '../../lib/subscription';

// =============================================================================
// CONSTANTS
// =============================================================================

const INITIAL_CAPACITY = 0.82;
const ORB_SIZE = 280;
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
  const { saveEntry, refresh, hasHitSignalLimit } = useEnergyLogs();
  const { t } = useLocale();
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

  // ═══════════════════════════════════════════════════════════════════
  // HAPTIC CALLBACKS (must run on JS thread)
  // ═══════════════════════════════════════════════════════════════════

  const fireThresholdHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const fireSettleHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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
          >
            <Sparkles color="#FFD700" size={22} />
          </Pressable>
          <Text
            style={[styles.title, { color: `${modeConfig.accentColor}CC` }]}
          >
            Orbital
          </Text>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
          >
            <Settings color={colors.textSecondary} size={24} />
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
            {/* ─── ORB — hero element + direct manipulation input ─── */}
            <GestureDetector gesture={orbGesture}>
              <Animated.View
                style={styles.orbGestureTarget}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Capacity input. Swipe left for resourced, right for depleted."
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
                <ShaderOrb size={ORB_SIZE} capacity={capacityShared} />
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
  // ─── Orb gesture target ───
  orbGestureTarget: {
    width: ORB_HIT_SIZE,
    height: ORB_HIT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
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
