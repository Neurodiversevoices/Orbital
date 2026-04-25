// Web implementation of GaugeArc — HTML5 Canvas, visually identical to Skia version.
// Bundler selects this over GaugeArc.tsx on web.
// Rule 2.2: no CSS shorthand in StyleSheet entries.
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { ARC_START_DEG, ARC_SWEEP_DEG } from '../../../lib/capacity/gaugeMath';

export const GAUGE_SIZE = 320;
const C = GAUGE_SIZE / 2;
const R = 120;
const W = 14;

const START_RAD = (ARC_START_DEG * Math.PI) / 180;
const SWEEP_RAD = (ARC_SWEEP_DEG * Math.PI) / 180;

function scoreToColor(score: number): string {
  if (score < 40) return '#E5484D';
  if (score < 70) return '#F5B547';
  return '#5DD9D4';
}

function drawGauge(ctx: CanvasRenderingContext2D, score: number, dpr: number) {
  const w = GAUGE_SIZE * dpr;
  const h = GAUGE_SIZE * dpr;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale(dpr, dpr);

  const cx = C;
  const cy = C;
  const end = START_RAD + (Math.max(0, Math.min(100, score)) / 100) * SWEEP_RAD;

  // Track arc (dim)
  ctx.beginPath();
  ctx.arc(cx, cy, R, START_RAD, START_RAD + SWEEP_RAD);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = W;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Active arc — conic gradient simulation via segment-color interpolation
  if (score > 0.5) {
    const grad = ctx.createLinearGradient(
      cx + R * Math.cos(START_RAD), cy + R * Math.sin(START_RAD),
      cx + R * Math.cos(START_RAD + SWEEP_RAD), cy + R * Math.sin(START_RAD + SWEEP_RAD),
    );
    grad.addColorStop(0, '#E5484D');
    grad.addColorStop(0.5, '#F5B547');
    grad.addColorStop(1, '#5DD9D4');
    ctx.beginPath();
    ctx.arc(cx, cy, R, START_RAD, end);
    ctx.strokeStyle = grad;
    ctx.lineWidth = W;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Glow dot at tip
  const tipX = cx + R * Math.cos(end);
  const tipY = cy + R * Math.sin(end);
  const glow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, W * 1.2);
  glow.addColorStop(0, 'rgba(93,217,212,0.35)');
  glow.addColorStop(1, 'rgba(93,217,212,0)');
  ctx.beginPath();
  ctx.arc(tipX, tipY, W * 1.2, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // White tip dot
  ctx.beginPath();
  ctx.arc(tipX, tipY, W * 0.78, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();

  ctx.restore();
}

interface Props {
  score: SharedValue<number>;
}

export function GaugeArc({ score }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef(score.value);

  const updateScore = (v: number) => {
    scoreRef.current = v;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    drawGauge(ctx, v, dpr);
  };

  useAnimatedReaction(
    () => score.value,
    (v) => { runOnJS(updateScore)(v); },
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = GAUGE_SIZE * dpr;
    canvas.height = GAUGE_SIZE * dpr;
    canvas.style.width = `${GAUGE_SIZE}px`;
    canvas.style.height = `${GAUGE_SIZE}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) drawGauge(ctx, scoreRef.current, dpr);
  }, []);

  return (
    <View style={styles.root} testID="gauge-canvas">
      {/* @ts-ignore — canvas is valid in React Native Web */}
      <canvas ref={canvasRef} data-testid="gauge-canvas-el" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
  },
});
