import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CapacityState } from '../types';

const PULSE_SIZE = 320;

// Medical-grade color palette matching the orb
const stateColors = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
};

interface SavePulseProps {
  trigger: number;
  state: CapacityState;
}

export function SavePulse({ trigger, state }: SavePulseProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  const color = stateColors[state];

  useEffect(() => {
    if (trigger > 0) {
      // Reset
      scale.value = 0.8;
      opacity.value = 0.6;

      // Animate out
      scale.value = withTiming(1.8, {
        duration: 700,
        easing: Easing.out(Easing.quad),
      });

      opacity.value = withTiming(0, {
        duration: 700,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulse,
        animatedStyle,
        {
          backgroundColor: color,
          shadowColor: color,
        },
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  pulse: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 15,
  },
});
