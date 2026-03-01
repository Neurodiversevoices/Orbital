/**
 * WaveOrb.tsx — Icon-Aligned Simplified Orb with Capacity Wave
 *
 * Five visual layers, nothing more:
 *   1. Ambient glow (capacity-colored light spill)
 *   2. Housing ring (machined metal edge)
 *   3. Glass sphere (thick optical glass body)
 *   4. The Wave (hero element — single bezier, 3-pass glow)
 *   5. Glass overlay (vignette + wash)
 *
 * No particles. No nodes. No lightning. No pathways. No ticks.
 * The orb is: glass housing + wave + glow. That's it.
 *
 * KEY: Individual useDerivedValue hooks for each animated Skia prop.
 * Skia elements accept SharedValue/DerivedValue directly — never access .value in JSX.
 */

import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Paint,
  LinearGradient,
  RadialGradient,
  BlurMask,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  type SharedValue,
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

// =============================================================================
// COLOR
// =============================================================================

interface RGB { r: number; g: number; b: number }

function capacityColor(cap: number): RGB {
  'worklet';
  const c = Math.max(0, Math.min(1, cap));
  if (c <= 0.5) {
    const t = c / 0.5;
    return {
      r: Math.round(255 + (245 - 255) * t),
      g: Math.round(59 + (183 - 59) * t),
      b: Math.round(48 + (0 - 48) * t),
    };
  }
  const t = (c - 0.5) / 0.5;
  return {
    r: Math.round(245 + (0 - 245) * t),
    g: Math.round(183 + (215 - 183) * t),
    b: Math.round(0 + (255 - 0) * t),
  };
}

function rgbaStr(rgb: RGB, a: number): string {
  'worklet';
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SIZE = 320;
const DRAG_SENSITIVITY = 0.005;
const SNAP_INCREMENT = 0.05;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 150,
  mass: 1,
  overshootClamping: true,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(Math.max(v, lo), hi);
}

// =============================================================================
// COMPONENT
// =============================================================================

interface WaveOrbProps {
  size?: number;
  capacity: SharedValue<number>;
  onCapacityChange?: (value: number) => void;
}

export const WaveOrb: React.FC<WaveOrbProps> = ({
  size = DEFAULT_SIZE,
  capacity,
  onCapacityChange,
}) => {
  const R = size / 2;
  const C = { x: R, y: R };
  const ORB_R = R * 0.88;
  const HOUSING_R = R * 0.95;

  // Shared values
  const rawCapacity = useSharedValue(capacity.value);
  const time = useSharedValue(0);
  const breathe = useSharedValue(0);

  useFrameCallback((info) => {
    'worklet';
    time.value = (info.timeSinceFirstFrame ?? 0) / 1000;
    breathe.value += 0.008;
  });

  // Clip path for wave
  const waveClip = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(C.x, C.y, ORB_R - 4);
    return p;
  }, [C.x, C.y, ORB_R]);

  // Diagonal gradient endpoints
  const diagTL = vec(C.x - HOUSING_R, C.y - HOUSING_R);
  const diagBR = vec(C.x + HOUSING_R, C.y + HOUSING_R);

  // ─── Individual DerivedValues for animated Skia props ─────────────

  // Ambient glow color (single circle overlay, not gradient)
  const ambientColor = useDerivedValue(() => {
    const rgb = capacityColor(capacity.value);
    return rgbaStr(rgb, 0.05);
  });

  // Base tint color for orb center
  const baseTintColor = useDerivedValue(() => {
    const rgb = capacityColor(capacity.value);
    return rgbaStr(rgb, 0.06);
  });

  // Wave path string (animated each frame)
  const wavePath = useDerivedValue(() => {
    const cap = capacity.value;
    const t = time.value;

    const waveY = C.y - (cap - 0.5) * ORB_R * 0.4;
    const waveAmplitude = ORB_R * 0.15 + (1 - cap) * ORB_R * 0.1;
    const phase = (t * 0.5) % (Math.PI * 2);

    const leftEdge = C.x - ORB_R + 10;
    const rightEdge = C.x + ORB_R - 10;
    const segW = (rightEdge - leftEdge) / 6;

    let d = `M ${leftEdge} ${waveY}`;
    for (let i = 0; i < 6; i++) {
      const x1 = leftEdge + segW * i + segW * 0.33;
      const x2 = leftEdge + segW * i + segW * 0.66;
      const x3 = leftEdge + segW * (i + 1);
      const dir = i % 2 === 0 ? -1 : 1;
      const amp = waveAmplitude * dir * (0.7 + 0.3 * Math.sin(phase + i * 0.8));

      let jitter = 0;
      if (cap >= 0.3 && cap <= 0.7) {
        jitter = Math.sin(t * 2 + i * 3.7) * 0.8;
      }
      if (cap < 0.3) {
        jitter = Math.sin(t * 4 + i * 2.1) * 1.5;
      }

      const y1 = waveY + amp * 0.5 + jitter;
      const y2 = waveY + amp + jitter;
      const y3 = waveY + jitter * 0.3;
      d += ` C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
    }
    return d;
  });

  // Wave glow color (wide pass)
  const waveGlowWide = useDerivedValue(() => {
    const rgb = capacityColor(capacity.value);
    return rgbaStr(rgb, 0.12);
  });

  // Wave glow color (medium pass)
  const waveGlowMed = useDerivedValue(() => {
    const rgb = capacityColor(capacity.value);
    return rgbaStr(rgb, 0.25);
  });

  // Wave main line color
  const waveMainColor = useDerivedValue(() => {
    const rgb = capacityColor(capacity.value);
    return rgbaStr(rgb, 0.90);
  });

  // Breathing scale transform
  const breatheTransform = useDerivedValue(() => {
    const s = 1 + Math.sin(breathe.value) * 0.004;
    return [{ scale: s }];
  });

  // ─── Gesture ──────────────────────────────────────────────────────
  const notifyCapacity = useCallback(
    (v: number) => onCapacityChange?.(v),
    [onCapacityChange],
  );

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      const delta = -e.translationY * DRAG_SENSITIVITY;
      const newCap = clamp(rawCapacity.value + delta, 0, 1);
      capacity.value = newCap;
    })
    .onEnd(() => {
      'worklet';
      const snapped = Math.round(capacity.value / SNAP_INCREMENT) * SNAP_INCREMENT;
      const clamped = clamp(snapped, 0, 1);
      rawCapacity.value = clamped;
      capacity.value = withSpring(clamped, SPRING_CONFIG);
      runOnJS(notifyCapacity)(clamped);
    });

  // =================================================================
  // RENDER — all Skia props use DerivedValue directly, never .value
  // =================================================================
  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.canvas, { width: size, height: size }]}>
          <Canvas style={{ width: size, height: size }}>
            <Group transform={breatheTransform} origin={vec(C.x, C.y)}>

              {/* ===== LAYER 1: Ambient glow ===== */}
              {/* Soft colored circle behind orb — shifts with capacity */}
              <Circle cx={C.x} cy={C.y} r={ORB_R * 1.6} color={ambientColor}>
                <BlurMask blur={40} style="normal" />
              </Circle>

              {/* ===== LAYER 2: Housing ring ===== */}

              {/* Drop shadow */}
              <Circle cx={C.x} cy={C.y + 2} r={HOUSING_R} color="rgba(0,0,0,0.4)">
                <BlurMask blur={8} style="normal" />
              </Circle>

              {/* Metal ring stroke */}
              <Circle cx={C.x} cy={C.y} r={HOUSING_R} style="stroke" strokeWidth={6}>
                <Paint>
                  <LinearGradient
                    start={diagTL}
                    end={diagBR}
                    colors={[
                      'rgba(255,255,255,0.08)',
                      'rgba(255,255,255,0.02)',
                      'rgba(0,0,0,0.15)',
                    ]}
                    positions={[0, 0.5, 1]}
                  />
                </Paint>
              </Circle>

              {/* Inner edge (dark recess) */}
              <Circle
                cx={C.x} cy={C.y} r={ORB_R + 2}
                style="stroke" strokeWidth={2}
                color="rgba(0,0,0,0.3)"
              />

              {/* ===== LAYER 3: Glass sphere ===== */}

              {/* Base fill — very dark sphere */}
              <Circle cx={C.x} cy={C.y} r={ORB_R} color="rgba(8,10,18,0.98)" />

              {/* Center tint — faint capacity color, animated */}
              <Circle cx={C.x} cy={C.y} r={ORB_R * 0.6} color={baseTintColor}>
                <BlurMask blur={30} style="normal" />
              </Circle>

              {/* Edge darkening (sphere curvature) */}
              <Circle cx={C.x} cy={C.y} r={ORB_R}>
                <Paint>
                  <RadialGradient
                    c={vec(C.x, C.y)}
                    r={ORB_R}
                    colors={[
                      'transparent',
                      'transparent',
                      'rgba(0,0,0,0.2)',
                      'rgba(0,0,0,0.4)',
                    ]}
                    positions={[0, 0.7, 0.9, 1]}
                  />
                </Paint>
              </Circle>

              {/* Specular highlight (top-left) */}
              <Circle
                cx={C.x - ORB_R * 0.25}
                cy={C.y - ORB_R * 0.3}
                r={ORB_R * 0.45}
              >
                <Paint>
                  <RadialGradient
                    c={vec(C.x - ORB_R * 0.25, C.y - ORB_R * 0.3)}
                    r={ORB_R * 0.45}
                    colors={[
                      'rgba(255,255,255,0.10)',
                      'rgba(255,255,255,0.03)',
                      'transparent',
                    ]}
                    positions={[0, 0.4, 1]}
                  />
                </Paint>
              </Circle>

              {/* Secondary specular (bottom-right) */}
              <Circle
                cx={C.x + ORB_R * 0.3}
                cy={C.y + ORB_R * 0.25}
                r={ORB_R * 0.18}
              >
                <Paint>
                  <RadialGradient
                    c={vec(C.x + ORB_R * 0.3, C.y + ORB_R * 0.25)}
                    r={ORB_R * 0.18}
                    colors={['rgba(255,255,255,0.04)', 'transparent']}
                  />
                </Paint>
              </Circle>

              {/* Glass edge rim (Fresnel) */}
              <Circle cx={C.x} cy={C.y} r={ORB_R - 1} style="stroke" strokeWidth={1.5}>
                <Paint>
                  <LinearGradient
                    start={diagTL}
                    end={diagBR}
                    colors={[
                      'rgba(255,255,255,0.08)',
                      'rgba(255,255,255,0.01)',
                      'rgba(255,255,255,0.05)',
                    ]}
                    positions={[0, 0.5, 1]}
                  />
                </Paint>
              </Circle>

              {/* Optical coating hint */}
              <Circle
                cx={C.x} cy={C.y} r={ORB_R - 2}
                style="stroke" strokeWidth={0.5}
                color="rgba(0,255,220,0.04)"
              />

              {/* ===== LAYER 4: The Wave (clipped to orb) ===== */}
              <Group clip={waveClip}>

                {/* Pass 1: Wide soft glow */}
                <Path
                  path={wavePath}
                  style="stroke"
                  strokeWidth={12}
                  strokeCap="round"
                  color={waveGlowWide}
                >
                  <BlurMask blur={8} style="normal" />
                </Path>

                {/* Pass 2: Medium glow */}
                <Path
                  path={wavePath}
                  style="stroke"
                  strokeWidth={5}
                  strokeCap="round"
                  color={waveGlowMed}
                >
                  <BlurMask blur={3} style="normal" />
                </Path>

                {/* Pass 3: Sharp main line */}
                <Path
                  path={wavePath}
                  style="stroke"
                  strokeWidth={2}
                  strokeCap="round"
                  color={waveMainColor}
                />

              </Group>

              {/* ===== LAYER 5: Glass overlay ===== */}

              {/* Vignette */}
              <Circle cx={C.x} cy={C.y} r={ORB_R}>
                <Paint>
                  <RadialGradient
                    c={vec(C.x, C.y)}
                    r={ORB_R}
                    colors={[
                      'transparent',
                      'transparent',
                      'rgba(0,0,0,0.12)',
                      'rgba(0,0,0,0.30)',
                    ]}
                    positions={[0, 0.6, 0.85, 1]}
                  />
                </Paint>
              </Circle>

              {/* Top-to-bottom glass wash */}
              <Circle cx={C.x} cy={C.y} r={ORB_R}>
                <Paint>
                  <LinearGradient
                    start={vec(C.x, C.y - ORB_R)}
                    end={vec(C.x, C.y + ORB_R)}
                    colors={[
                      'rgba(255,255,255,0.03)',
                      'transparent',
                      'rgba(0,0,0,0.05)',
                    ]}
                    positions={[0, 0.4, 1]}
                  />
                </Paint>
              </Circle>

            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  canvas: { alignItems: 'center', justifyContent: 'center' },
});

export default WaveOrb;
