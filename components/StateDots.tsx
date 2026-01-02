import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CapacityState, CAPACITY_STATES } from '../types';
import { colors, stateColors, spacing } from '../theme';

const DOT_SIZE = 24;
const SELECTED_RING_SIZE = DOT_SIZE + 12;

interface StateDotProps {
  state: CapacityState;
  isSelected: boolean;
  onPress: () => void;
}

function StateDot({ state, isSelected, onPress }: StateDotProps) {
  const color = stateColors[state];

  const ringStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isSelected ? 1 : 0, { duration: 200 }),
      transform: [
        { scale: withSpring(isSelected ? 1 : 0.8, { damping: 15 }) },
      ],
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isSelected ? 1.1 : 1, { damping: 15 }) },
      ],
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.dotContainer}>
      {/* Selection ring */}
      <Animated.View
        style={[
          styles.selectionRing,
          ringStyle,
          { borderColor: color },
        ]}
      />
      {/* Dot */}
      <Animated.View
        style={[
          styles.dot,
          dotStyle,
          {
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
    </Pressable>
  );
}

interface StateDotsProps {
  selectedState: CapacityState;
  onStateChange: (state: CapacityState) => void;
}

export function StateDots({ selectedState, onStateChange }: StateDotsProps) {
  return (
    <View style={styles.container}>
      {CAPACITY_STATES.map((state) => (
        <StateDot
          key={state}
          state={state}
          isSelected={selectedState === state}
          onPress={() => onStateChange(state)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  dotContainer: {
    width: SELECTED_RING_SIZE + 8,
    height: SELECTED_RING_SIZE + 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionRing: {
    position: 'absolute',
    width: SELECTED_RING_SIZE,
    height: SELECTED_RING_SIZE,
    borderRadius: SELECTED_RING_SIZE / 2,
    borderWidth: 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
});
