import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CapacityState } from '../types';

interface SavePulseProps {
  trigger: number;
  state: CapacityState;
  /** Match hero orb diameter so the ring sits behind it */
  size?: number;
}

export function SavePulse({ trigger, state, size = 280 }: SavePulseProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

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
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'transparent',
          // Teal/capacity-colored shadow drew a visible ring behind the orb; keep layout only.
          shadowColor: 'transparent',
        },
        animatedStyle,
      ]}
      pointerEvents="none"
      testID="save-pulse"
      data-testid="save-pulse"
    />
  );
}

const styles = StyleSheet.create({
  pulse: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
});
