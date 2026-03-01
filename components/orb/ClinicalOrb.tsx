/**
 * ClinicalOrb.tsx — Main Orchestrator
 * Composes L0-L3 into a precision clinical instrument.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSpring,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';

import { HousingLayer } from './layers/HousingLayer';
import { DeepFieldLayer } from './layers/DeepFieldLayer';
import { GlassLensLayer } from './layers/GlassLensLayer';
import { SurfaceLayer } from './layers/SurfaceLayer';
import {
  CANVAS_SIZE,
  ORB_RADIUS,
  DRAG_SENSITIVITY,
  SNAP_INCREMENT,
  DAMPING_RATIO,
  STIFFNESS,
  MASS,
  PARALLAX_MAX_OFFSET,
  getCapacityState,
} from './orbConstants';
import type { CapacityState } from './orbConstants';

const DAMPED_SPRING = {
  damping: DAMPING_RATIO * 2 * Math.sqrt(STIFFNESS * MASS),
  stiffness: STIFFNESS,
  mass: MASS,
  overshootClamping: true,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

function clamp(val: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

interface ClinicalOrbProps {
  size?: number;
  initialCapacity?: number;
  onCapacityChange?: (capacity: number) => void;
  onStateChange?: (state: CapacityState) => void;
}

export const ClinicalOrb: React.FC<ClinicalOrbProps> = ({
  size = CANVAS_SIZE,
  initialCapacity = 0.82,
  onCapacityChange,
  onStateChange,
}) => {
  const capacity = useSharedValue(initialCapacity);
  const rawCapacity = useSharedValue(initialCapacity);
  const lastState = useSharedValue<CapacityState>(getCapacityState(initialCapacity));
  const parallaxX = useSharedValue(0);
  const parallaxY = useSharedValue(0);

  const notifyCapacityChange = useCallback(
    (cap: number) => onCapacityChange?.(cap),
    [onCapacityChange]
  );
  const notifyStateChange = useCallback(
    (state: CapacityState) => onStateChange?.(state),
    [onStateChange]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const delta = -event.translationY * DRAG_SENSITIVITY;
      const newCap = clamp(rawCapacity.value + delta, 0, 1);
      capacity.value = newCap;

      parallaxX.value = clamp(event.translationX / 100, -1, 1) * PARALLAX_MAX_OFFSET;
      parallaxY.value = clamp(event.translationY / 100, -1, 1) * PARALLAX_MAX_OFFSET;

      runOnJS(notifyCapacityChange)(newCap);

      const newState = getCapacityState(newCap);
      if (newState !== lastState.value) {
        lastState.value = newState;
        runOnJS(notifyStateChange)(newState);
      }
    })
    .onEnd(() => {
      const snapped = Math.round(capacity.value / SNAP_INCREMENT) * SNAP_INCREMENT;
      const clamped = clamp(snapped, 0, 1);
      rawCapacity.value = clamped;
      capacity.value = withSpring(clamped, DAMPED_SPRING);
      parallaxX.value = withSpring(0, DAMPED_SPRING);
      parallaxY.value = withSpring(0, DAMPED_SPRING);
      runOnJS(notifyCapacityChange)(clamped);
    });

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.canvasContainer, { width: size, height: size }]}>
          <Canvas style={{ width: size, height: size }}>
            <HousingLayer size={size} />
            <DeepFieldLayer size={size} capacity={capacity} parallaxX={parallaxX} parallaxY={parallaxY} />
            <GlassLensLayer size={size} capacity={capacity} />
            <SurfaceLayer size={size} capacity={capacity} parallaxX={parallaxX} parallaxY={parallaxY} />
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  canvasContainer: { alignItems: 'center', justifyContent: 'center' },
});

export default ClinicalOrb;
