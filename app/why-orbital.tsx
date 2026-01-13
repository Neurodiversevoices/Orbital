/**
 * "Why Orbital Exists" Screen
 *
 * A reflective moment explaining Orbital's philosophy.
 * Shown once during onboarding (or skippable).
 * Calm, grounding tone. Not marketing fluff.
 *
 * CRITICAL: This screen MUST be dismissable. Multiple fallbacks ensure
 * users are never trapped here.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Clock, Shield, Heart } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { useWhyOrbital } from '../lib/hooks/useWhyOrbital';
import { ProprietaryFooter } from '../components/legal';

interface PrincipleProps {
  icon: React.ComponentType<{ color: string; size: number }>;
  title: string;
  description: string;
  delay: number;
}

function Principle({ icon: Icon, title, description, delay }: PrincipleProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)} style={styles.principle}>
      <View style={styles.principleIcon}>
        <Icon color="#00E5FF" size={20} />
      </View>
      <View style={styles.principleContent}>
        <Text style={styles.principleTitle}>{title}</Text>
        <Text style={styles.principleDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
}

export default function WhyOrbitalScreen() {
  const router = useRouter();
  const { markWhyOrbitalSeen } = useWhyOrbital();
  const hasNavigatedRef = useRef(false);

  // Single dismiss function that handles everything
  const dismiss = useCallback(async () => {
    // Prevent double-navigation
    if (hasNavigatedRef.current) {
      console.log('[WhyOrbital] Already navigating, ignoring');
      return;
    }
    hasNavigatedRef.current = true;

    console.log('[WhyOrbital] Dismissing screen');

    // Mark as seen FIRST (persist to storage)
    try {
      await markWhyOrbitalSeen();
      console.log('[WhyOrbital] Marked as seen');
    } catch (e) {
      console.error('[WhyOrbital] Failed to mark as seen:', e);
      // Continue anyway - don't trap user
    }

    // Navigate to home - use replace since we may have replaced here
    try {
      router.replace('/');
      console.log('[WhyOrbital] Navigated to home');
    } catch (e) {
      console.error('[WhyOrbital] Navigation failed, trying back:', e);
      try {
        router.back();
      } catch (e2) {
        console.error('[WhyOrbital] Back also failed:', e2);
        // Last resort - navigate to root
        router.navigate('/');
      }
    }
  }, [markWhyOrbitalSeen, router]);

  // Auto-dismiss timeout fallback (30 seconds)
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('[WhyOrbital] Auto-dismiss timeout triggered');
      dismiss();
    }, 30000);

    return () => clearTimeout(timeout);
  }, [dismiss]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Full-screen tap fallback - lowest z-index */}
      <TouchableOpacity
        style={styles.fullScreenTap}
        onPress={dismiss}
        activeOpacity={1}
      >
        <View style={styles.fullScreenTapInner} />
      </TouchableOpacity>

      {/* Header with close button */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          onPress={dismiss}
          style={styles.closeButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.6}
        >
          <X color="rgba(255,255,255,0.7)" size={24} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.hero}>
          <View style={styles.orbContainer}>
            <View style={styles.orbOuter}>
              <View style={styles.orbInner} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Why Orbital Exists</Text>
        </Animated.View>

        {/* Opening Statement */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.statement}>
          <Text style={styles.statementText}>
            Most wellness apps ask you to track more, optimize more, improve more.
          </Text>
          <Text style={styles.statementText}>
            Orbital is different.
          </Text>
          <Text style={styles.statementTextEmphasis}>
            We believe awareness—without pressure—leads to understanding.
          </Text>
        </Animated.View>

        {/* Core Principles */}
        <View style={styles.principlesContainer}>
          <Principle
            icon={Clock}
            title="Longitudinal, Not Transactional"
            description="Patterns only reveal themselves over time. We're building for months and years, not days."
            delay={400}
          />

          <Principle
            icon={Shield}
            title="Privacy-First"
            description="Your capacity signals belong to you. Optional sync, you control it. We never sell your data. Ever."
            delay={500}
          />

          <Principle
            icon={Heart}
            title="Patterns, Not Surveillance"
            description="We don't track your location, your screen time, or your habits. Just the capacity signals you choose to share."
            delay={600}
          />
        </View>

        {/* Closing */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.closing}>
          <Text style={styles.closingText}>
            Orbital was designed for people who've felt the weight of being over-monitored, over-scheduled, or over-demanded.
          </Text>
          <Text style={styles.closingTextFinal}>
            This is a quiet space to notice. That's all.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Bottom Button - outside ScrollView */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.primaryButton}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>I understand</Text>
        </TouchableOpacity>

        {/* Tap anywhere hint */}
        <Text style={styles.fallbackHintText}>tap anywhere to continue</Text>

        <ProprietaryFooter compact />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullScreenTap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  fullScreenTapInner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    zIndex: 100,
  },
  headerSpacer: {
    width: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  orbContainer: {
    marginBottom: spacing.lg,
  },
  orbOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00E5FF',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  statement: {
    marginBottom: spacing.xl,
  },
  statementText: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statementTextEmphasis: {
    fontSize: 15,
    lineHeight: 24,
    color: '#00E5FF',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  principlesContainer: {
    marginBottom: spacing.xl,
  },
  principle: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  principleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,229,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  principleContent: {
    flex: 1,
  },
  principleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  principleDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.5)',
  },
  closing: {
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  closingText: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  closingTextFinal: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    zIndex: 100,
    backgroundColor: colors.background,
  },
  primaryButton: {
    backgroundColor: '#00E5FF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  fallbackHintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
