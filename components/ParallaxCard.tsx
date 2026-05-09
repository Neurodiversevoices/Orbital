// ParallaxCard — subtle 3D tilt on touch · premium hero/featured surface
import { ViewStyle, StyleProp } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: 'subtle' | 'normal' | 'strong';
}

export const ParallaxCard = ({ children, style, intensity = 'normal' }: Props) => {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const scale = useSharedValue(1);

  const maxTilt = intensity === 'subtle' ? 6 : intensity === 'strong' ? 14 : 9;

  const pan = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.02, { stiffness: 250, damping: 18 });
    })
    .onUpdate((e) => {
      // translation as proxy for local touch position · keeps tilt bounded
      tiltY.value = (e.translationX / 100) * maxTilt;
      tiltX.value = -(e.translationY / 100) * maxTilt;
    })
    .onEnd(() => {
      tiltX.value = withSpring(0, { stiffness: 180, damping: 14 });
      tiltY.value = withSpring(0, { stiffness: 180, damping: 14 });
      scale.value = withSpring(1, { stiffness: 250, damping: 18 });
    })
    .minDistance(2);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          animStyle,
          {
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1,
            borderRadius: 14,
            padding: 20,
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 12 },
            shadowRadius: 24,
            elevation: 8,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
