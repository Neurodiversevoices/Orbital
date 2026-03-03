/**
 * GlassLensLayer.tsx — L2: Precision Glass Lens
 *
 * Pure gradient approach (no RuntimeShader):
 *  - Inner edge darkening
 *  - Strong vignette
 *  - Rim compression band
 *  - Fresnel ring
 *  - Glass edge ring
 *
 * Every shape: at most ONE Paint child.
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
  GLASS_VIGNETTE_OPACITY,
  FRESNEL_OPACITY,
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
      {/* Inner edge darkening — shadow ring inside orb boundary */}
      <Circle cx={center} cy={center} r={orbR}>
        <Paint>
          <RadialGradient
            c={vec(center, center)}
            r={orbR}
            colors={[
              'transparent',
              'transparent',
              'rgba(0,0,0,0.08)',
              'rgba(0,0,0,0.25)',
            ]}
            positions={[0, 0.65, 0.85, 1.0]}
          />
        </Paint>
      </Circle>

      {/* Vignette — strong darkening toward edges */}
      <Circle cx={center} cy={center} r={orbR}>
        <Paint>
          <RadialGradient
            c={vec(center, center)}
            r={orbR}
            colors={[
              'transparent',
              'transparent',
              `rgba(0,0,0,${(GLASS_VIGNETTE_OPACITY * 0.5).toFixed(2)})`,
              `rgba(0,0,0,${GLASS_VIGNETTE_OPACITY.toFixed(2)})`,
            ]}
            positions={[0, 0.45, 0.78, 1.0]}
          />
        </Paint>
      </Circle>

      {/* Rim compression — narrow dark band near edge for curvature depth */}
      <Circle cx={center} cy={center} r={orbR}>
        <Paint>
          <RadialGradient
            c={vec(center, center)}
            r={orbR}
            colors={['transparent', 'transparent', 'rgba(0,0,0,0.12)', 'transparent']}
            positions={[0, 0.82, 0.92, 1.0]}
          />
        </Paint>
      </Circle>

      {/* Fresnel ring — bright thin ring at very edge */}
      <Circle
        cx={center}
        cy={center}
        r={orbR - 0.5 * scale}
        style="stroke"
        strokeWidth={1 * scale}
      >
        <Paint>
          <LinearGradient
            start={vec(center - orbR, center - orbR)}
            end={vec(center + orbR, center + orbR)}
            colors={[
              `rgba(255,255,255,${FRESNEL_OPACITY})`,
              'transparent',
              `rgba(255,255,255,${(FRESNEL_OPACITY * 0.5).toFixed(3)})`,
            ]}
            positions={[0, 0.5, 1]}
          />
        </Paint>
      </Circle>

      {/* Glass edge ring — structural boundary */}
      <Circle
        cx={center}
        cy={center}
        r={orbR - 1.5 * scale}
        style="stroke"
        strokeWidth={1.5 * scale}
      >
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
