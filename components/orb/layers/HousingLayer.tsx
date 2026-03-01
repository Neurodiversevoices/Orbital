/**
 * HousingLayer.tsx — L0: 5-Ring Machined Instrument Housing
 *
 * Ring stack (outside → in):
 *  1. Drop shadow (deep + secondary lift)
 *  2. Ceramic body ring
 *  3. Top-light bevel stroke
 *  4. Recessed inner lip / groove
 *  5. Fine etched decorative rings
 *
 * Each shape: at most ONE Paint child. Color on element props where possible.
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
  HOUSING_CERAMIC,
  HOUSING_BEVEL_LIGHT,
  HOUSING_BEVEL_DARK,
  HOUSING_INNER_SHADOW,
  HOUSING_GROOVE,
  HOUSING_ETCH,
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
      {/* Ring 1a — Deep drop shadow */}
      <Circle
        cx={center}
        cy={center + 3 * scale}
        r={outerR + 6 * scale}
        color="rgba(0, 0, 0, 0.6)"
      >
        <BlurMask blur={16 * scale} style="normal" />
      </Circle>

      {/* Ring 1b — Secondary lift shadow */}
      <Circle
        cx={center}
        cy={center + 1 * scale}
        r={outerR + 2 * scale}
        color="rgba(0, 0, 0, 0.3)"
      >
        <BlurMask blur={8 * scale} style="normal" />
      </Circle>

      {/* Ring 2a — Ceramic body (outer fill) */}
      <Circle cx={center} cy={center} r={outerR} color={HOUSING_BASE} />

      {/* Ring 2b — Ceramic inner tone */}
      <Circle cx={center} cy={center} r={outerR - 1 * scale} color={HOUSING_CERAMIC} />

      {/* Ring 3 — Top-light bevel (gradient stroke) */}
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
            positions={[0, 0.45, 1]}
          />
        </Paint>
      </Circle>

      {/* Secondary bevel — subtle horizontal highlight */}
      <Circle
        cx={center}
        cy={center}
        r={outerR - 2 * scale}
        style="stroke"
        strokeWidth={0.5 * scale}
        color="rgba(255, 255, 255, 0.03)"
      />

      {/* Ring 4 — Recessed inner lip (dark groove) */}
      <Circle
        cx={center}
        cy={center}
        r={innerR}
        style="stroke"
        strokeWidth={4 * scale}
      >
        <Paint>
          <LinearGradient
            start={vec(center - innerR, center - innerR)}
            end={vec(center + innerR, center + innerR)}
            colors={[HOUSING_GROOVE, HOUSING_INNER_SHADOW, 'rgba(255, 255, 255, 0.01)']}
            positions={[0, 0.65, 1]}
          />
        </Paint>
      </Circle>

      {/* Inner shadow — depth where housing meets glass */}
      <Circle
        cx={center}
        cy={center + 1 * scale}
        r={orbR + 1 * scale}
        color="rgba(0, 0, 0, 0.4)"
      >
        <BlurMask blur={8 * scale} style="inner" />
      </Circle>

      {/* Ring 5a — Etched decorative ring (mid housing) */}
      <Circle
        cx={center}
        cy={center}
        r={(outerR + innerR) / 2}
        style="stroke"
        strokeWidth={0.3 * scale}
        color={HOUSING_ETCH}
      />

      {/* Ring 5b — Fine etch (near inner edge) */}
      <Circle
        cx={center}
        cy={center}
        r={innerR + 2 * scale}
        style="stroke"
        strokeWidth={0.2 * scale}
        color={HOUSING_ETCH}
      />
    </Group>
  );
};

export default HousingLayer;
