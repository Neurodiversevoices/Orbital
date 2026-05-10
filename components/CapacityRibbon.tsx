/**
 * CapacityRibbon.tsx — Flowing capacity indicator (light theme).
 *
 * Replaces the legacy orb/gauge for the home screen. Shows current capacity
 * as a glowing dot riding a left→right curve that transitions through the
 * canonical capacity spectrum: crimson (Overloaded) → amber (Tight) → teal
 * (Ready). The curve has a subtle dip in the middle for visual rhythm.
 *
 * Visual decisions:
 *   - SVG (not Skia) — single bezier with linear-gradient stroke is trivially
 *     expressed in SVG and avoids Canvas/font setup overhead.
 *   - Dot pulse uses Reanimated `withRepeat` and is suppressed when the user
 *     has Reduce Motion enabled.
 *
 * Stub usage:
 *   <CapacityRibbon capacity={0.32} state="stretched" />
 *
 * Position mapping (per spec):
 *   depleted   → 12% across
 *   stretched  → 50% across
 *   resourced  → 85% across
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  RadialGradient,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { useAccessibility } from '../lib/hooks/useAccessibility';

// =============================================================================
// TYPES
// =============================================================================

export type CapacityRibbonState = 'depleted' | 'stretched' | 'resourced';

interface CapacityRibbonProps {
  /** Capacity value 0..1 (used for a11y readout). */
  capacity: number;
  /** Coarse state band — drives dot position + glow color. */
  state: CapacityRibbonState;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RIBBON_HEIGHT = 120;
const CURVE_TOP = 36;
const CURVE_BOTTOM_AT_EDGES = 56;
const CURVE_BOTTOM_AT_MIDDLE = 78;
const DOT_RADIUS = 7;
const GLOW_RADIUS = 22;

const STATE_POSITION: Record<CapacityRibbonState, number> = {
  depleted: 0.12,
  stretched: 0.5,
  resourced: 0.85,
};

const STATE_COLOR: Record<CapacityRibbonState, string> = {
  depleted: colors.depleted,
  stretched: colors.stretched,
  resourced: colors.resourced,
};

const STATE_LABEL: Record<CapacityRibbonState, string> = {
  depleted: 'depleted',
  stretched: 'stretched',
  resourced: 'resourced',
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Cubic bezier path that starts mid-low on the left, dips slightly past the
 * middle, then rises toward the right. Produces a subtle "smile" curve that
 * conveys forward motion.
 */
function buildRibbonPath(width: number): string {
  const yLeft = CURVE_BOTTOM_AT_EDGES;
  const yMid = CURVE_BOTTOM_AT_MIDDLE;
  const yRight = CURVE_TOP;
  const x0 = 0;
  const xMid = width / 2;
  const xRight = width;
  // Two cubic segments meeting at midpoint with smooth tangents.
  const c1x = width * 0.18;
  const c1y = yLeft + 6;
  const c2x = width * 0.36;
  const c2y = yMid + 4;
  const c3x = width * 0.62;
  const c3y = yMid + 2;
  const c4x = width * 0.84;
  const c4y = yRight - 6;
  return `M ${x0} ${yLeft} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${xMid} ${yMid} C ${c3x} ${c3y}, ${c4x} ${c4y}, ${xRight} ${yRight}`;
}

/**
 * Approximate y on the ribbon at fraction t (0..1) by sampling. Good enough
 * for placing a dot — the curve is monotonic-ish in y so a rough sample works.
 */
function yAtFraction(width: number, t: number): number {
  // Quadratic blend approximating the bezier midpoint dip.
  const yLeft = CURVE_BOTTOM_AT_EDGES;
  const yMid = CURVE_BOTTOM_AT_MIDDLE;
  const yRight = CURVE_TOP;
  if (t <= 0.5) {
    const k = t / 0.5;
    // Ease into the dip.
    return yLeft + (yMid - yLeft) * (k * k * (3 - 2 * k));
  }
  const k = (t - 0.5) / 0.5;
  return yMid + (yRight - yMid) * (k * k * (3 - 2 * k));
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Horizontal flowing capacity ribbon. Renders curve + position dot + 3
 * dotted band guides with labels.
 */
export function CapacityRibbon({ capacity, state }: CapacityRibbonProps): React.ReactElement {
  const { width: windowWidth } = useWindowDimensions();
  const { settings } = useAccessibility();
  const reduceMotion = settings.reduceMotion;

  // Width = window minus the standard 32px horizontal padding * 2 (parent card
  // typically applies its own padding too). We let the parent give us a
  // measurable width via onLayout for precision, but fall back to a sensible
  // default for first paint.
  const [measuredWidth, setMeasuredWidth] = React.useState<number>(
    Math.max(windowWidth - 64, 240),
  );

  const path = useMemo(() => buildRibbonPath(measuredWidth), [measuredWidth]);

  const dotX = useMemo(
    () => measuredWidth * STATE_POSITION[state],
    [measuredWidth, state],
  );
  const dotY = useMemo(
    () => yAtFraction(measuredWidth, STATE_POSITION[state]),
    [measuredWidth, state],
  );

  const stateColor = STATE_COLOR[state];

  // Pulse animation — driven by Reanimated, gated on Reduce Motion.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0;
      return;
    }
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduceMotion, pulse, state]);

  const glowStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [1, 1.18]);
    const opacity = interpolate(pulse.value, [0, 1], [0.55, 0.95]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const pct = Math.round(Math.max(0, Math.min(1, capacity)) * 100);

  const bandPositions: Array<{ x: number; color: string; label: string }> = [
    { x: measuredWidth * STATE_POSITION.depleted, color: colors.depleted, label: 'Overloaded' },
    { x: measuredWidth * STATE_POSITION.stretched, color: colors.stretched, label: 'Tight' },
    { x: measuredWidth * STATE_POSITION.resourced, color: colors.resourced, label: 'Ready' },
  ];

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w && Math.abs(w - measuredWidth) > 1) setMeasuredWidth(w);
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Capacity ribbon"
      accessibilityValue={{
        min: 0,
        max: 1,
        now: capacity,
        text: `${STATE_LABEL[state]}, ${pct} percent`,
      }}
    >
      <View style={{ height: RIBBON_HEIGHT, width: '100%' }}>
        <Svg width={measuredWidth} height={RIBBON_HEIGHT} pointerEvents="none">
          <Defs>
            <SvgLinearGradient id="ribbonStroke" x1="0" y1="0" x2={measuredWidth} y2="0" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={colors.depleted} stopOpacity="0.95" />
              <Stop offset="0.5" stopColor={colors.stretched} stopOpacity="0.95" />
              <Stop offset="1" stopColor={colors.resourced} stopOpacity="0.95" />
            </SvgLinearGradient>
            <SvgLinearGradient id="ribbonShadow" x1="0" y1="0" x2={measuredWidth} y2="0" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={colors.depleted} stopOpacity="0.18" />
              <Stop offset="0.5" stopColor={colors.stretched} stopOpacity="0.18" />
              <Stop offset="1" stopColor={colors.resourced} stopOpacity="0.18" />
            </SvgLinearGradient>
            <RadialGradient id="dotGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={stateColor} stopOpacity="0.55" />
              <Stop offset="1" stopColor={stateColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Soft underlay for the curve (low-opacity wider stroke for glow) */}
          <Path
            d={path}
            stroke="url(#ribbonShadow)"
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
          />

          {/* Main curve */}
          <Path
            d={path}
            stroke="url(#ribbonStroke)"
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />

          {/* Dotted vertical guides at 3 bands */}
          {bandPositions.map((b, idx) => (
            <Line
              key={`guide-${idx}`}
              x1={b.x}
              x2={b.x}
              y1={CURVE_TOP - 6}
              y2={RIBBON_HEIGHT - 22}
              stroke={b.color}
              strokeWidth={1}
              strokeOpacity={0.35}
              strokeDasharray="2,3"
            />
          ))}

          {/* Static glow ring under the dot (radial gradient circle) */}
          <Circle cx={dotX} cy={dotY} r={GLOW_RADIUS} fill="url(#dotGlow)" />

          {/* Dot core (white halo + colored center) */}
          <Circle cx={dotX} cy={dotY} r={DOT_RADIUS + 2} fill="#FFFFFF" opacity={0.9} />
          <Circle cx={dotX} cy={dotY} r={DOT_RADIUS} fill={stateColor} />
        </Svg>

        {/* Pulse halo overlay — animated via Reanimated layout transform.
            We position absolutely matching the dot center so we can scale
            without affecting SVG (which doesn't accept driven props as
            ergonomically). */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseHalo,
            {
              left: dotX - GLOW_RADIUS,
              top: dotY - GLOW_RADIUS,
              width: GLOW_RADIUS * 2,
              height: GLOW_RADIUS * 2,
              borderRadius: GLOW_RADIUS,
              backgroundColor: stateColor,
            },
            glowStyle,
          ]}
        />
      </View>

      {/* Band labels */}
      <View style={styles.labelRow}>
        {bandPositions.map((b, idx) => (
          <Text
            key={`label-${idx}`}
            maxFontSizeMultiplier={1.5}
            style={[
              styles.bandLabel,
              {
                color: b.color,
                left: Math.max(0, b.x - 50),
              },
            ]}
          >
            {b.label.toUpperCase()}
          </Text>
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: RIBBON_HEIGHT + 24,
  },
  pulseHalo: {
    position: 'absolute',
    opacity: 0.18,
  },
  labelRow: {
    height: 18,
    width: '100%',
    position: 'relative',
    marginTop: 4,
  },
  bandLabel: {
    position: 'absolute',
    width: 100,
    textAlign: 'center',
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
  },
});

export default CapacityRibbon;
