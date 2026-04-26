// GAUGE_SEMICIRCLE_v2 — 180° semicircle + SkSL volumetric arc fill.
// 5-octave FBM noise shader, breathing animation via uTime,
// three-zone backdrop, tick marks at 40 & 70, tip halo.
import React, { useEffect } from 'react';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Mask,
  Path,
  Shader,
  Skia,
  SweepGradient,
  vec,
  BlurMask,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  ARC_START_DEG, ARC_SWEEP_DEG, ARC_END_DEG,
  degToRad, arcPoint, stateOfLower, stateColorFloat3,
} from '../../../lib/capacity/gaugeMath';
import { ARC_FILL_SKSL } from './shaders/arcFill.sksl';

export const GAUGE_SIZE = 320;

const W = GAUGE_SIZE;
const H = Math.round(W * 0.60);
const cx = W / 2;
const cy = H * 0.98;
const R  = W * 0.43;
const TRACK_W = W * 0.075;
const FILL_W  = W * 0.05;

const T40 = ARC_START_DEG + (40 / 100) * ARC_SWEEP_DEG;
const T70 = ARC_START_DEG + (70 / 100) * ARC_SWEEP_DEG;

function makeArc(from: number, to: number) {
  const p = Skia.Path.Make();
  p.addArc({ x: cx - R, y: cy - R, width: R * 2, height: R * 2 }, from, to - from);
  return p;
}

const trackPath  = makeArc(ARC_START_DEG, ARC_END_DEG);
const fillPath   = makeArc(ARC_START_DEG, ARC_END_DEG);
const zone1Path  = makeArc(ARC_START_DEG, T40);
const zone2Path  = makeArc(T40, T70);
const zone3Path  = makeArc(T70, ARC_END_DEG);

const t40In  = arcPoint(cx, cy, R - TRACK_W / 2 - 4, T40);
const t40Out = arcPoint(cx, cy, R + TRACK_W / 2 + 4, T40);
const t70In  = arcPoint(cx, cy, R - TRACK_W / 2 - 4, T70);
const t70Out = arcPoint(cx, cy, R + TRACK_W / 2 + 4, T70);
const tick40 = (() => { const p = Skia.Path.Make(); p.moveTo(t40In.x, t40In.y); p.lineTo(t40Out.x, t40Out.y); return p; })();
const tick70 = (() => { const p = Skia.Path.Make(); p.moveTo(t70In.x, t70In.y); p.lineTo(t70Out.x, t70Out.y); return p; })();

// Compile shader once at module init — returns null if unavailable
const shaderSource = Skia.RuntimeEffect.Make(ARC_FILL_SKSL) ?? null;

interface Props {
  score: SharedValue<number>;
}

export function GaugeArc({ score }: Props) {
  const reduced  = useReducedMotion();
  const clock    = useSharedValue(0);

  // Idle breathing — 60s loop, gated by reduce-motion
  useEffect(() => {
    if (reduced) { clock.value = 0; return; }
    clock.value = withRepeat(
      withTiming(60, { duration: 60_000, easing: Easing.linear }),
      -1, false,
    );
  }, [reduced]);

  const fillEnd = useDerivedValue(() =>
    Math.max(0.001, Math.min(1, score.value / 100))
  );

  const tipX = useDerivedValue(() => {
    'worklet';
    return cx + R * Math.cos(degToRad(ARC_START_DEG + (Math.max(0, Math.min(100, score.value)) / 100) * ARC_SWEEP_DEG));
  });
  const tipY = useDerivedValue(() => {
    'worklet';
    return cy + R * Math.sin(degToRad(ARC_START_DEG + (Math.max(0, Math.min(100, score.value)) / 100) * ARC_SWEEP_DEG));
  });

  const stateRGB = useDerivedValue(() => stateColorFloat3(stateOfLower(score.value)));

  const uniforms = useDerivedValue(() => ({
    uCapacity:   Math.max(0, Math.min(1, score.value / 100)),
    uTime:       clock.value,
    uResolution: vec(W, H),
    uStateColor: stateRGB.value,
  }));

  return (
    <Canvas testID="gauge-canvas" style={{ width: W, height: H + 100 }}>
      <Group>
        {/* Track */}
        <Path path={trackPath} style="stroke" strokeWidth={TRACK_W}
              strokeCap="round" color="rgba(255,255,255,0.06)" />

        {/* State zone tints */}
        <Path path={zone1Path} style="stroke" strokeWidth={TRACK_W}
              strokeCap="butt" color="rgba(229,72,77,0.13)" />
        <Path path={zone2Path} style="stroke" strokeWidth={TRACK_W}
              strokeCap="butt" color="rgba(245,181,71,0.13)" />
        <Path path={zone3Path} style="stroke" strokeWidth={TRACK_W}
              strokeCap="butt" color="rgba(93,217,212,0.13)" />

        {/* Tick marks */}
        <Path path={tick40} style="stroke" strokeWidth={2} color="rgba(255,255,255,0.35)" />
        <Path path={tick70} style="stroke" strokeWidth={2} color="rgba(255,255,255,0.35)" />

        {/* Active fill — SkSL shader if available, SweepGradient fallback */}
        {shaderSource ? (
          <Mask mode="alpha" mask={
            <Path path={fillPath} style="stroke" strokeWidth={FILL_W}
                  strokeCap="round" color="white" start={0} end={fillEnd} />
          }>
            <Fill>
              <Shader source={shaderSource} uniforms={uniforms} />
            </Fill>
          </Mask>
        ) : (
          <Group>
            <Path path={fillPath} style="stroke" strokeWidth={FILL_W}
                  strokeCap="round" start={0} end={fillEnd}>
              <SweepGradient
                c={vec(cx, cy)}
                colors={['#E5484D', '#F5B547', '#5DD9D4', '#5DD9D4']}
                positions={[0.0, 0.4, 0.7, 1.0]}
                start={ARC_START_DEG}
                end={ARC_END_DEG}
              />
            </Path>
          </Group>
        )}

        {/* Tip dot + halo */}
        <Circle cx={tipX} cy={tipY} r={FILL_W} color="rgba(255,255,255,0.25)">
          <BlurMask blur={FILL_W * 0.5} style="normal" />
        </Circle>
        <Circle cx={tipX} cy={tipY} r={FILL_W * 0.5} color="white" />
      </Group>
    </Canvas>
  );
}
