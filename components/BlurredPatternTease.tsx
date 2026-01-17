/**
 * BlurredPatternTease - Teaser overlay for extended pattern history
 *
 * Shows a blurred preview of 30-day+ pattern data with an upgrade CTA.
 * Displayed to Free users who have used the app for 30+ days.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Lock, Sparkles, TrendingUp } from 'lucide-react-native';
import { colors, spacing } from '../theme';
import type { TimeRange } from './TimeRangeTabs';
import {
  trackPatternTeaseViewed,
  trackPatternTeaseUpgradeTapped,
} from '../lib/observability';

interface BlurredPatternTeaseProps {
  /** The chart content to blur */
  children: React.ReactNode;
  /** Whether the blur overlay is visible */
  visible: boolean;
  /** Callback when upgrade button is pressed */
  onUpgradePress: () => void;
  /** The time range being previewed */
  timeRange: TimeRange;
  /** Days since the user first opened the app (optional, for analytics) */
  daysSinceInstall?: number;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '7d': '7-Day',
  '30d': '30-Day',
  '90d': '90-Day',
  '6m': '6-Month',
  '1y': '1-Year',
  '10y': '10-Year',
};

export function BlurredPatternTease({
  children,
  visible,
  onUpgradePress,
  timeRange,
  daysSinceInstall,
}: BlurredPatternTeaseProps) {
  const hasTrackedView = useRef<string | null>(null);

  // Track when tease becomes visible (once per time range)
  useEffect(() => {
    if (visible && hasTrackedView.current !== timeRange) {
      hasTrackedView.current = timeRange;
      trackPatternTeaseViewed(timeRange, daysSinceInstall);
    }
  }, [visible, timeRange, daysSinceInstall]);

  // Wrap upgrade press with analytics tracking
  const handleUpgradePress = useCallback(() => {
    trackPatternTeaseUpgradeTapped(timeRange);
    onUpgradePress();
  }, [timeRange, onUpgradePress]);

  if (!visible) {
    return <>{children}</>;
  }

  const rangeLabel = TIME_RANGE_LABELS[timeRange] || timeRange;

  return (
    <View style={styles.container}>
      {/* Render the actual chart content */}
      <View style={styles.chartContainer}>
        {children}
      </View>

      {/* Blur overlay */}
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[
          styles.blurOverlay,
          Platform.OS === 'web' && styles.blurOverlayWeb,
        ]}
      >
        {/* Gradient layers for native blur effect */}
        {Platform.OS !== 'web' && (
          <>
            <View style={styles.gradientTop} />
            <View style={styles.gradientMiddle} />
            <View style={styles.gradientBottom} />
          </>
        )}

        {/* CTA Card */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconContainer}>
            <TrendingUp size={24} color="#00E5FF" />
          </View>

          <Text style={styles.ctaTitle}>
            See Your {rangeLabel} Patterns
          </Text>

          <Text style={styles.ctaSubtitle}>
            Unlock your full capacity history with Pro
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.upgradeButton,
              pressed && styles.upgradeButtonPressed,
            ]}
            onPress={handleUpgradePress}
          >
            <Sparkles size={16} color="#000" />
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </Pressable>

          <Text style={styles.ctaNote}>
            Free users see 7 days of history
          </Text>
        </View>
      </Animated.View>

      {/* Lock indicator badge */}
      <View style={styles.lockBadge}>
        <Lock size={10} color="rgba(255,255,255,0.6)" />
        <Text style={styles.lockBadgeText}>Pro Feature</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  chartContainer: {
    // Chart renders normally underneath
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 6, 10, 0.85)',
    borderRadius: 12,
  },
  blurOverlayWeb: {
    // Web supports backdrop-filter
    backgroundColor: 'rgba(5, 6, 10, 0.7)',
    // @ts-ignore - web-only property
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } as any,
  // Native gradient layers to simulate blur
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: 'rgba(5, 6, 10, 0.95)',
  },
  gradientMiddle: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(5, 6, 10, 0.75)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: 'rgba(5, 6, 10, 0.95)',
  },
  ctaCard: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    maxWidth: 280,
  },
  ctaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00E5FF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 24,
    marginBottom: spacing.sm,
  },
  upgradeButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0.3,
  },
  ctaNote: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  lockBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
