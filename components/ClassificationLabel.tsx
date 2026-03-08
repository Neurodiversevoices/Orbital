import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  SharedValue,
  interpolateColor,
} from 'react-native-reanimated';

interface ClassificationLabelProps {
  capacity: SharedValue<number>;
  opacity: SharedValue<number>;
}

/**
 * Capacity percentage label in Space Mono.
 * Shows capacity as "82%" — no state word, just the number.
 * Color follows the capacity spectrum: crimson → amber → teal → cyan.
 */
export function ClassificationLabel({ capacity, opacity }: ClassificationLabelProps) {
  const [pct, setPct] = useState(82);

  useAnimatedReaction(
    () => capacity.value,
    (val) => {
      const rounded = Math.round(Math.max(0, Math.min(1, val)) * 100);
      runOnJS(setPct)(rounded);
    },
  );

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const colorStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      capacity.value,
      [0, 0.33, 0.67, 1],
      ['#DC2626', '#F59E0B', '#2DD4BF', '#06B6D4'],
    );
    return { color: color as string };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.Text style={[styles.label, colorStyle]}>
        {pct}%
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minHeight: 20,
  },
  label: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 13,
    letterSpacing: 1.5,
  },
});
