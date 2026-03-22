/**
 * ClinicalGaugeV10.tsx — Precision Gauge for Orb v10
 *
 * Separate Skia Canvas, W=280 H=48.
 * 11-element render order per spec.
 * Needle motion: withSpring, overshootClamping=true, high damping, ~150ms feel.
 */

import React, { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Line as SkiaLine,
  Rect,
  RoundedRect,
  Paint,
  LinearGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import { capacityToSkiaColor } from './orbColors';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_W = 280;
const DEFAULT_H = 48;
const CORNER_R = 8;
const TICK_COUNT = 40;
const MAJOR_INTERVAL = 10;
const PAD_X = 12;
const PAD_Y = 8;

// =============================================================================
// COMPONENT
// =============================================================================

interface ClinicalGaugeV10Props {
  width?: number;
  height?: number;
  capacity: SharedValue<number>;
}

export const ClinicalGaugeV10: React.FC<ClinicalGaugeV10Props> = ({
  width = DEFAULT_W,
  height = DEFAULT_H,
  capacity,
}) => {
  const W = width;
  const H = height;
  const canvasW = W + PAD_X * 2;
  const canvasH = H + PAD_Y * 2;
  const x = PAD_X;
  const y = PAD_Y;

  // Precompute ticks
  const ticks = useMemo(() => {
    const result: Array<{ tx: number; isMajor: boolean }> = [];
    for (let i = 0; i <= TICK_COUNT; i++) {
      result.push({
        tx: x + 6 + (i / TICK_COUNT) * (W - 12),
        isMajor: i % MAJOR_INTERVAL === 0,
      });
    }
    return result;
  }, [x, W]);

  // Animated needle position
  const needleX = useDerivedValue(() => x + 6 + capacity.value * (W - 12));
  const needleColor = useDerivedValue(() => capacityToSkiaColor(capacity.value, 1.0));

  // Needle line endpoints
  const needleShadowP1 = useDerivedValue(() => vec(needleX.value + 1, y + 4));
  const needleShadowP2 = useDerivedValue(() => vec(needleX.value + 1, y + H - 4));
  const needleP1 = useDerivedValue(() => vec(needleX.value, y + 3));
  const needleP2 = useDerivedValue(() => vec(needleX.value, y + H - 3));

  return (
    <Canvas style={{ width: canvasW, height: canvasH }}>

      {/* 1. Outer housing */}
      <RoundedRect
        x={x} y={y}
        width={W} height={H}
        r={CORNER_R}
        color="#0B0D12"
      />

      {/* 2. Bevel stroke */}
      <RoundedRect
        x={x} y={y}
        width={W} height={H}
        r={CORNER_R}
        style="stroke"
        strokeWidth={1}
      >
        <Paint>
          <LinearGradient
            start={vec(x, y)}
            end={vec(x, y + H)}
            colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.35)']}
          />
        </Paint>
      </RoundedRect>

      {/* 3. Inner recess */}
      <RoundedRect
        x={x + 2} y={y + 2}
        width={W - 4} height={H - 4}
        r={CORNER_R - 1}
        color="#07080C"
      />

      {/* 4. Scale bar — 4-stop gradient */}
      <Rect x={x + 6} y={y + H * 0.34} width={W - 12} height={H * 0.14}>
        <Paint>
          <LinearGradient
            start={vec(x + 6, 0)}
            end={vec(x + W - 6, 0)}
            colors={[
              'rgba(255,70,70,0.75)',
              'rgba(255,180,40,0.78)',
              'rgba(0,210,170,0.78)',
              'rgba(0,220,255,0.80)',
            ]}
            positions={[0, 0.45, 0.72, 1]}
          />
        </Paint>
      </Rect>

      {/* 5. Ticks */}
      {ticks.map((tick, i) => (
        <SkiaLine
          key={`t10-${i}`}
          p1={vec(tick.tx, y + H * 0.52)}
          p2={vec(tick.tx, y + H * (tick.isMajor ? 0.78 : 0.66))}
          style="stroke"
          strokeWidth={tick.isMajor ? 1 : 0.5}
          color={tick.isMajor
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.05)'}
        />
      ))}

      {/* 6. Needle shadow */}
      <SkiaLine
        p1={needleShadowP1}
        p2={needleShadowP2}
        style="stroke"
        strokeWidth={5}
        color="rgba(0,0,0,0.45)"
      >
        <BlurMask blur={4} style="normal" />
      </SkiaLine>

      {/* 7. Needle */}
      <SkiaLine
        p1={needleP1}
        p2={needleP2}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        color={needleColor}
      />

      {/* 8. Needle cap top */}
      <Circle cx={needleX} cy={y + 3} r={2.5} color="rgba(255,255,255,0.15)" />

      {/* 9. Needle cap bottom */}
      <Circle cx={needleX} cy={y + H - 3} r={1.5} color="rgba(255,255,255,0.06)" />

      {/* 10. Glass cover */}
      <RoundedRect x={x} y={y} width={W} height={H} r={CORNER_R}>
        <Paint>
          <LinearGradient
            start={vec(x, y)}
            end={vec(x, y + H)}
            colors={[
              'rgba(255,255,255,0.06)',
              'transparent',
              'rgba(0,0,0,0.10)',
            ]}
            positions={[0, 0.35, 1]}
          />
        </Paint>
      </RoundedRect>

      {/* 11. Specular strip */}
      <Rect
        x={x + 6} y={y + 1}
        width={W - 12} height={3}
        color="rgba(255,255,255,0.05)"
      />

    </Canvas>
  );
};

export default ClinicalGaugeV10;
