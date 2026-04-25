// CapacityGaugeLive — native iOS/Android via @shopify/react-native-skia v2 + Reanimated.
// .native.jsx suffix → bundler auto-selects this over .jsx on native platforms.
// Same visual contract as the web canvas version.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Circle, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, useDerivedValue, Easing, withRepeat, withSequence } from 'react-native-reanimated';

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE * 0.36;
const R = SIZE * 0.38;
const ARC_W = Math.max(12, R * 0.06);
const SWEEP_DEG = 240;
const SWEEP_RAD = (SWEEP_DEG * Math.PI) / 180;
const START_ANGLE = Math.PI / 2 + SWEEP_RAD / 2;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function capacityColor(v) {
  if (v < 0.40) return '#DC2626';  // crimson — Low
  if (v < 0.65) return '#F59E0B';  // amber — Stable
  if (v < 0.85) return '#2DD4BF';  // teal — Elevated
  return '#06B6D4';                 // cyan — Near Limit
}

// Build arc SVG path string for a Skia path
function makeArcPath(cx, cy, r, startAngleDeg, sweepDeg) {
  const path = Skia.Path.Make();
  path.addArc(
    { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
    startAngleDeg,
    sweepDeg
  );
  return path;
}

export function CapacityGaugeLive({ data, accent, motion, paletteName }) {
  const targetVal = data?.capacityScore != null
    ? clamp(data.capacityScore / 100, 0, 1)
    : 0.5;

  const capacity = useSharedValue(targetVal);
  const breathPhase = useSharedValue(0);

  // Animate capacity toward new target when data changes
  React.useEffect(() => {
    capacity.value = withTiming(targetVal, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [targetVal]);

  // Breathing animation (~6 bpm)
  React.useEffect(() => {
    if (motion === 'off') return;
    breathPhase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [motion]);

  // Track path (static full 240°)
  const trackPath = React.useMemo(() => makeArcPath(CX, CY, R, (START_ANGLE * 180) / Math.PI, -SWEEP_DEG), []);

  // Filled arc — derived from capacity shared value
  const filledPath = useDerivedValue(() => {
    const v = capacity.value;
    const path = Skia.Path.Make();
    if (v > 0.001) {
      path.addArc(
        { x: CX - R, y: CY - R, width: R * 2, height: R * 2 },
        (START_ANGLE * 180) / Math.PI,
        -(v * SWEEP_DEG)
      );
    }
    return path;
  });

  // Needle as a line path
  const needlePath = useDerivedValue(() => {
    const v = capacity.value;
    const ang = START_ANGLE - v * SWEEP_RAD;
    const nx = CX + Math.cos(ang) * (R - ARC_W * 0.5);
    const ny = CY + Math.sin(ang) * (R - ARC_W * 0.5);
    const path = Skia.Path.Make();
    path.moveTo(CX, CY);
    path.lineTo(nx, ny);
    return path;
  });

  const score = data?.capacityScore != null ? Math.round(data.capacityScore) : Math.round(targetVal * 100);
  const stateLabel = (data?.state || 'CALIBRATING').toUpperCase();
  const color = capacityColor(targetVal);
  const accentColor = accent || color;

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        {/* Dim track ring */}
        <Path
          path={trackPath}
          style="stroke"
          strokeWidth={ARC_W}
          strokeCap="round"
          color="rgba(255,255,255,0.08)"
        />

        {/* Filled capacity arc */}
        <Path
          path={filledPath}
          style="stroke"
          strokeWidth={ARC_W}
          strokeCap="round"
          color={color}
          opacity={0.95}
        />

        {/* Needle */}
        <Path
          path={needlePath}
          style="stroke"
          strokeWidth={2.5}
          color={accentColor}
        />

        {/* Hub: filled black disc + accent ring */}
        <Circle cx={CX} cy={CY} r={7} color="#01020A" />
        <Circle cx={CX} cy={CY} r={7} style="stroke" strokeWidth={1.5} color={accentColor} />
      </Canvas>

      {/* Score + state label centered on the dial */}
      <View style={[styles.scoreOverlay, { top: CY - 22 }]} pointerEvents="none">
        <Text style={styles.scoreText}>{score}</Text>
        <Text style={styles.stateText}>{stateLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE * 0.75,
    alignSelf: 'center',
    position: 'relative',
  },
  canvas: {
    width: SIZE,
    height: SIZE * 0.75,
  },
  scoreOverlay: {
    position: 'absolute',
    left: 0,
    width: SIZE,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 40,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  stateText: {
    fontSize: 9,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
});
