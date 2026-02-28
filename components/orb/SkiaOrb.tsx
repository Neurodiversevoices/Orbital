/**
 * SkiaOrb — Scaffold
 *
 * Skia canvas orb with pan-gesture capacity control.
 * Drag up = increase capacity, drag down = decrease.
 * Color interpolates across the design system spectrum:
 *   crimson (0.0) → amber (0.5) → teal (0.75) → cyan (1.0)
 *
 * This is the scaffold. Glass, lightning, nodes, and rings come later.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  BlurMask,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withSpring,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { capacityToSkiaColor } from './orbColors';

// =============================================================================
// TYPES
// =============================================================================

export interface SkiaOrbProps {
  /** Canvas size in points. Default 320. */
  size?: number;
  /** Initial capacity 0.0–1.0. Default 0.82. */
  initialCapacity?: number;
  /** Called when a drag ends with the snapped capacity value. */
  onCapacityChange?: (capacity: number) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DRAG_SENSITIVITY = 0.007;
const SNAP_INCREMENT = 0.05;
const SPRING_CONFIG = { damping: 15, stiffness: 120 };

// =============================================================================
// HELPERS
// =============================================================================

/** Snap a value to the nearest increment. */
function snapTo(value: number, increment: number): number {
  'worklet';
  return Math.round(value / increment) * increment;
}

/** Clamp between 0 and 1. */
function clamp01(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SkiaOrb({
  size = 320,
  initialCapacity = 0.82,
  onCapacityChange,
}: SkiaOrbProps) {
  const capacity = useSharedValue(initialCapacity);
  const dragStartCap = useSharedValue(initialCapacity);

  const center = size / 2;
  const orbRadius = size * 0.38; // ~122px at 320
  const glowRadius = size * 0.46; // ~147px at 320

  // ── Derived Skia colors from capacity ─────────────────────────────────
  // Circle's `color` prop accepts SharedValue<Color> — works with animation.
  // RadialGradient `colors` does NOT accept animated values — deferred to
  // follow-up visual pass when we add glass + shader effects.

  const orbColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 1);
  });

  const glowColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.25);
  });

  const ringColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.45);
  });

  // ── JS callback bridge ────────────────────────────────────────────────
  const fireCapacityChange = useCallback(
    (val: number) => {
      onCapacityChange?.(Math.round(val * 100) / 100);
    },
    [onCapacityChange],
  );

  // ── Pan gesture ───────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartCap.value = capacity.value;
    })
    .onUpdate((e) => {
      // Drag up (negative dy) = increase capacity
      const raw = dragStartCap.value - e.translationY * DRAG_SENSITIVITY;
      capacity.value = clamp01(raw);
    })
    .onEnd(() => {
      const snapped = clamp01(snapTo(capacity.value, SNAP_INCREMENT));
      capacity.value = withSpring(snapped, SPRING_CONFIG);
      runOnJS(fireCapacityChange)(snapped);
    });

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <GestureDetector gesture={panGesture}>
        <Canvas style={{ width: size, height: size }}>
          {/* Glow behind orb — blurred circle */}
          <Circle cx={center} cy={center} r={glowRadius} color={glowColor}>
            <BlurMask blur={40} style="normal" />
          </Circle>

          {/* Orb body — solid fill, gradient deferred to visual pass */}
          <Circle cx={center} cy={center} r={orbRadius} color={orbColor} />

          {/* Outer ring stroke */}
          <Circle
            cx={center}
            cy={center}
            r={orbRadius + 4}
            style="stroke"
            strokeWidth={1.5}
            color={ringColor}
          />
        </Canvas>
      </GestureDetector>
    </View>
  );
}

// Re-export capacity shared value access for parent components
export { useSharedValue } from 'react-native-reanimated';

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
