/**
 * GlassLensLayer.tsx — L2: Precision Glass Lens
 * Gradient-based specular, vignette, and rim light for glass lens effect.
 */

import React from 'react';
import {
  Circle,
  Group,
  Paint,
  RadialGradient,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import { type SharedValue } from 'react-native-reanimated';
import {
  ORB_RADIUS,
  GLASS_SPECULAR_OPACITY,
} from '../orbConstants';

interface GlassLensLayerProps {
  size: number;
  capacity: SharedValue<number>;
}

export const GlassLensLayer: React.FC<GlassLensLayerProps> = ({ size }) => {
  const center = size / 2;
  const scale = size / (ORB_RADIUS * 2 + 48);
  const orbR = ORB_RADIUS * scale;

  return (
    <Group>
      {/* Vignette */}
      <Circle cx={center} cy={center} r={orbR}>
        <Paint>
          <RadialGradient
            c={vec(center, center)}
            r={orbR}
            colors={['transparent', 'transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.35)']}
            positions={[0, 0.5, 0.8, 1.0]}
          />
        </Paint>
      </Circle>

      {/* Primary specular */}
      <Circle cx={center - orbR * 0.25} cy={center - orbR * 0.3} r={orbR * 0.35}>
        <Paint>
          <RadialGradient
            c={vec(center - orbR * 0.25, center - orbR * 0.3)}
            r={orbR * 0.35}
            colors={[`rgba(255,255,255,${GLASS_SPECULAR_OPACITY})`, 'transparent']}
          />
        </Paint>
      </Circle>

      {/* Secondary rim light */}
      <Circle cx={center + orbR * 0.4} cy={center + orbR * 0.35} r={orbR * 0.15}>
        <Paint>
          <RadialGradient
            c={vec(center + orbR * 0.4, center + orbR * 0.35)}
            r={orbR * 0.15}
            colors={['rgba(255,255,255,0.03)', 'transparent']}
          />
        </Paint>
      </Circle>

      {/* Glass edge ring */}
      <Circle cx={center} cy={center} r={orbR - 1 * scale} style="stroke" strokeWidth={2 * scale}>
        <Paint>
          <LinearGradient
            start={vec(center - orbR, center - orbR)}
            end={vec(center + orbR, center + orbR)}
            colors={['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)']}
            positions={[0, 0.5, 1]}
          />
        </Paint>
      </Circle>
    </Group>
  );
};

export default GlassLensLayer;
