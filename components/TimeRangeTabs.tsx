import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { Lock, Sparkles } from 'lucide-react-native';
import { colors, spacing } from '../theme';
import { getUnlockTier } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y' | '10y';

interface TimeRangeTabsProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  logCount?: number;
  /** Whether user has Pro subscription (unlocks full history) */
  isPro?: boolean;
  /** Whether user has used app for 30+ days (eligible for tease) */
  hasUsedAppFor30Days?: boolean;
  /** When true, bypasses Pro gating (for demo/screenshot mode) */
  isDemoMode?: boolean;
}

const ranges: { key: TimeRange; label: string; requiredLogs: number }[] = [
  { key: '7d', label: '7D', requiredLogs: 7 },
  { key: '30d', label: '30D', requiredLogs: 14 },
  { key: '90d', label: '90D', requiredLogs: 30 },
  { key: '6m', label: '6M', requiredLogs: 60 },
  { key: '1y', label: '1Y', requiredLogs: 120 },
  { key: '10y', label: '10Y', requiredLogs: 365 },
];

function TabButton({
  range,
  isSelected,
  isLocked,
  isTease,
  onPress,
}: {
  range: { key: TimeRange; label: string };
  isSelected: boolean;
  isLocked: boolean;
  /** Whether this is a "tease" tab (Free user with 30+ days, can view blurred) */
  isTease: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Tease tabs are clickable (they show blurred preview)
  const isClickable = !isLocked || isTease;

  const handlePressIn = () => {
    if (isClickable) {
      scale.value = withTiming(0.95, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={isClickable ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.tab,
        animatedStyle,
        isSelected && styles.tabSelected,
        isLocked && !isTease && styles.tabLocked,
        isTease && styles.tabTease,
      ]}
    >
      {isLocked && !isTease ? (
        <Lock size={10} color="rgba(255,255,255,0.2)" />
      ) : (
        <View style={styles.tabContent}>
          <Text style={[
            styles.tabText,
            isSelected && styles.tabTextSelected,
            isTease && styles.tabTextTease,
          ]}>
            {range.label}
          </Text>
          {isTease && (
            <View style={styles.proBadge}>
              <Sparkles size={8} color="#00E5FF" />
            </View>
          )}
        </View>
      )}
      {isSelected && isClickable && (
        <View style={[
          styles.tabIndicator,
          isTease && styles.tabIndicatorTease,
        ]} />
      )}
    </AnimatedPressable>
  );
}

export function TimeRangeTabs({
  selected,
  onSelect,
  logCount = 0,
  isPro = false,
  hasUsedAppFor30Days = false,
  isDemoMode = false,
}: TimeRangeTabsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {ranges.map((range) => {
          const hasEnoughLogs = logCount >= range.requiredLogs;

          // 7d is always available based on log count (no Pro gating)
          // 30d+ requires Pro for full access, or shows tease for eligible Free users
          // Demo mode bypasses Pro gating entirely
          const isExtendedRange = range.key !== '7d';
          const isProGated = isExtendedRange && !isPro && !isDemoMode;

          // Locked: not enough logs AND (not pro-gated OR not eligible for tease)
          // Tease: enough logs, pro-gated, but user has 30+ days tenure
          const isTease = hasEnoughLogs && isProGated && hasUsedAppFor30Days;
          const isLocked = !hasEnoughLogs || (isProGated && !hasUsedAppFor30Days);

          return (
            <TabButton
              key={range.key}
              range={range}
              isSelected={selected === range.key}
              isLocked={isLocked}
              isTease={isTease}
              onPress={() => onSelect(range.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

export function getTimeRangeMs(range: TimeRange): number {
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case '7d':
      return 7 * day;
    case '30d':
      return 30 * day;
    case '90d':
      return 90 * day;
    case '6m':
      return 183 * day;
    case '1y':
      return 365 * day;
    case '10y':
      return 10 * 365 * day;
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tabSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabLocked: {
    opacity: 0.5,
  },
  tabTease: {
    // Slight highlight to indicate it's tappable
    opacity: 0.85,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
  tabTextSelected: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  tabTextTease: {
    // Slightly brighter to indicate it's a preview
    color: 'rgba(255,255,255,0.55)',
  },
  proBadge: {
    marginLeft: 1,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#00E5FF',
  },
  tabIndicatorTease: {
    // Dimmer indicator for tease tabs
    opacity: 0.5,
  },
});
