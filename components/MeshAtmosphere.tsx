/**
 * MeshAtmosphere
 *
 * Cinematic animated gradient-mesh background. Slow drift on three soft
 * color blobs from the locked capacity spectrum, layered behind a 60%
 * darkening overlay so it never competes with foreground content.
 *
 * Uses react-native-reanimated 4 (already in stack). No new dependencies.
 * No CSS filters — we rely on heavy positioning, large border-radius, low
 * opacity, and the darkening overlay to produce a mesh-like atmosphere
 * cross-platform (iOS / Android / web) without expo-blur.
 *
 * Locked design tokens (per CLAUDE.md):
 *   Background  #01020A
 *   Teal        #2DD4BF
 *   Cyan        #06B6D4
 *   Amber       #F59E0B  (capacity-spectrum, atmosphere only — not orange UI)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  intensity?: 'subtle' | 'normal' | 'strong';
}

const BG = '#01020A';
const TEAL = '#2DD4BF';
const CYAN = '#06B6D4';
const AMBER = '#F59E0B';

const opacityFor = (
  intensity: 'subtle' | 'normal' | 'strong',
  subtle: number,
  normal: number,
  strong: number,
): number => {
  if (intensity === 'subtle') return subtle;
  if (intensity === 'strong') return strong;
  return normal;
};

export const MeshAtmosphere = ({ intensity = 'normal' }: Props) => {
  const { width, height } = Dimensions.get('window');
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, {
        duration: 24000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [t]);

  const blobA = useAnimatedStyle(() => ({
    transform: [
      { translateX: t.value * 60 - 30 },
      { translateY: t.value * 40 - 20 },
    ],
    opacity: opacityFor(intensity, 0.25, 0.4, 0.55),
  }));

  const blobB = useAnimatedStyle(() => ({
    transform: [
      { translateX: -t.value * 50 + 25 },
      { translateY: -t.value * 30 + 15 },
    ],
    opacity: opacityFor(intensity, 0.2, 0.32, 0.45),
  }));

  const blobC = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.15 }],
    opacity: opacityFor(intensity, 0.15, 0.25, 0.35),
  }));

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { overflow: 'hidden', backgroundColor: BG },
      ]}
    >
      <Animated.View
        style={[
          styles.blob,
          {
            backgroundColor: TEAL,
            top: -height * 0.15,
            left: -width * 0.2,
            width: width * 1.2,
            height: height * 0.7,
          },
          blobA,
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          {
            backgroundColor: CYAN,
            bottom: -height * 0.1,
            right: -width * 0.2,
            width: width * 1.1,
            height: height * 0.6,
          },
          blobB,
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          {
            backgroundColor: AMBER,
            top: height * 0.3,
            left: width * 0.1,
            width: width * 0.7,
            height: height * 0.4,
          },
          blobC,
        ]}
      />
      {/* Darkening overlay — keeps atmosphere subtle, content readable. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(1,2,10,0.6)' },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
});

export default MeshAtmosphere;
