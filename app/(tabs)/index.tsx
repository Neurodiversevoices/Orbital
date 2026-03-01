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

const SLIDER_WIDTH = 260;
const THUMB_SIZE = 24;
const INITIAL_CAPACITY = 0.82;

const stateColors: Record<CapacityState, string> = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // FOUNDER-ONLY: Demo param only works when EXPO_PUBLIC_FOUNDER_DEMO=1
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
  const sliderStartX = useSharedValue(0);
  const sliderX = useSharedValue(
    (1 - INITIAL_CAPACITY) * (SLIDER_WIDTH - THUMB_SIZE),
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
  // CAPACITY SLIDER
  // ═══════════════════════════════════════════════════════════════════

  const sliderGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      sliderStartX.value = sliderX.value;
    })
    .onUpdate((e) => {
      'worklet';
      const newX = Math.max(
        0,
        Math.min(SLIDER_WIDTH - THUMB_SIZE, sliderStartX.value + e.translationX),
      );
      sliderX.value = newX;
      // Left = 1.0 (resourced), Right = 0.0 (depleted)
      capacityShared.value = 1 - newX / (SLIDER_WIDTH - THUMB_SIZE);
    })
    .onEnd(() => {
      'worklet';
      const cap = capacityShared.value;
      const snapped = Math.round(cap * 20) / 20; // snap to 0.05
      const clamped = Math.max(0, Math.min(1, snapped));
      capacityShared.value = withSpring(clamped, {
        damping: 20,
        stiffness: 150,
      });
      sliderX.value = withSpring(
        (1 - clamped) * (SLIDER_WIDTH - THUMB_SIZE),
        { damping: 20, stiffness: 150 },
      );
      // Derive discrete state for saving
      const state: CapacityState =
        clamped >= 0.7
          ? 'resourced'
          : clamped >= 0.4
            ? 'stretched'
            : 'depleted';
      runOnJS(setCurrentState)(state);
    });

  // Slider animated styles
  const thumbTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value }],
  }));

  const thumbColorStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      capacityShared.value,
      [0, 0.4, 0.7, 1],
      ['#F44336', '#E8A830', '#2DD4BF', '#00E5FF'],
    );
    return { backgroundColor: bg as string };
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
        }, 600);
      } catch (error) {
        if (__DEV__) console.error('Failed to save:', error);
        setIsSaving(false);
      }
    }
  }, [currentState, selectedCategory, note, isSaving, saveEntry, canLogSignal]);

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
            {/* ─── ORB — hero element, fully visible ─── */}
            <View style={styles.orbContainer}>
              {currentState && (
                <SavePulse trigger={saveTrigger} state={currentState} />
              )}
              <ShaderOrb size={280} capacity={capacityShared} />
            </View>

            {/* ─── CAPACITY SLIDER ─── */}
            <View style={styles.sliderSection}>
              <GestureDetector gesture={sliderGesture}>
                <Animated.View style={styles.sliderTouchArea}>
                  {/* Spectrum track: cyan → teal → amber → crimson */}
                  <View style={styles.sliderTrack}>
                    <View
                      style={[styles.sliderSeg, { backgroundColor: '#00E5FF' }]}
                    />
                    <View
                      style={[styles.sliderSeg, { backgroundColor: '#2DD4BF' }]}
                    />
                    <View
                      style={[styles.sliderSeg, { backgroundColor: '#F5B700' }]}
                    />
                    <View
                      style={[styles.sliderSeg, { backgroundColor: '#F44336' }]}
                    />
                  </View>
                  {/* Draggable thumb */}
                  <Animated.View
                    style={[
                      styles.sliderThumb,
                      thumbTranslateStyle,
                      thumbColorStyle,
                    ]}
                  >
                    <View style={styles.sliderThumbInner} />
                  </Animated.View>
                </Animated.View>
              </GestureDetector>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>RESOURCED</Text>
                <Text style={styles.sliderLabelText}>DEPLETED</Text>
              </View>
            </View>

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
  // ─── Orb ───
  orbContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  // ─── Capacity Slider ───
  sliderSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  sliderTouchArea: {
    width: SLIDER_WIDTH,
    height: 44,
    justifyContent: 'center',
  },
  sliderTrack: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    opacity: 0.45,
  },
  sliderSeg: { flex: 1 },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: (44 - THUMB_SIZE) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sliderThumbInner: {
    width: THUMB_SIZE - 8,
    height: THUMB_SIZE - 8,
    borderRadius: (THUMB_SIZE - 8) / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH,
    marginTop: 2,
  },
  sliderLabelText: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
  },
  // ─── Category / Tags ───
  categoryContainer: {
    marginTop: spacing.sm,
    zIndex: 10,
  },
});
