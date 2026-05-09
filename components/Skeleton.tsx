// Skeleton — cinematic loading placeholder (design-token compliant)
// Pure React Native; uses Animated.Value with useNativeDriver for smooth shimmer.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
          opacity,
        },
        style,
      ]}
    />
  );
};
