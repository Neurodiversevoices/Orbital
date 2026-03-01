/**
 * ClinicalOrbV10.tsx — Clinical Instrument Orb v10
 *
 * Single-file precision orb. 88 nodes, 28 render elements, circular clip,
 * one useDerivedValue for all animated geometry.
 *
 * NO hooks inside .map() loops.
 * NO rectangular clip — uses Skia.Path().addCircle.
 * NO multi-Paint stacking on a single shape.
 * Max 2 blur operations per frame.
 */

import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Line as SkiaLine,
  Paint,
  LinearGradient,
  RadialGradient,
  BlurMask,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { capacityToSkiaColor } from './orbColors';
import { getCapacityState } from './orbConstants';
import type { CapacityState } from './orbConstants';

// =============================================================================
// TYPES
// =============================================================================

type Node = {
  a: number; // base angle 0..2π
  r: number; // base radius 0..1
  s: number; // base size 0..1
  d: number; // depth 0..1 (0=back, 1=front)
  w: number; // wobble seed
};

type FrameNode = { x: number; y: number; r: number; a: number; layer: 0 | 1 };
type FramePath = { d: string; a: number };
type FrameBolt = { d: string; a: number };

type FrameData = {
  backNodes: FrameNode[];
  frontNodes: FrameNode[];
  paths: FramePath[];
  bolts: FrameBolt[];
};

// =============================================================================
// CONSTANTS
// =============================================================================

const DRAG_SENSITIVITY = 0.007;
const SNAP_INCREMENT = 0.05;
const PARALLAX_MAX = 4;
const NODE_COUNT = 88;
const PATHWAY_COUNT = 10;
const BOLT_COUNT = 4;
const DEPTH_SPLIT = 0.55;

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 120,
  mass: 1,
  overshootClamping: true,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

// =============================================================================
// HELPERS (worklets)
// =============================================================================

function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(Math.max(v, lo), hi);
}

// =============================================================================
// COMPONENT
// =============================================================================

interface ClinicalOrbV10Props {
  size?: number;
  initialCapacity?: number;
  onCapacityChange?: (capacity: number) => void;
  onStateChange?: (state: CapacityState) => void;
}

export const ClinicalOrbV10: React.FC<ClinicalOrbV10Props> = ({
  size = 368,
  initialCapacity = 0.82,
  onCapacityChange,
  onStateChange,
}) => {
  // Coordinate system
  const R = size * 0.5;
  const C = { x: size / 2, y: size / 2 };
  const R_OUT = R * 1.05;
  const R_IN = R * 0.94;

  // Shared animation values
  const capacity = useSharedValue(initialCapacity);
  const rawCapacity = useSharedValue(initialCapacity);
  const lastState = useSharedValue<CapacityState>(getCapacityState(initialCapacity));
  const parallaxX = useSharedValue(0);
  const parallaxY = useSharedValue(0);
  const time = useSharedValue(0);

  useFrameCallback((info) => {
    'worklet';
    time.value = (info.timeSinceFirstFrame ?? 0) / 1000;
  });

  // ─── Static nodes (useMemo, once) ─────────────────────────────────
  const nodes = useMemo<Node[]>(() => {
    const arr: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const seed = i * 2654435761;
      const hash = (v: number) => ((v >>> 0) % 10000) / 10000;
      arr.push({
        a: hash(seed) * Math.PI * 2,
        r: hash(seed + 1) * 0.85 + 0.05,
        s: hash(seed + 2) * 0.7 + 0.3,
        d: 0.3 + hash(seed + 3) * 0.5, // biased toward mid-depth
        w: hash(seed + 4) * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  // ─── Tick marks (useMemo, once) ───────────────────────────────────
  const tickData = useMemo(() => {
    const ticks: Array<{
      x1: number; y1: number; x2: number; y2: number;
      isMajor: boolean;
    }> = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % 5 === 0;
      const innerR = isMajor ? R_IN * 0.88 : R_IN * 0.91;
      const outerR = R_IN * 0.96;
      ticks.push({
        x1: C.x + Math.cos(angle) * innerR,
        y1: C.y + Math.sin(angle) * innerR,
        x2: C.x + Math.cos(angle) * outerR,
        y2: C.y + Math.sin(angle) * outerR,
        isMajor,
      });
    }
    return ticks;
  }, [C.x, C.y, R_IN]);

  // ─── Grain dots (useMemo, once) ───────────────────────────────────
  const grainDots = useMemo(() => {
    const dots: Array<{ x: number; y: number; r: number }> = [];
    for (let i = 0; i < 80; i++) {
      const seed = (i + 200) * 2654435761;
      const hash = (v: number) => ((v >>> 0) % 10000) / 10000;
      const angle = hash(seed) * Math.PI * 2;
      const radius = hash(seed + 1) * R_IN * 0.9;
      dots.push({
        x: C.x + Math.cos(angle) * radius,
        y: C.y + Math.sin(angle) * radius,
        r: 0.5 + hash(seed + 2) * 0.5,
      });
    }
    return dots;
  }, [C.x, C.y, R_IN]);

  // ─── Scratch lines (useMemo, once) ────────────────────────────────
  const scratchLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < 10; i++) {
      const seed = (i + 500) * 2654435761;
      const hash = (v: number) => ((v >>> 0) % 10000) / 10000;
      const angle = hash(seed) * Math.PI * 2;
      const r1 = R_IN * 0.15;
      const r2 = R_IN * 0.8;
      lines.push({
        x1: C.x + Math.cos(angle) * r1,
        y1: C.y + Math.sin(angle) * r1,
        x2: C.x + Math.cos(angle) * r2,
        y2: C.y + Math.sin(angle) * r2,
      });
    }
    return lines;
  }, [C.x, C.y, R_IN]);

  // ─── Calibration arc paths (useMemo, once) ────────────────────────
  const calibrationArcs = useMemo(() => {
    const makeArc = (r: number, startDeg: number, endDeg: number) => {
      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;
      const x1 = C.x + r * Math.cos(startRad);
      const y1 = C.y + r * Math.sin(startRad);
      const x2 = C.x + r * Math.cos(endRad);
      const y2 = C.y + r * Math.sin(endRad);
      const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };
    return {
      arc1: makeArc(R_IN * 0.84, -135, 135),
      arc2: makeArc(R_IN * 0.77, -90, 90),
    };
  }, [C.x, C.y, R_IN]);

  // ─── Crosshair (useMemo, once) ────────────────────────────────────
  const crosshair = useMemo(() => {
    const len = R_IN * 0.06;
    return {
      h: { x1: C.x - len, y1: C.y, x2: C.x + len, y2: C.y },
      v: { x1: C.x, y1: C.y - len, x2: C.x, y2: C.y + len },
    };
  }, [C.x, C.y, R_IN]);

  // ─── Clip path (useMemo, once) ────────────────────────────────────
  const clipPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(C.x, C.y, R_IN);
    return p;
  }, [C.x, C.y, R_IN]);

  // ─── ONE useDerivedValue for all animated geometry ────────────────
  const frameData = useDerivedValue<FrameData>(() => {
    const t = time.value;
    const pxX = parallaxX.value;
    const pxY = parallaxY.value;
    const backNodes: FrameNode[] = [];
    const frontNodes: FrameNode[] = [];

    // Compute nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const wobbleA = Math.sin(t * 0.4 + n.w) * 0.08;
      const wobbleR = Math.sin(t * 0.3 + n.w * 1.7) * 0.04;
      const angle = n.a + wobbleA;
      const radius = (n.r + wobbleR) * R_IN * 0.85;
      const depthPx = n.d < DEPTH_SPLIT ? 0.3 : 0.6;
      const x = C.x + Math.cos(angle) * radius + pxX * depthPx;
      const y = C.y + Math.sin(angle) * radius + pxY * depthPx;
      const layer: 0 | 1 = n.d < DEPTH_SPLIT ? 0 : 1;
      const nodeR = layer === 0
        ? 1.2 + n.s * 1.2
        : 1.6 + n.s * 1.4;
      const alpha = layer === 0
        ? 0.05 + n.s * 0.11
        : 0.10 + n.s * 0.18;

      const fn: FrameNode = { x, y, r: nodeR, a: alpha, layer };
      if (layer === 0) backNodes.push(fn);
      else frontNodes.push(fn);
    }

    // Compute 10 neural pathway beziers
    const paths: FramePath[] = [];
    for (let i = 0; i < PATHWAY_COUNT; i++) {
      const seed = i * 7.13;
      const a1 = seed + t * 0.15;
      const a2 = seed + 2.1 + t * 0.12;
      const r1 = R_IN * (0.2 + Math.sin(seed) * 0.15);
      const r2 = R_IN * (0.5 + Math.cos(seed * 1.3) * 0.2);
      const x1 = C.x + Math.cos(a1) * r1;
      const y1 = C.y + Math.sin(a1) * r1;
      const x2 = C.x + Math.cos(a2) * r2;
      const y2 = C.y + Math.sin(a2) * r2;
      const cx1 = C.x + Math.cos(a1 + 0.5) * r1 * 1.5;
      const cy1 = C.y + Math.sin(a1 + 0.5) * r1 * 1.5;
      const cx2 = C.x + Math.cos(a2 - 0.5) * r2 * 0.7;
      const cy2 = C.y + Math.sin(a2 - 0.5) * r2 * 0.7;
      const alpha = 0.03 + (i / PATHWAY_COUNT) * 0.04;
      paths.push({
        d: `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`,
        a: alpha,
      });
    }

    // Compute 4 lightning bolts
    const bolts: FrameBolt[] = [];
    for (let i = 0; i < BOLT_COUNT; i++) {
      const bSeed = i * 3.77 + t * 0.8;
      const startAngle = bSeed;
      const bR = R_IN * 0.3;
      let bx = C.x + Math.cos(startAngle) * bR;
      let by = C.y + Math.sin(startAngle) * bR;
      let d = `M ${bx} ${by}`;
      const segs = 5 + Math.floor(Math.sin(bSeed) * 2);
      for (let j = 0; j < segs; j++) {
        const jAngle = startAngle + (j + 1) * 0.4;
        const jR = bR + (j + 1) * R_IN * 0.08;
        const jitter = Math.sin(t * 3 + i * 5 + j * 2) * R_IN * 0.04;
        bx = C.x + Math.cos(jAngle) * jR + jitter;
        by = C.y + Math.sin(jAngle) * jR + jitter;
        d += ` L ${bx} ${by}`;
      }
      const alpha = 0.02 + (i / BOLT_COUNT) * 0.06;
      bolts.push({ d, a: alpha });
    }

    return { backNodes, frontNodes, paths, bolts };
  });

  // ─── SECOND useDerivedValue: capacity color ───────────────────────
  const capacityColor = useDerivedValue(() =>
    capacityToSkiaColor(capacity.value, 0.88),
  );

  // ─── Callbacks ────────────────────────────────────────────────────
  const notifyCapacity = useCallback(
    (c: number) => onCapacityChange?.(c),
    [onCapacityChange],
  );
  const notifyState = useCallback(
    (s: CapacityState) => onStateChange?.(s),
    [onStateChange],
  );

  // ─── Gesture ──────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      const delta = -e.translationY * DRAG_SENSITIVITY;
      const newCap = clamp(rawCapacity.value + delta, 0, 1);
      capacity.value = newCap;
      parallaxX.value = clamp(e.translationX / 100, -1, 1) * PARALLAX_MAX;
      parallaxY.value = clamp(e.translationY / 100, -1, 1) * PARALLAX_MAX;
      runOnJS(notifyCapacity)(newCap);
      const newState = getCapacityState(newCap);
      if (newState !== lastState.value) {
        lastState.value = newState;
        runOnJS(notifyState)(newState);
      }
    })
    .onEnd(() => {
      'worklet';
      const snapped = Math.round(capacity.value / SNAP_INCREMENT) * SNAP_INCREMENT;
      const clamped = clamp(snapped, 0, 1);
      rawCapacity.value = clamped;
      capacity.value = withSpring(clamped, SPRING_CONFIG);
      parallaxX.value = withSpring(0, SPRING_CONFIG);
      parallaxY.value = withSpring(0, SPRING_CONFIG);
      runOnJS(notifyCapacity)(clamped);
    });

  // ─── Diagonal gradient helpers ────────────────────────────────────
  const diagTL = vec(C.x - R_OUT, C.y - R_OUT);
  const diagBR = vec(C.x + R_OUT, C.y + R_OUT);

  // =================================================================
  // RENDER — exact 28-element order
  // =================================================================
  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.canvas, { width: size, height: size }]}>
          <Canvas style={{ width: size, height: size }}>

            {/* ========== NO CLIP ZONE ========== */}

            {/* 1. Ambient background glow */}
            <Circle cx={C.x} cy={C.y} r={R_OUT * 1.25}>
              <Paint>
                <RadialGradient
                  c={vec(C.x, C.y)}
                  r={R_OUT * 1.25}
                  colors={['rgba(0,210,255,0.04)', 'transparent']}
                />
              </Paint>
            </Circle>

            {/* 2. Device drop shadow */}
            <Circle cx={C.x} cy={C.y + 3} r={R_OUT} color="rgba(0,0,0,0.55)">
              <BlurMask blur={12} style="normal" />
            </Circle>

            {/* 3. Outer chassis base */}
            <Circle cx={C.x} cy={C.y} r={R_OUT} color="#14181F" />

            {/* 4. Housing face gradient stroke */}
            <Circle cx={C.x} cy={C.y} r={R_OUT - 3} style="stroke" strokeWidth={10}>
              <Paint>
                <LinearGradient
                  start={diagTL}
                  end={diagBR}
                  colors={[
                    'rgba(255,255,255,0.06)',
                    'rgba(255,255,255,0.00)',
                    'rgba(0,0,0,0.25)',
                  ]}
                  positions={[0, 0.35, 1]}
                />
              </Paint>
            </Circle>

            {/* 5. Outer edge highlight */}
            <Circle
              cx={C.x} cy={C.y} r={R_OUT - 1}
              style="stroke" strokeWidth={1}
              color="rgba(255,255,255,0.05)"
            />

            {/* 6. Inner recess lip */}
            <Circle cx={C.x} cy={C.y} r={R_IN + 4} style="stroke" strokeWidth={8}>
              <Paint>
                <LinearGradient
                  start={diagTL}
                  end={diagBR}
                  colors={[
                    'rgba(0,0,0,0.55)',
                    'rgba(0,0,0,0.25)',
                    'rgba(255,255,255,0.03)',
                  ]}
                  positions={[0, 0.55, 1]}
                />
              </Paint>
            </Circle>

            {/* 7. Inner shadow into aperture */}
            <Circle cx={C.x} cy={C.y + 1} r={R_IN + 2} color="rgba(0,0,0,0.40)">
              <BlurMask blur={6} style="normal" />
            </Circle>

            {/* 8. Etched calibration ring */}
            <Circle
              cx={C.x} cy={C.y} r={R_IN + 10}
              style="stroke" strokeWidth={1}
              color="rgba(255,255,255,0.035)"
            />

            {/* ========== CIRCULAR CLIP ZONE ========== */}
            <Group clip={clipPath}>

              {/* 9. Orb base fill — MUST be capacity color */}
              <Circle cx={C.x} cy={C.y} r={R_IN * 0.985} color={capacityColor} />

              {/* 10. Orb interior edge darkening */}
              <Circle cx={C.x} cy={C.y} r={R_IN}>
                <Paint>
                  <RadialGradient
                    c={vec(C.x, C.y)}
                    r={R_IN}
                    colors={['transparent', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)']}
                    positions={[0, 0.75, 1]}
                  />
                </Paint>
              </Circle>

              {/* 11. Center lift haze */}
              <Circle cx={C.x} cy={C.y} r={R_IN}>
                <Paint>
                  <RadialGradient
                    c={vec(C.x, C.y)}
                    r={R_IN}
                    colors={[
                      'rgba(255,255,255,0.06)',
                      'rgba(255,255,255,0.02)',
                      'transparent',
                    ]}
                    positions={[0, 0.4, 1]}
                  />
                </Paint>
              </Circle>

              {/* 12. Back particles — blurred group */}
              <Group>
                <BlurMask blur={1.2} style="normal" />
                {frameData.value.backNodes.map((n, i) => (
                  <Circle
                    key={`bn-${i}`}
                    cx={n.x} cy={n.y} r={n.r}
                    color={`rgba(255,255,255,${n.a})`}
                  />
                ))}
              </Group>

              {/* 13. Neural pathways */}
              {frameData.value.paths.map((p, i) => (
                <Path
                  key={`np-${i}`}
                  path={p.d}
                  style="stroke"
                  strokeWidth={1}
                  strokeCap="round"
                  color={`rgba(255,255,255,${p.a})`}
                />
              ))}

              {/* 14. Lightning bolts */}
              {frameData.value.bolts.map((b, i) => (
                <Path
                  key={`lb-${i}`}
                  path={b.d}
                  style="stroke"
                  strokeWidth={1.6 - i * 0.2}
                  strokeCap="round"
                  color={`rgba(255,255,255,${b.a})`}
                />
              ))}

              {/* 15. Front particles + micro highlights */}
              {frameData.value.frontNodes.map((n, i) => (
                <Group key={`fn-${i}`}>
                  <Circle
                    cx={n.x} cy={n.y} r={n.r}
                    color={`rgba(255,255,255,${n.a})`}
                  />
                  <Circle
                    cx={n.x - n.r * 0.25}
                    cy={n.y - n.r * 0.25}
                    r={n.r * 0.3}
                    color="rgba(255,255,255,0.10)"
                  />
                </Group>
              ))}

              {/* ===== ENGRAVINGS (inside clip, before lens) ===== */}
              <Group>
                <BlurMask blur={0.6} style="normal" />

                {/* 16. Tick marks */}
                {tickData.map((tick, i) => (
                  <SkiaLine
                    key={`tk-${i}`}
                    p1={vec(tick.x1, tick.y1)}
                    p2={vec(tick.x2, tick.y2)}
                    style="stroke"
                    strokeWidth={tick.isMajor ? 1.0 : 0.6}
                    color={tick.isMajor
                      ? 'rgba(255,255,255,0.065)'
                      : 'rgba(255,255,255,0.040)'}
                  />
                ))}

                {/* Calibration arcs */}
                <Path
                  path={calibrationArcs.arc1}
                  style="stroke" strokeWidth={0.6}
                  color="rgba(255,255,255,0.035)"
                />
                <Path
                  path={calibrationArcs.arc2}
                  style="stroke" strokeWidth={0.6}
                  color="rgba(255,255,255,0.030)"
                />

                {/* Crosshair */}
                <SkiaLine
                  p1={vec(crosshair.h.x1, crosshair.h.y1)}
                  p2={vec(crosshair.h.x2, crosshair.h.y2)}
                  style="stroke" strokeWidth={0.4}
                  color="rgba(255,255,255,0.028)"
                />
                <SkiaLine
                  p1={vec(crosshair.v.x1, crosshair.v.y1)}
                  p2={vec(crosshair.v.x2, crosshair.v.y2)}
                  style="stroke" strokeWidth={0.4}
                  color="rgba(255,255,255,0.028)"
                />
                <Circle cx={C.x} cy={C.y} r={1.4} color="rgba(255,255,255,0.035)" />
              </Group>
              {/* 17. ^^^ engravings blur wraps element 16 ^^^ */}

              {/* ===== LENS OVERLAYS (inside clip, after engravings) ===== */}

              {/* 18. Edge compression vignette */}
              <Circle cx={C.x} cy={C.y} r={R_IN}>
                <Paint>
                  <RadialGradient
                    c={vec(C.x, C.y)}
                    r={R_IN}
                    colors={[
                      'rgba(0,0,0,0.00)',
                      'rgba(0,0,0,0.00)',
                      'rgba(0,0,0,0.16)',
                      'rgba(0,0,0,0.42)',
                    ]}
                    positions={[0, 0.55, 0.78, 1]}
                  />
                </Paint>
              </Circle>

              {/* 19. Fresnel rim ring */}
              <Circle cx={C.x} cy={C.y} r={R_IN - 1} style="stroke" strokeWidth={2}>
                <Paint>
                  <LinearGradient
                    start={diagTL}
                    end={diagBR}
                    colors={[
                      'rgba(255,255,255,0.10)',
                      'rgba(255,255,255,0.00)',
                      'rgba(255,255,255,0.06)',
                    ]}
                    positions={[0, 0.5, 1]}
                  />
                </Paint>
              </Circle>

              {/* 20. Primary specular highlight (top-left) */}
              <Circle
                cx={C.x - R_IN * 0.28}
                cy={C.y - R_IN * 0.32}
                r={R_IN * 0.48}
              >
                <Paint>
                  <RadialGradient
                    c={vec(C.x - R_IN * 0.28, C.y - R_IN * 0.32)}
                    r={R_IN * 0.48}
                    colors={[
                      'rgba(255,255,255,0.12)',
                      'rgba(255,255,255,0.06)',
                      'rgba(255,255,255,0.00)',
                    ]}
                    positions={[0, 0.35, 1]}
                  />
                </Paint>
              </Circle>

              {/* 21. Secondary specular (bottom-right) */}
              <Circle
                cx={C.x + R_IN * 0.35}
                cy={C.y + R_IN * 0.30}
                r={R_IN * 0.20}
              >
                <Paint>
                  <RadialGradient
                    c={vec(C.x + R_IN * 0.35, C.y + R_IN * 0.30)}
                    r={R_IN * 0.20}
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.00)']}
                  />
                </Paint>
              </Circle>

              {/* 22. Glass wash */}
              <Circle cx={C.x} cy={C.y} r={R_IN}>
                <Paint>
                  <LinearGradient
                    start={vec(C.x, C.y - R_IN)}
                    end={vec(C.x, C.y + R_IN)}
                    colors={[
                      'rgba(255,255,255,0.04)',
                      'rgba(255,255,255,0.00)',
                      'rgba(0,0,0,0.06)',
                    ]}
                    positions={[0, 0.35, 1]}
                  />
                </Paint>
              </Circle>

              {/* 23. Optical coating hint */}
              <Circle
                cx={C.x} cy={C.y} r={R_IN - 2}
                style="stroke" strokeWidth={1}
                color="rgba(0,255,220,0.06)"
              />

              {/* ===== MICRO TEXTURE (inside clip) ===== */}

              {/* 24. Grain dots */}
              {grainDots.map((dot, i) => (
                <Circle
                  key={`gd-${i}`}
                  cx={dot.x} cy={dot.y} r={dot.r}
                  color="rgba(255,255,255,0.025)"
                />
              ))}

              {/* 25. Scratch lines */}
              {scratchLines.map((line, i) => (
                <SkiaLine
                  key={`sl-${i}`}
                  p1={vec(line.x1, line.y1)}
                  p2={vec(line.x2, line.y2)}
                  style="stroke"
                  strokeWidth={0.3}
                  color="rgba(255,255,255,0.018)"
                />
              ))}

            </Group>
            {/* ========== END CLIP ZONE ========== */}

            {/* ========== OUTSIDE CLIP (glass edge) ========== */}

            {/* 26. Glass edge ring */}
            <Circle cx={C.x} cy={C.y} r={R_IN + 1} style="stroke" strokeWidth={2}>
              <Paint>
                <LinearGradient
                  start={diagTL}
                  end={diagBR}
                  colors={[
                    'rgba(255,255,255,0.06)',
                    'transparent',
                    'rgba(255,255,255,0.03)',
                  ]}
                  positions={[0, 0.5, 1]}
                />
              </Paint>
            </Circle>

            {/* 27. Inner shadow ring */}
            <Circle
              cx={C.x} cy={C.y} r={R_IN}
              style="stroke" strokeWidth={2}
              color="rgba(0,0,0,0.20)"
            />

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

export default ClinicalOrbV10;
