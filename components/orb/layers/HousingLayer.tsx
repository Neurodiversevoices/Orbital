/**
 * HousingLayer.tsx — L0: Machined Instrument Housing
 *
 * Each visual effect uses a SINGLE shape with at most one Paint child.
 * Shadows are separate shapes drawn behind the housing ring.
 */

import React from 'react';
import {
  Circle,
  Group,
  Paint,
  LinearGradient,
  vec,
  BlurMask,
} from '@shopify/react-native-skia';
import {
  HOUSING_OUTER_RADIUS,
  HOUSING_INNER_RADIUS,
  ORB_RADIUS,
  HOUSING_BASE,
  HOUSING_BEVEL_LIGHT,
  HOUSING_BEVEL_DARK,
  HOUSING_INNER_SHADOW,
} from '../orbConstants';

interface HousingLayerProps {
  size: number;
}

export const HousingLayer: React.FC<HousingLayerProps> = ({ size }) => {
  const center = size / 2;
  const scale = size / (ORB_RADIUS * 2 + 48);
  const outerR = HOUSING_OUTER_RADIUS * scale;
  const innerR = HOUSING_INNER_RADIUS * scale;
  const orbR = ORB_RADIUS * scale;

  return (
    <Group>
      {/* Deep drop shadow — single shape: color on Circle, BlurMask as child */}
      <Circle
        cx={center}
        cy={center + 2 * scale}
        r={outerR + 4 * scale}
        color="rgba(0, 0, 0, 0.5)"
      >
        <BlurMask blur={12 * scale} style="normal" />
      </Circle>

      {/* Subtle highlight — single shape */}
      <Circle
        cx={center}
        cy={center - 1 * scale}
        r={outerR + 2 * scale}
        color="rgba(255, 255, 255, 0.015)"
      >
        <BlurMask blur={4 * scale} style="normal" />
      </Circle>

      {/* Main housing ring — solid fill */}
      <Circle cx={center} cy={center} r={outerR} color={HOUSING_BASE} />

      {/* Bevel lighting — single stroke with gradient */}
      <Circle
        cx={center}
        cy={center}
        r={outerR}
        style="stroke"
        strokeWidth={1.5 * scale}
      >
        <Paint>
          <LinearGradient
            start={vec(center - outerR, center - outerR)}
            end={vec(center + outerR, center + outerR)}
            colors={[HOUSING_BEVEL_LIGHT, 'transparent', HOUSING_BEVEL_DARK]}
            positions={[0, 0.5, 1]}
          />
        </Paint>
      </Circle>

      {/* Inner highlight ring */}
      <Circle
        cx={center}
        cy={center}
        r={outerR - 2 * scale}
        style="stroke"
        strokeWidth={0.5 * scale}
        color="rgba(255, 255, 255, 0.03)"
      />

      {/* Recessed inner edge — stroke with gradient */}
      <Circle
        cx={center}
        cy={center}
        r={innerR}
        style="stroke"
        strokeWidth={3 * scale}
      >
        <Paint>
          <LinearGradient
            start={vec(center - innerR, center - innerR)}
            end={vec(center + innerR, center + innerR)}
            colors={[HOUSING_INNER_SHADOW, 'rgba(0, 0, 0, 0.2)', 'rgba(255, 255, 255, 0.02)']}
            positions={[0, 0.6, 1]}
          />
        </Paint>
      </Circle>

      {/* Inner shadow for depth — color on Circle, BlurMask child */}
      <Circle
        cx={center}
        cy={center + 1 * scale}
        r={orbR + 1 * scale}
        color="rgba(0, 0, 0, 0.3)"
      >
        <BlurMask blur={6 * scale} style="inner" />
      </Circle>
    </Group>
  );
};

export default HousingLayer;
