/**
 * ClinicalGauge.tsx — Sealed Instrument Capacity Meter
 *
 * A precision needle gauge: housing body, recess, smooth gradient color
 * scale, major/minor ticks, weighty needle with cast shadow, glass cover
 * with refraction, and an optional monospaced numeric readout.
 *
 * Public API contract (drop-in compatible):
 *   - `capacity: SharedValue<number>` (required) — same as before.
 *   - `currentCapacity?: number` — optional JS-side mirror for a11y readouts.
 *   - `onCapacityChange?: (next: number) => void` — optional setter wired to
 *     VoiceOver's increment/decrement actions.
 *   - `width`, `height`, `showReadout` — visual tuning.
 *
 * Accessibility wrapper:
 *   The Skia <Canvas> is wrapped in a single accessible <View> exposing the
 *   gauge as `accessibilityRole="adjustable"` so VoiceOver / Switch Control /
 *   AssistiveTouch can announce and adjust the value. See
 *   `docs/IOS_AUDIT_ACCESSIBILITY_2026-05-09.md` §B1 (CRITICAL finding).
 *
 * Skia rule: every shape has at most ONE Paint child. Colours are placed
 * directly on element props wherever possible.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  type AccessibilityActionEvent,
} from 'react-native';
import {
  Canvas,
  Circle,
  Line,
  RoundedRect,
  Paint,
  LinearGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import {
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  useAnimatedReaction,
  withSpring,
} from 'react-native-reanimated';
import {
  GAUGE_WIDTH,
  GAUGE_HEIGHT,
  GAUGE_NEEDLE_WIDTH,
  GAUGE_NEEDLE_SHADOW_BLUR,
  GAUGE_GLASS_OPACITY,
  GAUGE_GLASS_HIGHLIGHT_OPACITY,
  GAUGE_GLASS_SHADE_OPACITY,
  GAUGE_TICK_COUNT,
  GAUGE_MAJOR_TICK_INTERVAL,
  GAUGE_MAJOR_TICK_LEN_RATIO,
  GAUGE_MINOR_TICK_LEN_RATIO,
  GAUGE_MAJOR_TICK_WIDTH,
  GAUGE_MINOR_TICK_WIDTH,
  GAUGE_MAJOR_TICK_OPACITY,
  GAUGE_MINOR_TICK_OPACITY,
  GAUGE_RECESS_DEPTH,
  GAUGE_SPRING_DAMPING,
  GAUGE_SPRING_STIFFNESS,
  GAUGE_SPRING_MASS,
  GAUGE_A11Y_STEP,
  GAUGE_READOUT_FONT_SIZE,
  GAUGE_READOUT_LETTER_SPACING,
} from './orbConstants';
import { capacityToSkiaColor, capacityBand } from './orbColors';
import { useReduceMotionSafe } from './useReduceMotionSafe';

interface ClinicalGaugeProps {
  width?: number;
  height?: number;
  /** Worklet-driven shared capacity value (0..1). Required. */
  capacity: SharedValue<number>;
  /**
   * Optional JS-side mirror of the current capacity. Used solely for the
   * accessibilityValue announcement and the numeric readout. If omitted,
   * the wrapper falls back to `capacity.value` at render time.
   */
  currentCapacity?: number;
  /**
   * Optional callback fired when VoiceOver triggers an increment / decrement
   * action. Receives the next value clamped to [0, 1] and snapped to
   * `GAUGE_A11Y_STEP` (5%).
   */
  onCapacityChange?: (next: number) => void;
  /** Render the small monospaced "0.42" numeric readout. Default: true. */
  showReadout?: boolean;
}

const READOUT_HEIGHT = 16;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function snapStep(v: number, step: number): number {
  return Math.round(v / step) * step;
}

export const ClinicalGauge: React.FC<ClinicalGaugeProps> = ({
  width = GAUGE_WIDTH,
  height = GAUGE_HEIGHT,
  capacity,
  currentCapacity,
  onCapacityChange,
  showReadout = true,
}) => {
  // ------- Layout -------
  const canvasW = width + 40;
  const canvasH = height + 28 + (showReadout ? READOUT_HEIGHT : 0);
  const gX = 20;
  const gY = 10;
  const gW = width;
  const gH = height;
  const cornerR = 10; // CLAUDE.md card radius

  // ------- Reduce-motion gating -------
  // We follow `capacity` either via spring (default) or instantly when the
  // user has Reduce Motion enabled. The internal `smoothed` shared value is
  // what every Skia derivation reads from.
  const reduceMotion = useReduceMotionSafe();

  const smoothed = useSharedValue(capacity.value);

  useAnimatedReaction(
    () => capacity.value,
    (next, prev) => {
      if (next === prev) return;
      if (reduceMotion) {
        smoothed.value = next;
      } else {
        smoothed.value = withSpring(next, {
          damping: GAUGE_SPRING_DAMPING,
          stiffness: GAUGE_SPRING_STIFFNESS,
          mass: GAUGE_SPRING_MASS,
          overshootClamping: true,
          restDisplacementThreshold: 0.0005,
          restSpeedThreshold: 0.0005,
        });
      }
    },
    [reduceMotion]
  );

  // ------- Tick layout (major every 0.1, minor every 0.025) -------
  const ticks = useMemo(() => {
    const result: Array<{ x: number; isMajor: boolean }> = [];
    for (let i = 0; i <= GAUGE_TICK_COUNT; i++) {
      result.push({
        x: gX + (i / GAUGE_TICK_COUNT) * gW,
        isMajor: i % GAUGE_MAJOR_TICK_INTERVAL === 0,
      });
    }
    return result;
  }, [gX, gW]);

  // ------- Smooth gradient strip -------
  // 21 stops give a perceptually smooth crimson → amber → teal → cyan arc.
  const scaleColors = useMemo(() => {
    const colors: string[] = [];
    for (let i = 0; i <= 20; i++) colors.push(capacityToSkiaColor(i / 20, 0.78));
    return colors;
  }, []);
  const scalePositions = useMemo(
    () => Array.from({ length: 21 }, (_, i) => i / 20),
    []
  );

  // ------- Needle derivations (read from `smoothed`) -------
  const needleX = useDerivedValue(() => gX + smoothed.value * gW);
  const needleColor = useDerivedValue(() => capacityToSkiaColor(smoothed.value, 1.0));

  const needleShadowP1 = useDerivedValue(() => vec(needleX.value + 1.5, gY + 3));
  const needleShadowP2 = useDerivedValue(() => vec(needleX.value + 1.5, gY + gH - 3));
  const needleP1 = useDerivedValue(() => vec(needleX.value, gY + 2));
  const needleP2 = useDerivedValue(() => vec(needleX.value, gY + gH - 2));

  // ------- A11y values -------
  // We try `currentCapacity` first (parent's source of truth), then sample the
  // shared value at render time as a best-effort fallback.
  const a11yCapacity = clamp01(
    typeof currentCapacity === 'number' ? currentCapacity : capacity.value ?? 0
  );
  const a11yPercent = Math.round(a11yCapacity * 100);
  const band = capacityBand(a11yCapacity);

  const handleA11yAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (!onCapacityChange) return;
      const cur =
        typeof currentCapacity === 'number'
          ? currentCapacity
          : capacity.value ?? 0;
      let next = cur;
      if (event.nativeEvent.actionName === 'increment') {
        next = clamp01(cur + GAUGE_A11Y_STEP);
      } else if (event.nativeEvent.actionName === 'decrement') {
        next = clamp01(cur - GAUGE_A11Y_STEP);
      }
      next = clamp01(snapStep(next, GAUGE_A11Y_STEP));
      onCapacityChange(next);
    },
    [onCapacityChange, currentCapacity, capacity]
  );

  // ------- Readout text -------
  const readoutText = a11yCapacity.toFixed(2).toUpperCase();

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Capacity gauge"
      accessibilityValue={{
        min: 0,
        max: 1,
        now: a11yCapacity,
        text: `${a11yPercent}% capacity, ${band}`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleA11yAction}
      accessibilityHint="Swipe up or down to adjust capacity"
      style={[styles.wrapper, { width: canvasW, height: canvasH }]}
    >
      <Canvas style={{ width: canvasW, height: canvasH }}>
        {/* Outer drop shadow — gauge sits proud of the panel */}
        <RoundedRect
          x={gX - 4} y={gY - 3}
          width={gW + 8} height={gH + 8}
          r={cornerR + 4}
          color="rgba(0,0,0,0.45)"
        >
          <BlurMask blur={10} style="normal" />
        </RoundedRect>

        {/* Housing body */}
        <RoundedRect
          x={gX - 3} y={gY - 3}
          width={gW + 6} height={gH + 6}
          r={cornerR + 3}
          color="#0D0E12"
        />

        {/* Housing bevel — gradient stroke (light top → dark bottom) */}
        <RoundedRect
          x={gX - 3} y={gY - 3}
          width={gW + 6} height={gH + 6}
          r={cornerR + 3}
          style="stroke"
          strokeWidth={1}
        >
          <Paint>
            <LinearGradient
              start={vec(gX, gY - 3)}
              end={vec(gX, gY + gH + 3)}
              colors={['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.45)']}
            />
          </Paint>
        </RoundedRect>

        {/* Inner recess — the dial face is sunk into the housing */}
        <RoundedRect
          x={gX - 1} y={gY - 1}
          width={gW + 2} height={gH + 2}
          r={cornerR + 1}
          color="#060710"
        />

        {/* Recess inner shadow — depth cue */}
        <RoundedRect
          x={gX - 1} y={gY - 1}
          width={gW + 2} height={gH + 2}
          r={cornerR + 1}
          color="rgba(0,0,0,0.6)"
        >
          <BlurMask blur={GAUGE_RECESS_DEPTH} style="inner" />
        </RoundedRect>

        {/* Dial face background (CLAUDE.md app background tone) */}
        <RoundedRect x={gX} y={gY} width={gW} height={gH} r={cornerR} color="#01020A" />

        {/* Smooth crimson → amber → teal → cyan gradient strip */}
        <RoundedRect
          x={gX + 6}
          y={gY + gH * 0.34}
          width={gW - 12}
          height={gH * 0.20}
          r={3}
        >
          <Paint>
            <LinearGradient
              start={vec(gX + 6, 0)}
              end={vec(gX + gW - 6, 0)}
              colors={scaleColors}
              positions={scalePositions}
            />
          </Paint>
        </RoundedRect>

        {/* Subtle glow under the strip — picks up the spectrum colour */}
        <RoundedRect
          x={gX + 6}
          y={gY + gH * 0.34}
          width={gW - 12}
          height={gH * 0.20}
          r={3}
          color="rgba(255,255,255,0.04)"
        >
          <BlurMask blur={4} style="solid" />
        </RoundedRect>

        {/* Ticks — major/minor differentiated by length, weight, opacity */}
        {ticks.map((tick, i) => {
          const lenRatio = tick.isMajor
            ? GAUGE_MAJOR_TICK_LEN_RATIO
            : GAUGE_MINOR_TICK_LEN_RATIO;
          const top = gY + gH * 0.62;
          const bot = top + gH * lenRatio;
          const op = tick.isMajor ? GAUGE_MAJOR_TICK_OPACITY : GAUGE_MINOR_TICK_OPACITY;
          return (
            <Line
              key={`gt-${i}`}
              p1={vec(tick.x, top)}
              p2={vec(tick.x, bot)}
              style="stroke"
              strokeWidth={tick.isMajor ? GAUGE_MAJOR_TICK_WIDTH : GAUGE_MINOR_TICK_WIDTH}
              color={`rgba(255,255,255,${op})`}
            />
          );
        })}

        {/* Needle cast shadow — soft, follows position */}
        <Line
          p1={needleShadowP1}
          p2={needleShadowP2}
          style="stroke"
          strokeWidth={GAUGE_NEEDLE_WIDTH + 3}
          color="rgba(0,0,0,0.55)"
        >
          <BlurMask blur={GAUGE_NEEDLE_SHADOW_BLUR} style="normal" />
        </Line>

        {/* Needle — animated colour, rounded caps */}
        <Line
          p1={needleP1}
          p2={needleP2}
          style="stroke"
          strokeWidth={GAUGE_NEEDLE_WIDTH}
          strokeCap="round"
          color={needleColor}
        />

        {/* Needle pivot caps — subtle metal pin highlights */}
        <Circle cx={needleX} cy={gY + 2} r={2.5} color="rgba(255,255,255,0.22)" />
        <Circle cx={needleX} cy={gY + gH - 2} r={1.5} color="rgba(255,255,255,0.10)" />

        {/* Glass cover — refraction simulation:
            brighter highlight near top-left, soft shade toward bottom-right */}
        <RoundedRect x={gX} y={gY} width={gW} height={gH} r={cornerR}>
          <Paint>
            <LinearGradient
              start={vec(gX, gY)}
              end={vec(gX + gW, gY + gH)}
              colors={[
                `rgba(255,255,255,${GAUGE_GLASS_HIGHLIGHT_OPACITY})`,
                `rgba(255,255,255,${GAUGE_GLASS_OPACITY})`,
                'rgba(0,0,0,0)',
                `rgba(0,0,0,${GAUGE_GLASS_SHADE_OPACITY})`,
              ]}
              positions={[0, 0.32, 0.62, 1]}
            />
          </Paint>
        </RoundedRect>

        {/* Glass top edge highlight — sharp specular line */}
        <Line
          p1={vec(gX + 8, gY + 1)}
          p2={vec(gX + gW - 8, gY + 1)}
          style="stroke"
          strokeWidth={0.75}
          color="rgba(255,255,255,0.10)"
        />

        {/* Glass bottom edge — subtle internal reflection */}
        <Line
          p1={vec(gX + 8, gY + gH - 1)}
          p2={vec(gX + gW - 8, gY + gH - 1)}
          style="stroke"
          strokeWidth={0.5}
          color="rgba(255,255,255,0.04)"
        />

        {/* Engraved endpoint — left (crimson, low end) */}
        <Line
          p1={vec(gX, gY + gH + 8)}
          p2={vec(gX + 28, gY + gH + 8)}
          style="stroke"
          strokeWidth={0.75}
          color="rgba(220,38,38,0.32)"
        />

        {/* Engraved endpoint — right (cyan, high end) */}
        <Line
          p1={vec(gX + gW - 28, gY + gH + 8)}
          p2={vec(gX + gW, gY + gH + 8)}
          style="stroke"
          strokeWidth={0.75}
          color="rgba(6,182,212,0.32)"
        />
      </Canvas>

      {/* Numeric readout — Space Mono, all caps, letterspaced.
          Lives outside the Canvas so it benefits from RN font scaling. */}
      {showReadout && (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          allowFontScaling={false}
          style={styles.readout}
        >
          {readoutText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  readout: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: GAUGE_READOUT_FONT_SIZE,
    letterSpacing: GAUGE_READOUT_LETTER_SPACING,
    fontFamily: 'SpaceMono_400Regular',
  },
});

export default ClinicalGauge;
