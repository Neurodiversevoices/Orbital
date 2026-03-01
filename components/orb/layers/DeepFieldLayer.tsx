/**
 * DeepFieldLayer.tsx — L1: Viscous Medium / Deep Field
 * Particles, neural pathways, lightning — all with viscous damped motion.
 *
 * Architecture: ONE useDerivedValue computes all geometry per frame.
 * Individual derived values extract path strings. Zero hooks in loops.
 */

import React, { useMemo } from 'react';
import {
  Circle,
  Group,
  Path,
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

// ── Static geometry seeds ────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────

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

  // Circular clip path (SVG string) — not rectangular
  const circleClipPath = useMemo(() => {
    const r = orbR;
    return `M ${center - r} ${center} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  }, [center, orbR]);

  const time = useSharedValue(0);
  useFrameCallback((info) => {
    time.value = (info.timeSinceFirstFrame ?? 0) * 0.001;
  });

  // ── SINGLE derived value computes ALL frame geometry ────────────────
  const frame = useDerivedValue(() => {
    const cap = capacity.value;
    const t = time.value;
    const px = parallaxX.value;
    const py = parallaxY.value;

    // 1. Compute node positions + build circle paths
    const positions: Array<{ x: number; y: number }> = [];
    const nodeParts: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const angle = node.baseAngle + t * node.speed * (0.3 + cap * 0.7);
      const r = node.baseRadius * (0.3 + cap * 0.7);
      let x = center + Math.cos(angle) * r;
      let y = center + Math.sin(angle) * r;
      x += px * node.depth * 0.3;
      y += py * node.depth * 0.3;
      positions.push({ x, y });
      // SVG circle arc: move to left edge, sweep full circle
      const nr = node.size * scale;
      nodeParts.push(
        `M ${x - nr} ${y} a ${nr} ${nr} 0 1 0 ${nr * 2} 0 a ${nr} ${nr} 0 1 0 ${-nr * 2} 0`
      );
    }

    // 2. Build pathway Q-curves from positions
    const pathwayParts: string[] = [];
    for (let i = 0; i < pathways.length; i++) {
      const pw = pathways[i];
      const s = positions[pw.startNode];
      const e = positions[pw.endNode];
      if (!s || !e) continue;
      const mx = (s.x + e.x) / 2;
      const my = (s.y + e.y) / 2;
      const os = pw.controlOffset * scale * (0.5 + cap * 0.5);
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const cx = mx + (-dy / len) * os;
      const cy = my + (dx / len) * os;
      pathwayParts.push(`M ${s.x} ${s.y} Q ${cx} ${cy} ${e.x} ${e.y}`);
    }

    // 3. Build lightning bolts
    const lightningParts: string[] = [];
    for (let i = 0; i < LIGHTNING_LAYERS; i++) {
      const angle = (i / LIGHTNING_LAYERS) * Math.PI * 2 + t * 0.1;
      const len = orbR * (0.3 + cap * 0.5);
      let d = `M ${center} ${center}`;
      for (let s = 1; s <= 6; s++) {
        const progress = s / 6;
        const jx = Math.sin(t * 3 + i * 17 + s * 31) * 8 * scale;
        const jy = Math.cos(t * 2.7 + i * 23 + s * 37) * 8 * scale;
        const x = center + Math.cos(angle) * len * progress + jx;
        const y = center + Math.sin(angle) * len * progress + jy;
        d += ` L ${x} ${y}`;
      }
      lightningParts.push(d);
    }

    return {
      nodesPath: nodeParts.join(' '),
      pathwaysPath: pathwayParts.join(' '),
      lightningPath: lightningParts.join(' '),
      nodeColor: `rgba(255,255,255,${(0.15 + cap * 0.35).toFixed(3)})`,
      pathwayColor: `rgba(255,255,255,${(0.03 + cap * 0.06).toFixed(3)})`,
      lightningColor: `rgba(255,255,255,${(0.02 + cap * 0.06).toFixed(3)})`,
      orbColorStr: capacityToSkiaColor(cap, MEDIUM_OPACITY),
      haloColorStr: capacityToSkiaColor(cap, 0.15),
    };
  });

  // ── Extract individual values (all top-level, zero hooks in loops) ──
  const nodesPath = useDerivedValue(() => frame.value.nodesPath);
  const pathwaysPath = useDerivedValue(() => frame.value.pathwaysPath);
  const lightningPath = useDerivedValue(() => frame.value.lightningPath);
  const nodeColor = useDerivedValue(() => frame.value.nodeColor);
  const pathwayColor = useDerivedValue(() => frame.value.pathwayColor);
  const lightningColor = useDerivedValue(() => frame.value.lightningColor);
  const orbColor = useDerivedValue(() => frame.value.orbColorStr);
  const haloColor = useDerivedValue(() => frame.value.haloColorStr);

  return (
    <Group clip={circleClipPath}>
      {/* Background haze */}
      <Circle cx={center} cy={center} r={orbR} color={haloColor}>
        <BlurMask blur={orbR * 0.3} style="normal" />
      </Circle>

      {/* Orb body */}
      <Circle cx={center} cy={center} r={orbR * 0.95} color={orbColor} />

      {/* Neural pathways — single combined path */}
      <Path
        path={pathwaysPath}
        style="stroke"
        strokeWidth={1 * scale}
        strokeCap="round"
        color={pathwayColor}
      />

      {/* Lightning — single combined path */}
      <Path
        path={lightningPath}
        style="stroke"
        strokeWidth={1.5 * scale}
        strokeCap="round"
        color={lightningColor}
      />

      {/* Particle nodes — single combined path of circle arcs */}
      <Path path={nodesPath} color={nodeColor} />
    </Group>
  );
};

export default DeepFieldLayer;
