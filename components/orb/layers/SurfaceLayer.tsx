/**
 * SurfaceLayer.tsx — L3: Calibration Engravings & Micro Texture
 */

import React, { useMemo } from 'react';
import {
  Circle,
  Group,
  Path,
  Paint,
  Line,
  vec,
} from '@shopify/react-native-skia';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import {
  ORB_RADIUS,
  TICK_COUNT,
  MAJOR_TICK_COUNT,
  TICK_OPACITY,
  MAJOR_TICK_OPACITY,
  ENGRAVING_COLOR,
  PARALLAX_DEPTH_SURFACE,
} from '../orbConstants';

interface SurfaceLayerProps {
  size: number;
  capacity: SharedValue<number>;
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
}

export const SurfaceLayer: React.FC<SurfaceLayerProps> = ({
  size,
  capacity,
  parallaxX,
  parallaxY,
}) => {
  const center = size / 2;
  const scale = size / (ORB_RADIUS * 2 + 48);
  const orbR = ORB_RADIUS * scale;

  const ticks = useMemo(() => {
    const result: Array<{ x1: number; y1: number; x2: number; y2: number; isMajor: boolean }> = [];
    for (let i = 0; i < TICK_COUNT; i++) {
      const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % (TICK_COUNT / MAJOR_TICK_COUNT) === 0;
      const innerR = orbR * (isMajor ? 0.88 : 0.92);
      const outerR = orbR * 0.96;
      result.push({
        x1: center + Math.cos(angle) * innerR,
        y1: center + Math.sin(angle) * innerR,
        x2: center + Math.cos(angle) * outerR,
        y2: center + Math.sin(angle) * outerR,
        isMajor,
      });
    }
    return result;
  }, [center, orbR]);

  const calibrationArcs = useMemo(() => {
    const arcR = orbR * 0.85;
    const sA = -Math.PI * 0.75;
    const eA = Math.PI * 0.75;
    const arc1 = `M ${center + Math.cos(sA) * arcR} ${center + Math.sin(sA) * arcR} A ${arcR} ${arcR} 0 1 1 ${center + Math.cos(eA) * arcR} ${center + Math.sin(eA) * arcR}`;
    const outerR2 = orbR * 0.78;
    const s2 = -Math.PI * 0.5;
    const e2 = Math.PI * 0.5;
    const arc2 = `M ${center + Math.cos(s2) * outerR2} ${center + Math.sin(s2) * outerR2} A ${outerR2} ${outerR2} 0 1 1 ${center + Math.cos(e2) * outerR2} ${center + Math.sin(e2) * outerR2}`;
    return [arc1, arc2];
  }, [center, orbR]);

  const transform = useDerivedValue(() => [
    { translateX: parallaxX.value * PARALLAX_DEPTH_SURFACE },
    { translateY: parallaxY.value * PARALLAX_DEPTH_SURFACE },
  ]);

  return (
    <Group transform={transform}>
      {ticks.map((tick, i) => (
        <Line
          key={`t-${i}`}
          p1={vec(tick.x1, tick.y1)}
          p2={vec(tick.x2, tick.y2)}
          style="stroke"
          strokeWidth={(tick.isMajor ? 1.0 : 0.5) * scale}
        >
          <Paint color={`rgba(255,255,255,${tick.isMajor ? MAJOR_TICK_OPACITY : TICK_OPACITY})`} />
        </Line>
      ))}

      {calibrationArcs.map((arcPath, i) => (
        <Path key={`a-${i}`} path={arcPath} style="stroke" strokeWidth={0.5 * scale} strokeCap="round">
          <Paint color={ENGRAVING_COLOR} />
        </Path>
      ))}

      <Line p1={vec(center - 6 * scale, center)} p2={vec(center + 6 * scale, center)} style="stroke" strokeWidth={0.3 * scale}>
        <Paint color="rgba(255,255,255,0.03)" />
      </Line>
      <Line p1={vec(center, center - 6 * scale)} p2={vec(center, center + 6 * scale)} style="stroke" strokeWidth={0.3 * scale}>
        <Paint color="rgba(255,255,255,0.03)" />
      </Line>
      <Circle cx={center} cy={center} r={1.5 * scale}>
        <Paint color="rgba(255,255,255,0.04)" />
      </Circle>
    </Group>
  );
};

export default SurfaceLayer;
