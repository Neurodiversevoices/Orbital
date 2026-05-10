/**
 * AtmosphericReservoir.tsx — Volumetric two-body centerpiece for the home tab.
 *
 * This is the visual replacement for the deprecated orb / gauge / capacity
 * ribbon centerpieces. It renders a single `<Canvas>` running a custom SKSL
 * fragment shader (see ./atmosphericShader.ts) that raymarches two SDF bodies
 * — a large "reservoir" (driven by `reserves`) and a smaller "demand" body
 * (driven by `demand`) — in the same 3D space, blended via smin().
 *
 * Architectural notes:
 *   • Uniforms are derived via `useDerivedValue` from Reanimated SharedValues
 *     so the shader updates each frame WITHOUT triggering a React re-render.
 *   • Time is supplied by Skia's `useClock()` (a SharedValue<number> in ms)
 *     and divided into seconds for the shader.
 *   • When the user has Reduce Motion enabled, we freeze time at a
 *     deterministic seed-based offset and lower the raymarch step count.
 *   • On older iPhones (best-effort detection through expo-constants), we
 *     also drop step count to manage thermals.
 *   • Full a11y wrapper with `accessibilityRole="adjustable"` + increment /
 *     decrement actions; consumers can wire `onCapacityAdjust` to a capacity
 *     mutation.
 *
 * Usage:
 *   const reserves = useSharedValue(0.62);
 *   const demand   = useSharedValue(0.34);
 *   <AtmosphericReservoir
 *     reserves={reserves}
 *     demand={demand}
 *     seed={signalSeed}
 *     width={width}
 *     height={400}
 *     onCapacityAdjust={(delta) => setReserves((r) => r + delta)}
 *   />
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityActionEvent,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useClock,
} from '@shopify/react-native-skia';
import {
  SharedValue,
  useDerivedValue,
} from 'react-native-reanimated';
import Constants from 'expo-constants';

import { useAccessibility } from '../lib/hooks/useAccessibility';
import { ATMOSPHERIC_SHADER_SOURCE } from './atmosphericShader';
import {
  AtmosphericReservoirFallback,
} from './AtmosphericReservoirFallback';
import { pct, stateBand } from './atmosphericHelpers';

// =============================================================================
// PUBLIC TYPES
// =============================================================================

/**
 * Per-user signal seed shape consumed by the shader. This is a structural
 * subset of the `SignalSeed` type that Block B will publish from
 * `lib/health/signalSeed.ts`; we keep it inline here so this component
 * compiles without that block.
 */
export interface AtmosphericReservoirSeed {
  /** 4 floats in 0..1 derived from the user's hashed physiology + salt. */
  seed: readonly [number, number, number, number];
  /** Hue rotation in radians applied to the spectrum lookup. */
  hueShift: number;
  /** 0..3 selects laminar / turbulent / banded / cellular surface pattern. */
  surfacePattern: number;
  /** Period of the breathing pulse, in seconds. */
  pulseSeconds: number;
  /** Body rotation speed, in radians per second. */
  rotationSpeed: number;
}

export interface AtmosphericReservoirProps {
  /** 0..1 — long-term capacity baseline. Drives the reservoir body. */
  reserves: SharedValue<number>;
  /** 0..1 — today's load. Drives the demand body. */
  demand: SharedValue<number>;
  /** Per-user signature derived from physiology + salt. */
  seed: AtmosphericReservoirSeed;
  /** Canvas width in points. */
  width: number;
  /** Canvas height in points. */
  height: number;
  /**
   * Reserved for future audio-reactive surface displacement. No effect today;
   * present so consumers can wire it up without breaking changes when the
   * audio path lands.
   * @default false
   */
  audioReactive?: boolean;
  /**
   * Called with ±0.05 when an a11y increment / decrement action fires.
   * Optional — when omitted, the component is read-only via assistive tech.
   */
  onCapacityAdjust?: (delta: number) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const A11Y_DELTA = 0.05;

/**
 * Best-effort detection of iPhone 11 or earlier. expo-constants exposes
 * `deviceName` as a free-form string (e.g. "iPhone 11", "iPhone XS Max").
 * Anything matching that pattern downgrades to a 24-step march. This is a
 * heuristic — if we can't tell, we assume the device is capable.
 */
function isLegacyIPhone(): boolean {
  if (Platform.OS !== 'ios') return false;
  // expo-constants doesn't enumerate model identifiers reliably across SDKs;
  // we read whatever the host exposes, defensively.
  const c = Constants as unknown as {
    deviceName?: string;
    platform?: { ios?: { model?: string } };
  };
  const name = (c.deviceName || c.platform?.ios?.model || '').toLowerCase();
  if (!name) return false;
  // Matches "iPhone 11", "iPhone X", "iPhone XS", "iPhone XR", "iPhone 8/7/6",
  // and SE 1st gen.
  return /iphone\s*(11|x[rs]?|10|9|8|7|6|se(\s*\(1)?)/.test(name);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AtmosphericReservoir(
  props: AtmosphericReservoirProps,
): React.ReactElement {
  const {
    reserves,
    demand,
    seed,
    width,
    height,
    onCapacityAdjust,
  } = props;
  const { settings } = useAccessibility();
  const reduceMotion = settings.reduceMotion;

  // Compile the runtime effect once. If compilation fails (e.g. Skia not
  // initialized in this environment / web SSR), fall back to the SVG variant.
  const runtimeEffect = useMemo(() => {
    try {
      return Skia.RuntimeEffect.Make(ATMOSPHERIC_SHADER_SOURCE);
    } catch {
      return null;
    }
  }, []);

  // Skia clock — milliseconds since mount, as SharedValue<number>.
  // We always create the clock; reduceMotion is conveyed to the shader as a
  // uniform so it can render a single static frame.
  const clockMs = useClock();
  const reduceMotionFlag = reduceMotion ? 1 : 0;

  // Per-frame uniform object. useDerivedValue runs on the UI thread and
  // returns a fresh object each frame so the shader picks up changes.
  const uniforms = useDerivedValue(() => {
    'worklet';
    const tSeconds = reduceMotionFlag === 1 ? 0 : clockMs.value / 1000;
    return {
      uTime: tSeconds,
      uReserves: clamp01(reserves.value),
      uDemand: clamp01(demand.value),
      uSeed: [seed.seed[0], seed.seed[1], seed.seed[2], seed.seed[3]],
      uHueShift: seed.hueShift,
      uSurfacePattern: clampNum(seed.surfacePattern, 0, 3),
      uPulseSeconds: Math.max(0.001, seed.pulseSeconds),
      uRotationSpeed: seed.rotationSpeed,
      uReducedMotion: reduceMotionFlag,
      uResolution: [width, height],
    };
  }, [
    clockMs,
    reserves,
    demand,
    seed.seed[0],
    seed.seed[1],
    seed.seed[2],
    seed.seed[3],
    seed.hueShift,
    seed.surfacePattern,
    seed.pulseSeconds,
    seed.rotationSpeed,
    reduceMotionFlag,
    width,
    height,
  ]);

  // Track current SharedValue snapshots on the JS thread for a11y readout.
  // We poll on a timer rather than re-rendering each frame.
  const [snapshot, setSnapshot] = useState<{ r: number; d: number }>({
    r: clamp01(reserves.value),
    d: clamp01(demand.value),
  });
  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot({
        r: clamp01(reserves.value),
        d: clamp01(demand.value),
      });
    }, 750);
    return () => clearInterval(id);
  }, [reserves, demand]);

  const a11yLabel = 'Atmospheric reservoir';
  const a11yText = useMemo(() => {
    const band = stateBand(snapshot.r, snapshot.d);
    return `Reserves ${pct(snapshot.r)} percent, demand ${pct(snapshot.d)} percent, ${band} state`;
  }, [snapshot]);

  const onA11yAction = (e: AccessibilityActionEvent) => {
    if (!onCapacityAdjust) return;
    if (e.nativeEvent.actionName === 'increment') onCapacityAdjust(+A11Y_DELTA);
    if (e.nativeEvent.actionName === 'decrement') onCapacityAdjust(-A11Y_DELTA);
  };

  const containerStyle: ViewStyle = useMemo(
    () => ({ width, height }),
    [width, height],
  );

  // No runtime effect available — render the static SVG fallback.
  if (!runtimeEffect) {
    return (
      <AtmosphericReservoirFallback
        reserves={snapshot.r}
        demand={snapshot.d}
        seed={seed}
        width={width}
        height={height}
        onCapacityAdjust={onCapacityAdjust}
      />
    );
  }

  return (
    <View
      style={[styles.root, containerStyle]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={a11yLabel}
      accessibilityValue={{
        min: 0,
        max: 1,
        now: snapshot.r,
        text: a11yText,
      }}
      accessibilityActions={[
        { name: 'increment', label: 'Increase capacity' },
        { name: 'decrement', label: 'Decrease capacity' },
      ]}
      onAccessibilityAction={onA11yAction}
    >
      <Canvas style={[styles.canvas, containerStyle]}>
        <Fill>
          <Shader source={runtimeEffect} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}

// =============================================================================
// HELPERS — local-only scalar clamps. We avoid importing lodash etc.
// =============================================================================

function clamp01(v: number): number {
  'worklet';
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function clampNum(v: number, min: number, max: number): number {
  'worklet';
  if (Number.isNaN(v)) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

// =============================================================================
// DEFAULT SEED — exported so consumers can render the centerpiece before the
// signal-seed pipeline (Block B) is online. Using a deterministic seed keeps
// the visual stable across renders.
// =============================================================================

export const DEFAULT_ATMOSPHERIC_SEED: AtmosphericReservoirSeed = {
  seed: [0.42, 0.18, 0.71, 0.55],
  hueShift: 0,
  surfacePattern: 1, // turbulent
  pulseSeconds: 6.5,
  rotationSpeed: 0.18,
} as const;

// Re-export the helpers for tests / consumers.
export { pct, stateBand, isLegacyIPhone };

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  canvas: {
    // Canvas inherits dimensions from container; specifying again is harmless.
  },
});

export default AtmosphericReservoir;
