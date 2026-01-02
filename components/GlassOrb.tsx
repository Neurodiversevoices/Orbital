import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  interpolateColor,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import { CapacityState } from '../types';

const ORB_SIZE = 240;
const CONTAINER_SIZE = ORB_SIZE + 80;
const RIM_WIDTH = 6;

interface GlassOrbProps {
  state: CapacityState | null;
  onStateChange?: (state: CapacityState) => void;
  onSave?: () => void;
}

export function GlassOrb({ state, onStateChange, onSave }: GlassOrbProps) {
  const breathe = useSharedValue(0);
  const colorPosition = useSharedValue(0.5);
  const startColorPos = useSharedValue(0.5);
  const pressScale = useSharedValue(1);
  const dragY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Subtle breathing animation
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
        withTiming(0, { duration: 3000, easing: Easing.bezier(0.42, 0, 0.58, 1) })
      ),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    if (!isDragging.value) {
      if (state === 'resourced') colorPosition.value = withSpring(0, { damping: 25, stiffness: 120 });
      else if (state === 'stretched') colorPosition.value = withSpring(0.5, { damping: 25, stiffness: 120 });
      else if (state === 'depleted') colorPosition.value = withSpring(1, { damping: 25, stiffness: 120 });
    }
  }, [state]);

  const getStateFromPosition = (pos: number): CapacityState => {
    if (pos < 0.33) return 'resourced';
    if (pos > 0.66) return 'depleted';
    return 'stretched';
  };

  const updateState = (s: CapacityState) => onStateChange?.(s);
  const triggerSave = () => onSave?.();

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onBegin(() => {
      isDragging.value = true;
      startColorPos.value = colorPosition.value;
    })
    .onUpdate((e) => {
      const sensitivity = 1.5 / ORB_SIZE;
      const xContribution = e.translationX * sensitivity * 0.7;
      const yContribution = e.translationY * sensitivity;
      const totalDelta = (xContribution + yContribution) / 1.5;
      const newPos = Math.max(0, Math.min(1, startColorPos.value + totalDelta));
      colorPosition.value = newPos;
      dragX.value = e.translationX * 0.05;
      dragY.value = e.translationY * 0.05;
    })
    .onEnd(() => {
      isDragging.value = false;
      dragX.value = withSpring(0, { damping: 15, stiffness: 100 });
      dragY.value = withSpring(0, { damping: 15, stiffness: 100 });
      runOnJS(updateState)(getStateFromPosition(colorPosition.value));
    });

  const tapGesture = Gesture.Tap()
    .onBegin(() => { pressScale.value = withTiming(0.97, { duration: 100 }); })
    .onFinalize(() => {
      pressScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      runOnJS(triggerSave)();
    });

  const gesture = Gesture.Race(panGesture, tapGesture);

  // Color interpolation
  const getColor = (pos: number) => {
    'worklet';
    return interpolateColor(
      pos,
      [0, 0.5, 1],
      ['#00E5FF', '#E8A830', '#F44336']
    );
  };

  // Outer glow - tight halo
  const glowStyle = useAnimatedStyle(() => {
    const color = getColor(colorPosition.value);
    return {
      shadowColor: color,
      shadowOpacity: interpolate(breathe.value, [0, 1], [0.5, 0.8]),
      shadowRadius: interpolate(breathe.value, [0, 1], [25, 40]),
    };
  });

  // Rim style
  const rimStyle = useAnimatedStyle(() => {
    const color = getColor(colorPosition.value);
    return {
      borderColor: color,
      shadowColor: color,
      shadowOpacity: interpolate(breathe.value, [0, 1], [0.6, 1]),
      shadowRadius: interpolate(breathe.value, [0, 1], [8, 16]),
    };
  });

  // Inner rim accent
  const innerRimStyle = useAnimatedStyle(() => {
    const color = getColor(colorPosition.value);
    return {
      borderColor: color,
      opacity: interpolate(breathe.value, [0, 1], [0.3, 0.5]),
    };
  });

  // Center indicator glow - very subtle ambient presence
  const centerStyle = useAnimatedStyle(() => {
    const color = getColor(colorPosition.value);
    return {
      backgroundColor: color,
      opacity: interpolate(breathe.value, [0, 1], [0.04, 0.07]),
      transform: [{ scale: interpolate(breathe.value, [0, 1], [0.97, 1]) }],
    };
  });

  // Directional indicator - rotates around rim based on position
  // Maps colorPosition 0->1 to rotation -90°->90° (top to bottom on right side)
  const indicatorStyle = useAnimatedStyle(() => {
    const rotation = interpolate(colorPosition.value, [0, 1], [-90, 90]);
    return {
      transform: [
        { rotate: `${rotation}deg` },
      ],
      opacity: interpolate(breathe.value, [0, 1], [0.6, 1]),
    };
  });

  // The actual glow point on the indicator
  const indicatorGlowStyle = useAnimatedStyle(() => {
    const color = getColor(colorPosition.value);
    return {
      backgroundColor: color,
      shadowColor: color,
      shadowOpacity: interpolate(breathe.value, [0, 1], [0.8, 1]),
      shadowRadius: interpolate(breathe.value, [0, 1], [8, 14]),
    };
  });

  // Weighted arc highlight - subtle directional emphasis
  const arcStyle = useAnimatedStyle(() => {
    const rotation = interpolate(colorPosition.value, [0, 1], [-90, 90]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
      opacity: interpolate(breathe.value, [0, 1], [0.15, 0.25]),
    };
  });

  const arcGlowStyle = useAnimatedStyle(() => {
    const color = getColor(colorPosition.value);
    return {
      backgroundColor: color,
      shadowColor: color,
      shadowOpacity: 0.6,
      shadowRadius: 12,
    };
  });

  // Container transform
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value },
      { perspective: 1000 },
      { rotateX: `${-dragY.value * 0.1}deg` },
      { rotateY: `${dragX.value * 0.1}deg` },
    ],
  }));

  const cx = ORB_SIZE / 2;
  const cy = ORB_SIZE / 2;
  const r = ORB_SIZE / 2 - RIM_WIDTH;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Outer glow */}
        <Animated.View style={[styles.glow, glowStyle]} />

        {/* Main orb body */}
        <View style={styles.orbBody}>
          <Svg width={ORB_SIZE} height={ORB_SIZE} viewBox={`0 0 ${ORB_SIZE} ${ORB_SIZE}`}>
            <Defs>
              {/* Clean dark interior */}
              <RadialGradient id="interior" cx="50%" cy="45%" r="50%">
                <Stop offset="0%" stopColor="#0a0c10" stopOpacity="1" />
                <Stop offset="60%" stopColor="#060709" stopOpacity="1" />
                <Stop offset="100%" stopColor="#030405" stopOpacity="1" />
              </RadialGradient>

              {/* Subtle highlight */}
              <RadialGradient id="highlight" cx="35%" cy="30%" r="40%">
                <Stop offset="0%" stopColor="white" stopOpacity="0.08" />
                <Stop offset="100%" stopColor="white" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Base circle */}
            <Circle cx={cx} cy={cy} r={r} fill="url(#interior)" />

            {/* Subtle highlight */}
            <Circle cx={cx} cy={cy} r={r} fill="url(#highlight)" />
          </Svg>

          {/* Center capacity indicator */}
          <Animated.View style={[styles.centerIndicator, centerStyle]} />

          {/* Inner rim accent */}
          <Animated.View style={[styles.innerRim, innerRimStyle]} />

          {/* Primary rim bezel */}
          <Animated.View style={[styles.rim, rimStyle]} />

          {/* Weighted arc highlight - directional emphasis */}
          <Animated.View style={[styles.arcContainer, arcStyle]}>
            <Animated.View style={[styles.arcGlow, arcGlowStyle]} />
          </Animated.View>

          {/* Directional indicator - needle without needle */}
          <Animated.View style={[styles.indicatorContainer, indicatorStyle]}>
            <Animated.View style={[styles.indicatorGlow, indicatorGlowStyle]} />
          </Animated.View>

          {/* Outer bezel edge */}
          <View style={styles.outerBezel} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: ORB_SIZE + 40,
    height: ORB_SIZE + 40,
    borderRadius: (ORB_SIZE + 40) / 2,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  orbBody: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  centerIndicator: {
    position: 'absolute',
    top: ORB_SIZE * 0.3,
    left: ORB_SIZE * 0.3,
    width: ORB_SIZE * 0.4,
    height: ORB_SIZE * 0.4,
    borderRadius: ORB_SIZE * 0.2,
  },
  innerRim: {
    position: 'absolute',
    top: RIM_WIDTH + 4,
    left: RIM_WIDTH + 4,
    right: RIM_WIDTH + 4,
    bottom: RIM_WIDTH + 4,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 1,
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ORB_SIZE / 2,
    borderWidth: RIM_WIDTH,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },
  outerBezel: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: (ORB_SIZE + 4) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  indicatorContainer: {
    position: 'absolute',
    top: ORB_SIZE / 2 - 6,
    left: ORB_SIZE / 2,
    width: ORB_SIZE / 2,
    height: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  indicatorGlow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: -2,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  arcContainer: {
    position: 'absolute',
    top: ORB_SIZE / 2 - 20,
    left: ORB_SIZE / 2,
    width: ORB_SIZE / 2,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  arcGlow: {
    width: 6,
    height: 50,
    borderRadius: 3,
    marginRight: -3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
