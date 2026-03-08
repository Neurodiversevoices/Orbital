import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Posture-only avatar. Three states driven by capacity:
 * - Resourced (0.66–1.0): upright, full opacity
 * - Elevated (0.33–0.66): neutral lean, slightly dimmed
 * - Depleted (0.0–0.33): low slouch, dimmed
 *
 * Never speaks. Never labels. Never annotates.
 */

interface AvatarProps {
  capacityValue: SharedValue<number>;
  size?: number;
}

const HEAD_RATIO = 0.22;
const TORSO_RATIO = 0.35;
const LIMB_WIDTH_RATIO = 0.08;

function Avatar({ capacityValue, size = 120 }: AvatarProps) {
  const headSize = size * HEAD_RATIO;
  const torsoHeight = size * TORSO_RATIO;
  const torsoWidth = size * 0.2;
  const limbWidth = size * LIMB_WIDTH_RATIO;
  const limbHeight = size * 0.28;
  const armHeight = size * 0.22;

  // Body posture: translateY shifts down, rotate tilts forward as capacity drops
  const bodyStyle = useAnimatedStyle(() => {
    'worklet';
    const translateY = interpolate(
      capacityValue.value,
      [0, 0.33, 0.66, 1],
      [12, 6, 1, 0],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      capacityValue.value,
      [0, 0.33, 0.66, 1],
      [8, 4, 1, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      capacityValue.value,
      [0, 0.33, 0.66, 1],
      [0.45, 0.6, 0.82, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  // Head droops independently — slight extra tilt when depleted
  const headStyle = useAnimatedStyle(() => {
    'worklet';
    const rotate = interpolate(
      capacityValue.value,
      [0, 0.33, 0.66, 1],
      [12, 5, 1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      capacityValue.value,
      [0, 0.33, 0.66, 1],
      [4, 2, 0, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ rotate: `${rotate}deg` }, { translateY }],
    };
  });

  // Shoulders droop — arms angle outward when depleted
  const leftArmStyle = useAnimatedStyle(() => {
    'worklet';
    const rotate = interpolate(
      capacityValue.value,
      [0, 0.33, 0.66, 1],
      [-18, -10, -4, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ rotate: `${rotate}deg` }],
      transformOrigin: 'top center',
    };
  });

  const rightArmStyle = useAnimatedStyle(() => {
    'worklet';
    const rotate = interpolate(
      capacityValue.value,
      [0, 0.33, 0.66, 1],
      [18, 10, 4, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ rotate: `${rotate}deg` }],
      transformOrigin: 'top center',
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.body, bodyStyle]}>
        {/* Head */}
        <Animated.View
          style={[
            styles.head,
            {
              width: headSize,
              height: headSize,
              borderRadius: headSize / 2,
            },
            headStyle,
          ]}
        />

        {/* Upper body row: left arm + torso + right arm */}
        <View style={styles.upperBody}>
          {/* Left arm */}
          <Animated.View
            style={[
              styles.limb,
              {
                width: limbWidth,
                height: armHeight,
                borderRadius: limbWidth / 2,
                marginRight: 2,
              },
              leftArmStyle,
            ]}
          />

          {/* Torso */}
          <View
            style={[
              styles.torso,
              {
                width: torsoWidth,
                height: torsoHeight,
                borderRadius: torsoWidth / 3,
              },
            ]}
          />

          {/* Right arm */}
          <Animated.View
            style={[
              styles.limb,
              {
                width: limbWidth,
                height: armHeight,
                borderRadius: limbWidth / 2,
                marginLeft: 2,
              },
              rightArmStyle,
            ]}
          />
        </View>

        {/* Legs */}
        <View style={styles.legs}>
          <View
            style={[
              styles.limb,
              {
                width: limbWidth,
                height: limbHeight,
                borderRadius: limbWidth / 2,
                marginRight: 3,
              },
            ]}
          />
          <View
            style={[
              styles.limb,
              {
                width: limbWidth,
                height: limbHeight,
                borderRadius: limbWidth / 2,
                marginLeft: 3,
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const FIGURE_COLOR = 'rgba(255, 255, 255, 0.85)';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    alignItems: 'center',
  },
  head: {
    backgroundColor: FIGURE_COLOR,
    marginBottom: 3,
  },
  upperBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  torso: {
    backgroundColor: FIGURE_COLOR,
  },
  limb: {
    backgroundColor: FIGURE_COLOR,
  },
  legs: {
    flexDirection: 'row',
    marginTop: 2,
  },
});

export default Avatar;
