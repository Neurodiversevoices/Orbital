import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { Lock } from 'lucide-react-native';
import { colors, spacing } from '../theme';
import { getUnlockTier } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TimeRange = '7d' | '14d' | '1m' | '90d' | '1y' | '2y' | '5y' | '10y';

interface TimeRangeTabsProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  logCount?: number;
}

const ranges: { key: TimeRange; label: string; requiredLogs: number }[] = [
  { key: '7d', label: '7D', requiredLogs: 7 },
  { key: '14d', label: '14D', requiredLogs: 14 },
  { key: '1m', label: '1M', requiredLogs: 30 },
  { key: '90d', label: '90D', requiredLogs: 90 },
  { key: '1y', label: '1Y', requiredLogs: 365 },
  { key: '2y', label: '2Y', requiredLogs: 500 },
  { key: '5y', label: '5Y', requiredLogs: 1000 },
  { key: '10y', label: '10Y', requiredLogs: 2000 },
];

function TabButton({
  range,
  isSelected,
  isLocked,
  onPress,
}: {
  range: { key: TimeRange; label: string };
  isSelected: boolean;
  isLocked: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isLocked) {
      scale.value = withTiming(0.95, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={isLocked ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.tab,
        animatedStyle,
        isSelected && styles.tabSelected,
        isLocked && styles.tabLocked,
      ]}
    >
      {isLocked ? (
        <Lock size={10} color="rgba(255,255,255,0.2)" />
      ) : (
        <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
          {range.label}
        </Text>
      )}
      {isSelected && !isLocked && <View style={styles.tabIndicator} />}
    </AnimatedPressable>
  );
}

export function TimeRangeTabs({ selected, onSelect, logCount = 0 }: TimeRangeTabsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {ranges.map((range) => (
          <TabButton
            key={range.key}
            range={range}
            isSelected={selected === range.key}
            isLocked={logCount < range.requiredLogs}
            onPress={() => onSelect(range.key)}
          />
        ))}
      </View>
    </View>
  );
}

export function getTimeRangeMs(range: TimeRange): number {
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case '7d':
      return 7 * day;
    case '14d':
      return 14 * day;
    case '1m':
      return 30 * day;
    case '90d':
      return 90 * day;
    case '1y':
      return 365 * day;
    case '2y':
      return 2 * 365 * day;
    case '5y':
      return 5 * 365 * day;
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
  tabSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabLocked: {
    opacity: 0.5,
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
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#00E5FF',
  },
});
