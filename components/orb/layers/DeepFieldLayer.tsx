/**
 * DeepFieldLayer.tsx — L1: Viscous Medium / Deep Field
 * Particles, neural pathways, lightning — all with viscous damped motion.
 */

import React, { useMemo } from 'react';
import {
  Circle,
  Group,
  Path,
  Paint,
  BlurMask,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useSharedValue,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';
import {
  ORB_RADIUS,
  NODE_COUNT,
  PATHWAY_COUNT,
  LIGHTNING_LAYERS,
  FIELD_BLUR_SIGMA,
  MEDIUM_OPACITY,
} from '../orbConstants';
import { capacityToSkiaColor } from '../orbColors';

interface Node {
  baseAngle: number;
  baseRadius: number;
  size: number;
  depth: number;
  speed: number;
}

function generateNodes(count: number, orbRadius: number): Node[] {
  const nodes: Node[] = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.sin(i * 127.1 + i * 311.7) * 43758.5453;
    const frac = seed - Math.floor(seed);
    nodes.push({
      baseAngle: (i / count) * Math.PI * 2 + frac * 0.5,
      baseRadius: frac * orbRadius * 0.85,
      size: 1.5 + frac * 3,
      depth: frac,
      speed: 0.0002 + frac * 0.0003,
    });
  }
  return nodes;
}

interface Pathway {
  startNode: number;
  endNode: number;
  controlOffset: number;
}

function generatePathways(count: number, nodeCount: number): Pathway[] {
  const pathways: Pathway[] = [];
  for (let i = 0; i < count; i++) {
    pathways.push({
      startNode: i * 7 % nodeCount,
      endNode: (i * 13 + 5) % nodeCount,
      controlOffset: 20 + (i % 3) * 15,
    });
  }
  return pathways;
}

interface DeepFieldLayerProps {
  size: number;
  capacity: SharedValue<number>;
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
}

export const DeepFieldLayer: React.FC<DeepFieldLayerProps> = ({
  size,
  capacity,
  parallaxX,
  parallaxY,
}) => {
  const center = size / 2;
  const scale = size / (ORB_RADIUS * 2 + 48);
  const orbR = ORB_RADIUS * scale;

  const nodes = useMemo(() => generateNodes(NODE_COUNT, orbR), [orbR]);
  const pathways = useMemo(() => generatePathways(PATHWAY_COUNT, NODE_COUNT), []);

  const time = useSharedValue(0);
  useFrameCallback((info) => {
    time.value = (info.timeSinceFirstFrame ?? 0) * 0.001;
  });

  // Compute all node positions as a single derived value
  const nodePositions = useDerivedValue(() => {
    const cap = capacity.value;
    const t = time.value;
    const px = parallaxX.value;
    const py = parallaxY.value;

    return nodes.map((node) => {
      const angle = node.baseAngle + t * node.speed * (0.3 + cap * 0.7);
      const r = node.baseRadius * (0.3 + cap * 0.7);
      let x = center + Math.cos(angle) * r;
      let y = center + Math.sin(angle) * r;
      x += px * node.depth * 0.3;
      y += py * node.depth * 0.3;
      const alpha = (0.15 + cap * 0.5) * (0.4 + node.depth * 0.6);
      return { x, y, size: node.size * scale, alpha };
    });
  });

  // Pathway SVG strings
  const pathwayStrings = useDerivedValue(() => {
    const positions = nodePositions.value;
    const cap = capacity.value;
    return pathways.map((pw) => {
      const start = positions[pw.startNode];
      const end = positions[pw.endNode];
      if (!start || !end) return { d: '', alpha: 0 };
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const offsetScale = pw.controlOffset * scale * (0.5 + cap * 0.5);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const cx = midX + (-dy / len) * offsetScale;
      const cy = midY + (dx / len) * offsetScale;
      return {
        d: `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`,
        alpha: 0.03 + cap * 0.06,
      };
    });
  });

  // Lightning bolt paths
  const lightningData = useDerivedValue(() => {
    const cap = capacity.value;
    const t = time.value;
    const bolts: Array<{ d: string; alpha: number }> = [];
    for (let i = 0; i < LIGHTNING_LAYERS; i++) {
      const angle = (i / LIGHTNING_LAYERS) * Math.PI * 2 + t * 0.1;
      const length = orbR * (0.3 + cap * 0.5);
      let d = `M ${center} ${center}`;
      for (let s = 1; s <= 6; s++) {
        const progress = s / 6;
        const jx = Math.sin(t * 3 + i * 17 + s * 31) * 8 * scale;
        const jy = Math.cos(t * 2.7 + i * 23 + s * 37) * 8 * scale;
        const x = center + Math.cos(angle) * length * progress + jx;
        const y = center + Math.sin(angle) * length * progress + jy;
        d += ` L ${x} ${y}`;
      }
      bolts.push({ d, alpha: (0.02 + cap * 0.08) * (1 - i * 0.2) });
    }
    return bolts;
  });

  const orbColor = useDerivedValue(() => capacityToSkiaColor(capacity.value, MEDIUM_OPACITY));
  const haloColor = useDerivedValue(() => capacityToSkiaColor(capacity.value, 0.15));

  // Pre-derive individual node values to avoid calling hooks in render callbacks
  const nodeCxValues = nodes.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => nodePositions.value[i]?.x ?? center)
  );
  const nodeCyValues = nodes.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => nodePositions.value[i]?.y ?? center)
  );
  const nodeRValues = nodes.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => nodePositions.value[i]?.size ?? 2)
  );
  const nodeColorValues = nodes.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => `rgba(255,255,255,${nodePositions.value[i]?.alpha ?? 0})`)
  );

  // Pre-derive pathway values
  const pathwayDValues = pathways.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => pathwayStrings.value[i]?.d ?? '')
  );
  const pathwayColorValues = pathways.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => `rgba(255,255,255,${pathwayStrings.value[i]?.alpha ?? 0})`)
  );

  // Pre-derive lightning values
  const lightningDValues = Array.from({ length: LIGHTNING_LAYERS }, (_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => lightningData.value[i]?.d ?? '')
  );
  const lightningColorValues = Array.from({ length: LIGHTNING_LAYERS }, (_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => `rgba(255,255,255,${lightningData.value[i]?.alpha ?? 0})`)
  );

  return (
    <Group clip={{ x: center - orbR, y: center - orbR, width: orbR * 2, height: orbR * 2 }}>
      <Group>
        <Paint>
          <BlurMask blur={FIELD_BLUR_SIGMA * scale} style="normal" />
        </Paint>

        {/* Background haze */}
        <Circle cx={center} cy={center} r={orbR} color={haloColor}>
          <BlurMask blur={orbR * 0.3} style="normal" />
        </Circle>

        {/* Orb body */}
        <Circle cx={center} cy={center} r={orbR * 0.95} color={orbColor} />
      </Group>

      {/* Neural pathways */}
      {pathways.map((_, i) => (
        <Path
          key={`pw-${i}`}
          path={pathwayDValues[i]}
          style="stroke"
          strokeWidth={1 * scale}
          strokeCap="round"
          color={pathwayColorValues[i]}
        />
      ))}

      {/* Lightning */}
      {Array.from({ length: LIGHTNING_LAYERS }).map((_, i) => (
        <Path
          key={`lt-${i}`}
          path={lightningDValues[i]}
          style="stroke"
          strokeWidth={(2 - i * 0.3) * scale}
          strokeCap="round"
          color={lightningColorValues[i]}
        />
      ))}

      {/* Particle nodes */}
      {nodes.map((_, i) => (
        <Circle
          key={`n-${i}`}
          cx={nodeCxValues[i]}
          cy={nodeCyValues[i]}
          r={nodeRValues[i]}
          color={nodeColorValues[i]}
        />
      ))}
    </Group>
  );
};

export default DeepFieldLayer;
