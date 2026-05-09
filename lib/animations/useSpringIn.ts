/**
 * useSpringIn — fade + slide-in spring animation on mount
 *
 * Returns an animated style that springs opacity from 0 → 1 and translateY
 * from 20 → 0 when the component mounts. Useful for tactile screen entries.
 *
 * Usage:
 *   const entryStyle = useSpringIn(120); // optional delay in ms
 *   <Animated.View style={entryStyle}>...</Animated.View>
 */
import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

export function useSpringIn(delay = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withSpring(1, { stiffness: 100 }));
    translateY.value = withDelay(delay, withSpring(0, { stiffness: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}