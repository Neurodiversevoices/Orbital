/**
 * AtmosphericReservoirFallback.tsx — static SVG fallback for environments
 * without Skia GPU support (web SSR, simulators that fail RuntimeEffect
 * compilation, very old hardware that throws on shader load).
 *
 * Mirrors the visual composition of the Skia version (two soft circular
 * bodies merging in the center) but is fully static — no animation, no
 * raymarching, no per-frame work. Same a11y wrapping so screen readers
 * receive identical info regardless of which renderer is active.
 *
 * If `react-native-svg` is unavailable for some reason, we degrade further
 * to a stack of nested `<View>` elements with radial-ish gradients
 * approximated via inset rings of decreasing opacity.
 */

import React, { useMemo } from 'react';
import {
  AccessibilityActionEvent,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import type { AtmosphericReservoirSeed } from './AtmosphericReservoir';
import { pct, stateBand } from './atmosphericHelpers';

// react-native-svg is in package.json (15.12.1) — import defensively in case
// a constrained build excludes it. We check at runtime to decide which path
// to render.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Svg: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Defs: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RadialGradient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LinearGradient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Stop: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Rect: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Circle: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const svg = require('react-native-svg');
  Svg = svg.default;
  Defs = svg.Defs;
  RadialGradient = svg.RadialGradient;
  LinearGradient = svg.LinearGradient;
  Stop = svg.Stop;
  Rect = svg.Rect;
  Circle = svg.Circle;
} catch {
  // SVG unavailable — we'll use the View-only fallback path.
}

// =============================================================================
// PROPS
// =============================================================================

export interface AtmosphericReservoirFallbackProps {
  reserves: number;
  demand: number;
  seed: AtmosphericReservoirSeed;
  width: number;
  height: number;
  onCapacityAdjust?: (delta: number) => void;
}

const A11Y_DELTA = 0.05;

// Spectrum (matches shader constants).
const CRIMSON = '#DC2626';
const AMBER = '#F59E0B';
const TEAL = '#2DD4BF';
const CYAN = '#06B6D4';

// =============================================================================
// COMPONENT
// =============================================================================

export function AtmosphericReservoirFallback(
  props: AtmosphericReservoirFallbackProps,
): React.ReactElement {
  const { reserves, demand, seed, width, height, onCapacityAdjust } = props;

  const a11yText = `Reserves ${pct(reserves)} percent, demand ${pct(demand)} percent, ${stateBand(reserves, demand)} state`;

  const onA11yAction = (e: AccessibilityActionEvent) => {
    if (!onCapacityAdjust) return;
    if (e.nativeEvent.actionName === 'increment') onCapacityAdjust(+A11Y_DELTA);
    if (e.nativeEvent.actionName === 'decrement') onCapacityAdjust(-A11Y_DELTA);
  };

  const containerStyle: ViewStyle = useMemo(
    () => ({ width, height }),
    [width, height],
  );

  return (
    <View
      style={[styles.root, containerStyle]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Atmospheric reservoir"
      accessibilityValue={{
        min: 0,
        max: 1,
        now: reserves,
        text: a11yText,
      }}
      accessibilityActions={[
        { name: 'increment', label: 'Increase capacity' },
        { name: 'decrement', label: 'Decrease capacity' },
      ]}
      onAccessibilityAction={onA11yAction}
    >
      {Svg ? (
        <SvgComposition
          width={width}
          height={height}
          reserves={reserves}
          demand={demand}
          hueShift={seed.hueShift}
        />
      ) : (
        <ViewComposition
          width={width}
          height={height}
          reserves={reserves}
          demand={demand}
        />
      )}
    </View>
  );
}

// =============================================================================
// SVG COMPOSITION — preferred path. Two radial-gradient circles plus a
// horizontal linear-gradient base. No animation.
// =============================================================================

function SvgComposition(args: {
  width: number;
  height: number;
  reserves: number;
  demand: number;
  hueShift: number;
}): React.ReactElement | null {
  const { width, height, reserves, demand } = args;
  if (!Svg || !Defs || !RadialGradient || !Stop || !Circle || !Rect) {
    return null;
  }

  // Reservoir: large body slightly left-of-center, sized by reserves.
  const reservoirCx = width * 0.42;
  const reservoirCy = height * 0.5;
  const reservoirR = Math.min(width, height) * (0.35 + 0.08 * reserves);

  // Demand: smaller body offset to the right, sized by demand.
  const demandCx = width * 0.66;
  const demandCy = height * 0.52;
  const demandR = Math.min(width, height) * (0.18 + 0.08 * demand);

  // Reservoir spans the spectrum; demand weights warm.
  const reservoirInner = TEAL;
  const reservoirMid = AMBER;
  const reservoirOuter = CYAN;
  const demandInner = AMBER;
  const demandOuter = CRIMSON;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="atm-bg" x1="0" y1="0" x2={String(width)} y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
        </LinearGradient>
        <RadialGradient
          id="atm-reservoir"
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <Stop offset="0" stopColor={reservoirInner} stopOpacity="0.92" />
          <Stop offset="0.55" stopColor={reservoirMid} stopOpacity="0.65" />
          <Stop offset="1" stopColor={reservoirOuter} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient
          id="atm-demand"
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <Stop offset="0" stopColor={demandInner} stopOpacity="0.85" />
          <Stop offset="0.6" stopColor={demandOuter} stopOpacity="0.55" />
          <Stop offset="1" stopColor={demandOuter} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={width} height={height} fill="url(#atm-bg)" />

      {/* Reservoir body */}
      <Circle
        cx={reservoirCx}
        cy={reservoirCy}
        r={reservoirR}
        fill="url(#atm-reservoir)"
      />

      {/* Demand body — sits in front so the smin overlap reads visually. */}
      <Circle
        cx={demandCx}
        cy={demandCy}
        r={demandR}
        fill="url(#atm-demand)"
      />
    </Svg>
  );
}

// =============================================================================
// VIEW-ONLY COMPOSITION — degraded fallback (no SVG). Stacks concentric
// circles at decreasing opacity to approximate a radial gradient.
// =============================================================================

function ViewComposition(args: {
  width: number;
  height: number;
  reserves: number;
  demand: number;
}): React.ReactElement {
  const { width, height, reserves, demand } = args;
  const minDim = Math.min(width, height);

  const reservoirSize = minDim * (0.7 + 0.16 * reserves);
  const demandSize = minDim * (0.36 + 0.16 * demand);

  // Stacked concentric circles approximating a radial gradient.
  const ringCount = 8;
  const reservoirRings = Array.from({ length: ringCount }, (_, i) => i);
  const demandRings = Array.from({ length: ringCount }, (_, i) => i);

  return (
    <View style={[styles.viewRoot, { width, height }]}>
      {/* Reservoir */}
      <View
        style={[
          styles.bodyAnchor,
          {
            left: width * 0.42 - reservoirSize / 2,
            top: height * 0.5 - reservoirSize / 2,
            width: reservoirSize,
            height: reservoirSize,
          },
        ]}
      >
        {reservoirRings.map((i) => {
          const t = i / (ringCount - 1);
          const size = reservoirSize * (1 - t * 0.85);
          const opacity = 0.06 + (1 - t) * 0.18;
          const color = i < 3 ? CYAN : i < 6 ? TEAL : AMBER;
          return (
            <View
              key={`res-${i}`}
              style={{
                position: 'absolute',
                left: (reservoirSize - size) / 2,
                top: (reservoirSize - size) / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
              }}
            />
          );
        })}
      </View>

      {/* Demand */}
      <View
        style={[
          styles.bodyAnchor,
          {
            left: width * 0.66 - demandSize / 2,
            top: height * 0.52 - demandSize / 2,
            width: demandSize,
            height: demandSize,
          },
        ]}
      >
        {demandRings.map((i) => {
          const t = i / (ringCount - 1);
          const size = demandSize * (1 - t * 0.85);
          const opacity = 0.08 + (1 - t) * 0.22;
          const color = i < 4 ? AMBER : CRIMSON;
          return (
            <View
              key={`dem-${i}`}
              style={{
                position: 'absolute',
                left: (demandSize - size) / 2,
                top: (demandSize - size) / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  viewRoot: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  bodyAnchor: {
    position: 'absolute',
  },
});

export default AtmosphericReservoirFallback;
