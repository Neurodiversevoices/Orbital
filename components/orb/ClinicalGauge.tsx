/**
 * ClinicalGauge.tsx — Sealed Instrument Capacity Meter
 *
 * Housing body with inner recess, color scale strip, precision ticks,
 * needle with cast shadow, glass cover with highlight line.
 *
 * Every shape has at most ONE Paint child. Colors on element props where possible.
 */

import React, { useMemo } from 'react';
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
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import {
  GAUGE_WIDTH,
  GAUGE_HEIGHT,
  GAUGE_NEEDLE_WIDTH,
  GAUGE_NEEDLE_SHADOW_BLUR,
  GAUGE_GLASS_OPACITY,
  GAUGE_TICK_COUNT,
  GAUGE_MAJOR_TICK_INTERVAL,
  GAUGE_RECESS_DEPTH,
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
  const canvasH = height + 28;
  const gX = 20;
  const gY = 10;
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

  const needleShadowP1 = useDerivedValue(() => vec(needleX.value + 1.5, gY + 3));
  const needleShadowP2 = useDerivedValue(() => vec(needleX.value + 1.5, gY + gH - 3));
  const needleP1 = useDerivedValue(() => vec(needleX.value, gY + 2));
  const needleP2 = useDerivedValue(() => vec(needleX.value, gY + gH - 2));

  return (
    <Canvas style={{ width: canvasW, height: canvasH }}>
      {/* Outer drop shadow */}
      <RoundedRect
        x={gX - 4} y={gY - 3}
        width={gW + 8} height={gH + 8}
        r={cornerR + 4}
        color="rgba(0,0,0,0.35)"
      >
        <BlurMask blur={8} style="normal" />
      </RoundedRect>

      {/* Housing body */}
      <RoundedRect
        x={gX - 3} y={gY - 3}
        width={gW + 6} height={gH + 6}
        r={cornerR + 3}
        color="#0D0E12"
      />

      {/* Housing bevel — gradient stroke */}
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
            colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.3)']}
          />
        </Paint>
      </RoundedRect>

      {/* Inner recess background */}
      <RoundedRect
        x={gX - 1} y={gY - 1}
        width={gW + 2} height={gH + 2}
        r={cornerR + 1}
        color="#060710"
      />

      {/* Recess inner shadow */}
      <RoundedRect
        x={gX - 1} y={gY - 1}
        width={gW + 2} height={gH + 2}
        r={cornerR + 1}
        color="rgba(0,0,0,0.5)"
      >
        <BlurMask blur={GAUGE_RECESS_DEPTH} style="inner" />
      </RoundedRect>

      {/* Scale background */}
      <RoundedRect x={gX} y={gY} width={gW} height={gH} r={cornerR} color="#08090D" />

      {/* Color gradient strip */}
      <RoundedRect x={gX + 4} y={gY + gH * 0.30} width={gW - 8} height={gH * 0.14} r={2}>
        <Paint>
          <LinearGradient
            start={vec(gX + 4, 0)}
            end={vec(gX + gW - 4, 0)}
            colors={scaleColors}
            positions={scalePositions}
          />
        </Paint>
      </RoundedRect>

      {/* Ticks — color on Line prop */}
      {ticks.map((tick, i) => (
        <Line
          key={`gt-${i}`}
          p1={vec(tick.x, gY + gH * 0.52)}
          p2={vec(tick.x, gY + gH * (tick.isMajor ? 0.78 : 0.66))}
          style="stroke"
          strokeWidth={tick.isMajor ? 1 : 0.5}
          color={`rgba(255,255,255,${tick.isMajor ? 0.14 : 0.05})`}
        />
      ))}

      {/* Needle shadow — soft, offset */}
      <Line
        p1={needleShadowP1}
        p2={needleShadowP2}
        style="stroke"
        strokeWidth={GAUGE_NEEDLE_WIDTH + 3}
        color="rgba(0,0,0,0.5)"
      >
        <BlurMask blur={GAUGE_NEEDLE_SHADOW_BLUR} style="normal" />
      </Line>

      {/* Needle — animated color */}
      <Line
        p1={needleP1}
        p2={needleP2}
        style="stroke"
        strokeWidth={GAUGE_NEEDLE_WIDTH}
        strokeCap="round"
        color={needleColor}
      />

      {/* Needle cap — top */}
      <Circle cx={needleX} cy={gY + 2} r={2.5} color="rgba(255,255,255,0.18)" />

      {/* Needle cap — bottom */}
      <Circle cx={needleX} cy={gY + gH - 2} r={1.5} color="rgba(255,255,255,0.08)" />

      {/* Glass cover — stronger gradient */}
      <RoundedRect x={gX} y={gY} width={gW} height={gH} r={cornerR}>
        <Paint>
          <LinearGradient
            start={vec(gX, gY)}
            end={vec(gX, gY + gH)}
            colors={[
              `rgba(255,255,255,${GAUGE_GLASS_OPACITY})`,
              'transparent',
              'transparent',
              `rgba(255,255,255,${(GAUGE_GLASS_OPACITY * 0.4).toFixed(3)})`,
            ]}
            positions={[0, 0.3, 0.7, 1]}
          />
        </Paint>
      </RoundedRect>

      {/* Glass highlight line — top edge */}
      <Line
        p1={vec(gX + 8, gY + 1)}
        p2={vec(gX + gW - 8, gY + 1)}
        style="stroke"
        strokeWidth={0.5}
        color="rgba(255,255,255,0.06)"
      />

      {/* Engraved endpoint — left (green/low) */}
      <Line
        p1={vec(gX, gY + gH + 8)}
        p2={vec(gX + 28, gY + gH + 8)}
        style="stroke"
        strokeWidth={0.5}
        color="rgba(0,255,200,0.18)"
      />

      {/* Engraved endpoint — right (red/high) */}
      <Line
        p1={vec(gX + gW - 28, gY + gH + 8)}
        p2={vec(gX + gW, gY + gH + 8)}
        style="stroke"
        strokeWidth={0.5}
        color="rgba(255,60,60,0.18)"
      />
    </Canvas>
  );
};

export default ClinicalGauge;
