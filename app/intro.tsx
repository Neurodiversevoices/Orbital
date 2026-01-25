/**
 * Pre-Terms Explanatory Intro
 *
 * Context-setting screens shown BEFORE Terms & Conditions.
 * Read-only, no data collection, no tracking.
 * Explains what the app does in plain language.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Activity, BarChart3, Lightbulb } from 'lucide-react-native';
import { colors, spacing } from '../theme';
import { markIntroSeen } from '../lib/hooks/useIntro';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface IntroScreen {
  id: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  headline: string;
  body: string[];
  clarifier?: string;
}

const INTRO_SCREENS: IntroScreen[] = [
  {
    id: 'what',
    icon: Activity,
    headline: 'Understand your daily limits before they're exceeded.',
    body: [
      'This app helps you notice when your mental, emotional, and physical load is rising — so you can act earlier, not after burnout hits.',
    ],
  },
  {
    id: 'tracking',
    icon: BarChart3,
    headline: 'What we track',
    body: [
      'How demanding your day feels',
      'How drained or supported your body and mind are',
      'How these patterns change over time',
    ],
    clarifier: 'No diagnoses. No advice. Just your own signals, tracked over time.',
  },
  {
    id: 'why',
    icon: Lightbulb,
    headline: 'Why this matters',
    body: [
      'Most people only realize they're overloaded when it's too late. Seeing these patterns early helps you plan, pace, and recover — using your own data.',
    ],
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const screen = INTRO_SCREENS[currentScreen];
  const isLastScreen = currentScreen === INTRO_SCREENS.length - 1;

  const handleContinue = useCallback(async () => {
    if (isLastScreen) {
      // Mark intro as seen and proceed to app (terms will show via provider)
      await markIntroSeen();
      router.replace('/');
    } else {
      setDirection('forward');
      setCurrentScreen((prev) => prev + 1);
    }
  }, [isLastScreen, router]);

  const Icon = screen.icon;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {INTRO_SCREENS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentScreen && styles.progressDotActive,
              index < currentScreen && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Animated.View
          key={screen.id}
          entering={direction === 'forward' ? SlideInRight.duration(300) : SlideInLeft.duration(300)}
          exiting={direction === 'forward' ? SlideOutLeft.duration(300) : SlideOutRight.duration(300)}
          style={styles.card}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon color="#00E5FF" size={40} />
          </View>

          {/* Headline */}
          <Text style={styles.headline}>{screen.headline}</Text>

          {/* Body */}
          <View style={styles.bodyContainer}>
            {screen.body.map((line, idx) => (
              <Text key={idx} style={styles.bodyText}>
                {screen.body.length > 1 ? '• ' : ''}{line}
              </Text>
            ))}
          </View>

          {/* Clarifier */}
          {screen.clarifier && (
            <View style={styles.clarifierContainer}>
              <Text style={styles.clarifierText}>{screen.clarifier}</Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <Pressable onPress={handleContinue} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>
            {isLastScreen ? 'Continue' : 'Next'}
          </Text>
          <ChevronRight color="#000" size={20} />
        </Pressable>

        {/* Screen Counter */}
        <Text style={styles.screenCounter}>
          {currentScreen + 1} of {INTRO_SCREENS.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
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
    maxWidth: 360,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headline: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 30,
  },
  bodyContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'left',
    marginBottom: spacing.sm,
  },
  clarifierContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  clarifierText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: 280,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  screenCounter: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: spacing.md,
  },
});
