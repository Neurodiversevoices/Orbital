// OrbAvatar — Skia-rendered orb that doubles as user identity and state container.
// Sizes: 24/40/64/96/160/320 — caller passes `size` prop.
// State: 'depleted' | 'elevated' | 'resourced' | 'unknown'.
// Colors match the capacity spectrum from orbColors.ts.

import React from 'react';
import { Canvas, Circle, Group, RadialGradient, Shadow, vec } from '@shopify/react-native-skia';
import type { OrbTuningId } from './orbTunings';
import { ORB_TUNINGS } from './orbTunings';

type State = 'depleted' | 'elevated' | 'resourced' | 'unknown';

const STATE_COLOR: Record<State, string> = {
  depleted:  '#DC2626',
  elevated:  '#F59E0B',
  resourced: '#2DD4BF',
  unknown:   '#7A8593',
};

export function OrbAvatar({
  size = 96,
  tuningId,
  state = 'unknown',
}: {
  size?: number;
  tuningId: OrbTuningId;
  state?: State;
}) {
  const tuning = ORB_TUNINGS[tuningId];
  const r = size / 2;
  const innerR = r * 0.72;
  const stateColor = STATE_COLOR[state];

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group>
        <Circle cx={r} cy={r} r={r * 0.95} opacity={tuning.haloIntensity * 0.3}>
          <RadialGradient
            c={vec(r, r)}
            r={r}
            colors={[stateColor, 'transparent']}
          />
        </Circle>
        <Circle cx={r} cy={r} r={innerR}>
          <RadialGradient
            c={vec(r * 0.7, r * 0.7)}
            r={innerR * 1.2}
            colors={[tuning.seedColor, '#01020A']}
          />
          <Shadow dx={0} dy={2} blur={size * 0.05} color={'rgba(0,0,0,0.4)'} inner />
        </Circle>
      </Group>
    </Canvas>
  );
}
