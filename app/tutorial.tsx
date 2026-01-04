import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  BarChart2,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react-native';
import { colors, spacing } from '../theme';
import { useTutorial } from '../lib/hooks/useTutorial';
import { useWhyOrbital } from '../lib/hooks/useWhyOrbital';

// NOTE: Why Orbital screen marks itself as seen when dismissed.
// We only check hasSeenWhyOrbital here, we don't pre-mark it.

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  title: string;
  description: string;
  hint: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to Orbital',
    description: 'A calm space to track your capacity. No judgment, just awareness.',
    hint: 'Designed for neurodivergent minds',
  },
  {
    id: 'home',
    icon: Home,
    title: 'Signal Your Capacity',
    description: 'Swipe the orb to log how you feel. Resourced, stretched, or depleted.',
    hint: 'Tap to save your signal',
  },
  {
    id: 'patterns',
    icon: BarChart2,
    title: 'Discover Patterns',
    description: 'Over time, see trends in your capacity. Find what helps and what drains.',
    hint: 'Unlocks after 7 signals',
  },
  {
    id: 'privacy',
    icon: Shield,
    title: 'Your Data, Your Control',
    description: 'Everything stays on your device. Pattern history helps you see long-term trends. Your notes never leave your phone.',
    hint: 'Tap Settings → Your Data for details',
  },
  {
    id: 'ready',
    icon: Sparkles,
    title: "You're Ready",
    description: 'Start by logging your first capacity signal. There are no wrong answers.',
    hint: 'Your patterns build over time',
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const { markTutorialSeen } = useTutorial();
  const { hasSeenWhyOrbital } = useWhyOrbital();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete();
    } else {
      setDirection('forward');
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setDirection('backward');
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(async () => {
    await markTutorialSeen();
    // Show "Why Orbital" on first use (it will mark itself as seen when dismissed)
    if (!hasSeenWhyOrbital) {
      router.replace('/why-orbital');
    } else {
      router.replace('/');
    }
  }, [markTutorialSeen, hasSeenWhyOrbital, router]);

  const handleComplete = useCallback(async () => {
    await markTutorialSeen();
    // Show "Why Orbital" on first use (it will mark itself as seen when dismissed)
    if (!hasSeenWhyOrbital) {
      router.replace('/why-orbital');
    } else {
      router.replace('/');
    }
  }, [markTutorialSeen, hasSeenWhyOrbital, router]);

  const Icon = step.icon;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
          <X color="rgba(255,255,255,0.5)" size={16} />
        </Pressable>
      </View>

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {TUTORIAL_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentStep && styles.progressDotActive,
              index < currentStep && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>

      {/* Content Card */}
      <View style={styles.contentContainer}>
        <Animated.View
          key={step.id}
          entering={direction === 'forward' ? SlideInRight.duration(300) : SlideInLeft.duration(300)}
          exiting={direction === 'forward' ? SlideOutLeft.duration(300) : SlideOutRight.duration(300)}
          style={styles.card}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon color="#00E5FF" size={48} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{step.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{step.description}</Text>

          {/* Hint */}
          <View style={styles.hintContainer}>
            <Text style={styles.hint}>{step.hint}</Text>
          </View>
        </Animated.View>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Pressable
          onPress={handleBack}
          style={[styles.navButton, isFirstStep && styles.navButtonDisabled]}
          disabled={isFirstStep}
        >
          <ChevronLeft
            color={isFirstStep ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)'}
            size={24}
          />
          <Text style={[styles.navText, isFirstStep && styles.navTextDisabled]}>Back</Text>
        </Pressable>

        <Pressable onPress={handleNext} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {isLastStep ? 'Start Using Orbital' : 'Next'}
          </Text>
          {!isLastStep && <ChevronRight color="#000" size={20} />}
        </Pressable>
      </View>

      {/* Step Counter */}
      <Text style={styles.stepCounter}>
        {currentStep + 1} of {TUTORIAL_STEPS.length}
      </Text>
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
    paddingTop: spacing.sm,
  },
  headerSpacer: {
    width: 60,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.sm,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressDotActive: {
    backgroundColor: '#00E5FF',
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: 'rgba(0,229,255,0.4)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  hintContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.sm,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  navTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  stepCounter: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    paddingBottom: spacing.lg,
  },
});
