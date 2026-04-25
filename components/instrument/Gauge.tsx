// Gauge.tsx — Orbital Capacity Gauge (design Claude visual spec, ported to Skia).
// Source: gauge.jsx from SANZANG volume — visual contract preserved.
// Rule 2.1: View+Text only, no HTML elements. Rule 2.2: no CSS shorthand strings.
// Renders on iOS/Android via @shopify/react-native-skia.
// Web falls back to a View-only render (canvas not available in RN Web without polyfill).
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { CapacityState } from '../../lib/capacity/types';

// Skia is lazy-imported so web bundles don't crash
let SkiaCanvas: React.ComponentType<{ style?: object; children?: React.ReactNode }> | null = null;
let SkiaPath: React.ComponentType<{ path: unknown; style: string; strokeWidth?: number; strokeCap?: string; color: string; opacity?: number }> | null = null;
let SkiaCircle: React.ComponentType<{ cx: number; cy: number; r: number; color?: string; style?: string; strokeWidth?: number }> | null = null;
let SkiaLib: { Skia: { Path: { Make: () => SkPath } } } | null = null;

interface SkPath {
  addArc: (rect: { x: number; y: number; width: number; height: number }, startAngle: number, sweepAngle: number) => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
}

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const s = require('@shopify/react-native-skia');
    SkiaCanvas = s.Canvas;
    SkiaPath = s.Path;
    SkiaCircle = s.Circle;
    SkiaLib = s;
  } catch {
    // Skia unavailable — fallback renders
  }
}

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE * 0.36;
const R = SIZE * 0.40;
const ARC_W = Math.max(11, R * 0.058);
const SWEEP_DEG = 240;
const SWEEP_RAD = (SWEEP_DEG * Math.PI) / 180;
const START_ANGLE_RAD = Math.PI / 2 + SWEEP_RAD / 2;
const START_ANGLE_DEG = (START_ANGLE_RAD * 180) / Math.PI;

function capacityColor(v: number): string {
  if (v < 0.40) return '#DC2626';
  if (v < 0.65) return '#F59E0B';
  if (v < 0.85) return '#2DD4BF';
  return '#06B6D4';
}

export interface GaugeProps {
  score: number;
  state: CapacityState;
  accent?: string;
  motion?: 'subtle' | 'bold' | 'off';
}

function GaugeSkia({ score, state, accent }: GaugeProps) {
  const { Canvas, Path, Circle, Skia } = {
    Canvas: SkiaCanvas!,
    Path: SkiaPath!,
    Circle: SkiaCircle!,
    Skia: SkiaLib!.Skia,
  };

  const v = Math.max(0, Math.min(1, score / 100));
  const ang = START_ANGLE_RAD - v * SWEEP_RAD;
  const nx = CX + Math.cos(ang) * (R - ARC_W * 0.5);
  const ny = CY + Math.sin(ang) * (R - ARC_W * 0.5);
  const color = capacityColor(v);
  const accentColor = accent || color;

  const trackPath = Skia.Path.Make();
  trackPath.addArc({ x: CX - R, y: CY - R, width: R * 2, height: R * 2 }, START_ANGLE_DEG, -SWEEP_DEG);

  const filledPath = Skia.Path.Make();
  if (v > 0.005) {
    filledPath.addArc({ x: CX - R, y: CY - R, width: R * 2, height: R * 2 }, START_ANGLE_DEG, -(v * SWEEP_DEG));
  }

  const needlePath = Skia.Path.Make();
  needlePath.moveTo(CX, CY);
  needlePath.lineTo(nx, ny);

  return (
    <Canvas style={styles.canvas}>
      <Path path={trackPath as unknown} style="stroke" strokeWidth={ARC_W} strokeCap="round" color="rgba(255,255,255,0.08)" />
      <Path path={filledPath as unknown} style="stroke" strokeWidth={ARC_W} strokeCap="round" color={color} opacity={0.95} />
      <Path path={needlePath as unknown} style="stroke" strokeWidth={2.5} color={accentColor} />
      <Circle cx={CX} cy={CY} r={7} color="#01020A" />
      <Circle cx={CX} cy={CY} r={7} style="stroke" strokeWidth={1.5} color={accentColor} />
    </Canvas>
  );
}

export function Gauge({ score, state, accent, motion }: GaugeProps) {
  const v = Math.max(0, Math.min(1, score / 100));
  const color = capacityColor(v);

  return (
    <View style={styles.root}>
      {SkiaCanvas && SkiaLib ? (
        <GaugeSkia score={score} state={state} accent={accent} motion={motion} />
      ) : (
        // Web / no-Skia fallback: render a minimal ring placeholder
        <View style={[styles.fallbackRing, { borderColor: color }]} />
      )}
      <View style={[styles.scoreOverlay, { top: CY - 22 }]} pointerEvents="none">
        <Text style={styles.scoreValue}>{Math.round(score)}</Text>
        <Text style={styles.stateLabel}>{state}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: SIZE,
    height: SIZE * 0.72,
    alignSelf: 'center',
    position: 'relative',
  },
  canvas: {
    width: SIZE,
    height: SIZE * 0.72,
  },
  fallbackRing: {
    width: R * 2,
    height: R * 2,
    borderRadius: R,
    borderWidth: ARC_W,
    alignSelf: 'center',
    marginTop: 8,
  },
  scoreOverlay: {
    position: 'absolute',
    left: 0,
    width: SIZE,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  stateLabel: {
    fontSize: 9,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
});
