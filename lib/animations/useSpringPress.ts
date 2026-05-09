/**
 * useSpringPress — tactile press feedback hook
 *
 * Returns press handlers and an animated style that applies a subtle
 * scale-down on press-in and springs back on press-out. Designed to be
 * spread onto a Pressable and the wrapping Animated.View.
 *
 * Usage:
 *   const { onPressIn, onPressOut, animatedStyle } = useSpringPress();
 *   <Animated.View style={animatedStyle}>
 *     <Pressable onPressIn={onPressIn} onPressOut={onPressOut} ... />
 *   </Animated.View>
 */
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export function useSpringPress() {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(0.96, { stiffness: 280, damping: 14 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { stiffness: 280, damping: 14 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}