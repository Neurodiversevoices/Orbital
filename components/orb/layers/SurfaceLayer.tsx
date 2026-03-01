/**
 * SurfaceLayer.tsx — L3: Calibration Engravings & Micro Texture
 *
 * Static tick marks, calibration arcs, crosshair.
 * Film grain (tiny scattered dots) and radial hairline scratches on lens.
 * Each element: color on element prop (not nested Paint children).
 */

import React, { useMemo } from 'react';
import {
  Circle,
  Group,
  Path,
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
  GRAIN_COUNT,
  GRAIN_OPACITY,
  SCRATCH_COUNT,
  SCRATCH_OPACITY,
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

  // Calibration ticks
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

  // Calibration arcs
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

  // Film grain — tiny dots scattered across lens surface (single path)
  const grainPath = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const seed1 = Math.sin(i * 73.1 + 317.3) * 43758.5453;
      const seed2 = Math.sin(i * 127.1 + 231.7) * 43758.5453;
      const fx = (seed1 - Math.floor(seed1)) * 2 - 1;
      const fy = (seed2 - Math.floor(seed2)) * 2 - 1;
      const dist = Math.sqrt(fx * fx + fy * fy);
      if (dist > 0.92) continue; // keep within orb boundary
      const x = center + fx * orbR;
      const y = center + fy * orbR;
      const r = 0.3 * scale;
      parts.push(
        `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`,
      );
    }
    return parts.join(' ');
  }, [center, orbR, scale]);

  // Radial hairline scratches (single path)
  const scratchPath = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < SCRATCH_COUNT; i++) {
      const seed = Math.sin(i * 193.1 + 571.7) * 43758.5453;
      const frac = seed - Math.floor(seed);
      const angle = frac * Math.PI * 2;
      const innerR2 = orbR * (0.25 + frac * 0.3);
      const outerR2 = orbR * (0.65 + frac * 0.28);
      const x1 = center + Math.cos(angle) * innerR2;
      const y1 = center + Math.sin(angle) * innerR2;
      const x2 = center + Math.cos(angle) * outerR2;
      const y2 = center + Math.sin(angle) * outerR2;
      parts.push(`M ${x1} ${y1} L ${x2} ${y2}`);
    }
    return parts.join(' ');
  }, [center, orbR]);

  const transform = useDerivedValue(() => [
    { translateX: parallaxX.value * PARALLAX_DEPTH_SURFACE },
    { translateY: parallaxY.value * PARALLAX_DEPTH_SURFACE },
  ]);

  return (
    <Group transform={transform}>
      {/* Film grain — scattered dots on lens surface */}
      <Path path={grainPath} color={`rgba(255,255,255,${GRAIN_OPACITY})`} />

      {/* Radial hairline scratches */}
      <Path
        path={scratchPath}
        style="stroke"
        strokeWidth={0.3 * scale}
        color={`rgba(255,255,255,${SCRATCH_OPACITY})`}
      />

      {/* Tick marks — color on Line prop */}
      {ticks.map((tick, i) => (
        <Line
          key={`t-${i}`}
          p1={vec(tick.x1, tick.y1)}
          p2={vec(tick.x2, tick.y2)}
          style="stroke"
          strokeWidth={(tick.isMajor ? 1.0 : 0.5) * scale}
          color={`rgba(255,255,255,${tick.isMajor ? MAJOR_TICK_OPACITY : TICK_OPACITY})`}
        />
      ))}

      {/* Calibration arcs — color on Path prop */}
      {calibrationArcs.map((arcPath, i) => (
        <Path
          key={`a-${i}`}
          path={arcPath}
          style="stroke"
          strokeWidth={0.5 * scale}
          strokeCap="round"
          color={ENGRAVING_COLOR}
        />
      ))}

      {/* Crosshair — color on Line prop */}
      <Line
        p1={vec(center - 6 * scale, center)}
        p2={vec(center + 6 * scale, center)}
        style="stroke"
        strokeWidth={0.3 * scale}
        color="rgba(255,255,255,0.03)"
      />
      <Line
        p1={vec(center, center - 6 * scale)}
        p2={vec(center, center + 6 * scale)}
        style="stroke"
        strokeWidth={0.3 * scale}
        color="rgba(255,255,255,0.03)"
      />
      <Circle cx={center} cy={center} r={1.5 * scale} color="rgba(255,255,255,0.04)" />
    </Group>
  );
};

export default SurfaceLayer;
