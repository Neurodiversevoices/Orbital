// Stage 1 PROBE 1 verified: <Path start end> trim props work on installed Skia 2.2.12.
// Stage 1 PROBE 2 verified: SweepGradient start/end angle props align colors to arc start.
// Rule 2.1: no <div>. Rule 2.2: no CSS shorthand strings.
import React from 'react';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  SweepGradient,
  vec,
  BlurMask,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { ARC_START_DEG, ARC_SWEEP_DEG, ARC_END_DEG } from '../../../lib/capacity/gaugeMath';

export const GAUGE_SIZE = 320;
const C = GAUGE_SIZE / 2;
const R = 120;
const W = 14;

interface Props {
  score: SharedValue<number>;
}

export function GaugeArc({ score }: Props) {
  const tracePath = React.useMemo(() => {
    const p = Skia.Path.Make();
    const rect = Skia.XYWHRect(C - R, C - R, R * 2, R * 2);
    p.addArc(rect, ARC_START_DEG, ARC_SWEEP_DEG);
    return p;
  }, []);

  const activeEnd = useDerivedValue(() => Math.max(0, Math.min(1, score.value / 100)));

  const tipX = useDerivedValue(() => {
    const a = (ARC_START_DEG + activeEnd.value * ARC_SWEEP_DEG) * (Math.PI / 180);
    return C + R * Math.cos(a);
  });
  const tipY = useDerivedValue(() => {
    const a = (ARC_START_DEG + activeEnd.value * ARC_SWEEP_DEG) * (Math.PI / 180);
    return C + R * Math.sin(a);
  });

  return (
    <Canvas style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }} testID="gauge-canvas">
      <Path
        path={tracePath}
        style="stroke"
        strokeWidth={W}
        strokeCap="round"
        color="rgba(255,255,255,0.10)"
      />
      <Group>
        <Path
          path={tracePath}
          style="stroke"
          strokeWidth={W}
          strokeCap="round"
          start={0}
          end={activeEnd}
        >
          <SweepGradient
            c={vec(C, C)}
            colors={['#E5484D', '#F5B547', '#5DD9D4']}
            positions={[0.0, 0.5, 1.0]}
            start={ARC_START_DEG}
            end={ARC_END_DEG}
          />
        </Path>
      </Group>
      <Circle cx={tipX} cy={tipY} r={W} color="#5DD9D4" opacity={0.35}>
        <BlurMask blur={14} style="normal" />
      </Circle>
      <Circle cx={tipX} cy={tipY} r={W * 0.78} color="#FFFFFF" opacity={0.95} />
    </Canvas>
  );
}
