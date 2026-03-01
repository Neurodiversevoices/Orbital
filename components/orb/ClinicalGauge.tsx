/**
 * ClinicalGauge.tsx — Precision Capacity Meter
 * Sealed clinical gauge with needle, glass cover, engraved endpoints.
 */

import React, { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Group,
  Line,
  RoundedRect,
  Paint,
  LinearGradient,
  RadialGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import {
  GAUGE_WIDTH,
  GAUGE_HEIGHT,
  GAUGE_NEEDLE_WIDTH,
  GAUGE_NEEDLE_SHADOW_BLUR,
  GAUGE_GLASS_OPACITY,
  GAUGE_TICK_COUNT,
  GAUGE_MAJOR_TICK_INTERVAL,
} from './orbConstants';
import { capacityToSkiaColor } from './orbColors';

interface ClinicalGaugeProps {
  width?: number;
  height?: number;
  capacity: SharedValue<number>;
}

export const ClinicalGauge: React.FC<ClinicalGaugeProps> = ({
  width = GAUGE_WIDTH,
  height = GAUGE_HEIGHT,
  capacity,
}) => {
  const canvasW = width + 40;
  const canvasH = height + 24;
  const gX = 20;
  const gY = 8;
  const gW = width;
  const gH = height;
  const cornerR = 6;

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

  const scaleColors = useMemo(() => {
    const colors: string[] = [];
    for (let i = 0; i <= 10; i++) colors.push(capacityToSkiaColor(i / 10, 0.6));
    return colors;
  }, []);

  const scalePositions = useMemo(() => Array.from({ length: 11 }, (_, i) => i / 10), []);

  const needleX = useDerivedValue(() => gX + capacity.value * gW);
  const needleColor = useDerivedValue(() => capacityToSkiaColor(capacity.value, 1.0));

  const needleShadowP1 = useDerivedValue(() => vec(needleX.value + 1, gY + 4));
  const needleShadowP2 = useDerivedValue(() => vec(needleX.value + 1, gY + gH - 4));
  const needleP1 = useDerivedValue(() => vec(needleX.value, gY + 3));
  const needleP2 = useDerivedValue(() => vec(needleX.value, gY + gH - 3));

  return (
    <Canvas style={{ width: canvasW, height: canvasH }}>
      {/* Housing */}
      <RoundedRect x={gX - 2} y={gY - 2} width={gW + 4} height={gH + 4} r={cornerR + 2}>
        <Paint color="#0D0E12" />
      </RoundedRect>

      {/* Bevel */}
      <RoundedRect x={gX - 2} y={gY - 2} width={gW + 4} height={gH + 4} r={cornerR + 2} style="stroke" strokeWidth={1}>
        <Paint>
          <LinearGradient start={vec(gX, gY - 2)} end={vec(gX, gY + gH + 2)} colors={['rgba(255,255,255,0.04)', 'rgba(0,0,0,0.2)']} />
        </Paint>
      </RoundedRect>

      {/* Scale bg */}
      <RoundedRect x={gX} y={gY} width={gW} height={gH} r={cornerR}>
        <Paint color="#0A0B0F" />
      </RoundedRect>

      {/* Color gradient */}
      <RoundedRect x={gX + 4} y={gY + gH * 0.35} width={gW - 8} height={gH * 0.12} r={2}>
        <Paint>
          <LinearGradient start={vec(gX + 4, 0)} end={vec(gX + gW - 4, 0)} colors={scaleColors} positions={scalePositions} />
        </Paint>
      </RoundedRect>

      {/* Ticks */}
      {ticks.map((tick, i) => (
        <Line
          key={`gt-${i}`}
          p1={vec(tick.x, gY + gH * 0.55)}
          p2={vec(tick.x, gY + gH * (tick.isMajor ? 0.75 : 0.65))}
          style="stroke"
          strokeWidth={tick.isMajor ? 1 : 0.5}
        >
          <Paint color={`rgba(255,255,255,${tick.isMajor ? 0.12 : 0.05})`} />
        </Line>
      ))}

      {/* Needle shadow */}
      <Line
        p1={needleShadowP1}
        p2={needleShadowP2}
        style="stroke"
        strokeWidth={GAUGE_NEEDLE_WIDTH + 2}
      >
        <Paint>
          <BlurMask blur={GAUGE_NEEDLE_SHADOW_BLUR} style="normal" />
        </Paint>
        <Paint color="rgba(0,0,0,0.4)" />
      </Line>

      {/* Needle */}
      <Line
        p1={needleP1}
        p2={needleP2}
        style="stroke"
        strokeWidth={GAUGE_NEEDLE_WIDTH}
        strokeCap="round"
        color={needleColor}
      />

      {/* Needle cap */}
      <Circle cx={needleX} cy={gY + 3} r={2} color="rgba(255,255,255,0.15)" />

      {/* Glass cover */}
      <RoundedRect x={gX} y={gY} width={gW} height={gH} r={cornerR}>
        <Paint>
          <LinearGradient
            start={vec(gX, gY)}
            end={vec(gX, gY + gH)}
            colors={[`rgba(255,255,255,${GAUGE_GLASS_OPACITY})`, 'transparent', `rgba(255,255,255,${GAUGE_GLASS_OPACITY * 0.3})`]}
            positions={[0, 0.4, 1]}
          />
        </Paint>
      </RoundedRect>

      {/* Engraved endpoints */}
      <Line p1={vec(gX, gY + gH + 6)} p2={vec(gX + 30, gY + gH + 6)} style="stroke" strokeWidth={0.5}>
        <Paint color="rgba(0,255,200,0.15)" />
      </Line>
      <Line p1={vec(gX + gW - 30, gY + gH + 6)} p2={vec(gX + gW, gY + gH + 6)} style="stroke" strokeWidth={0.5}>
        <Paint color="rgba(255,60,60,0.15)" />
      </Line>
    </Canvas>
  );
};

export default ClinicalGauge;
