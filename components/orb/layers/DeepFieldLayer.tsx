/**
 * DeepFieldLayer.tsx — L1: Viscous Medium / Deep Field
 *
 * Interior field layer with:
 *   Neural pathways — quadratic curves connecting invisible anchor nodes
 *   Lightning bolts — jittered radial lines from center
 *   Wave/horizon   — three-harmonic organic wave with volumetric glow
 *   Ambient haze   — soft blurred glow disc
 *
 * Architecture: ONE useDerivedValue computes pathways + lightning per frame.
 * Standalone waveFrame derived value computes wave independently.
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
  NODE_COUNT_MID,
  PATHWAY_COUNT,
  LIGHTNING_LAYERS,
  HAZE_OPACITY,
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

function generateNodes(
  count: number,
  orbRadius: number,
  sizeMin: number,
  sizeMax: number,
  seed: number,
): Node[] {
  const nodes: Node[] = [];
  for (let i = 0; i < count; i++) {
    const s = Math.sin((i + seed) * 127.1 + (i + seed) * 311.7) * 43758.5453;
    const frac = s - Math.floor(s);
    nodes.push({
      baseAngle: (i / count) * Math.PI * 2 + frac * 0.8,
      baseRadius: (0.1 + frac * 0.85) * orbRadius,
      size: sizeMin + frac * (sizeMax - sizeMin),
      depth: frac,
      speed: 0.0001 + frac * 0.00025,
    });
  }
  return nodes;
}

interface Pathway {
  startIdx: number;
  endIdx: number;
  controlOffset: number;
}

function generatePathways(count: number, totalNodes: number): Pathway[] {
  const pathways: Pathway[] = [];
  for (let i = 0; i < count; i++) {
    pathways.push({
      startIdx: (i * 7) % totalNodes,
      endIdx: (i * 13 + 5) % totalNodes,
      controlOffset: 15 + (i % 3) * 12,
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

  // Static seeds per depth layer
  // Mid-layer nodes retained — pathways use their positions as endpoints
  const midNodes = useMemo(() => generateNodes(NODE_COUNT_MID, orbR, 1.5, 4, 1000), [orbR]);
  const pathways = useMemo(() => generatePathways(PATHWAY_COUNT, NODE_COUNT_MID), []);

  // Circular clip path (SVG string)
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

    // 1. Mid-layer positions (needed as pathway endpoints)
    const midPositions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < midNodes.length; i++) {
      const node = midNodes[i];
      const angle = node.baseAngle + t * node.speed * (0.2 + cap * 0.6);
      const r = node.baseRadius * (0.2 + cap * 0.8);
      let x = center + Math.cos(angle) * r;
      let y = center + Math.sin(angle) * r;
      x += px * node.depth * 0.3;
      y += py * node.depth * 0.3;
      midPositions.push({ x, y });
    }

    // 2. Pathways (connect mid-layer node positions)
    const pathwayParts: string[] = [];
    for (let i = 0; i < pathways.length; i++) {
      const pw = pathways[i];
      const s = midPositions[pw.startIdx];
      const e = midPositions[pw.endIdx];
      if (!s || !e) continue;
      const mx = (s.x + e.x) / 2;
      const my = (s.y + e.y) / 2;
      const os = pw.controlOffset * scale * (0.4 + cap * 0.6);
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const cx2 = mx + (-dy / len) * os;
      const cy2 = my + (dx / len) * os;
      pathwayParts.push(`M ${s.x} ${s.y} Q ${cx2} ${cy2} ${e.x} ${e.y}`);
    }

    // 3. Lightning bolts
    const lightningParts: string[] = [];
    for (let i = 0; i < LIGHTNING_LAYERS; i++) {
      const angle = (i / LIGHTNING_LAYERS) * Math.PI * 2 + t * 0.08;
      const boltLen = orbR * (0.25 + cap * 0.5);
      let d = `M ${center} ${center}`;
      for (let seg = 1; seg <= 6; seg++) {
        const progress = seg / 6;
        const jx = Math.sin(t * 2.5 + i * 17 + seg * 31) * 6 * scale;
        const jy = Math.cos(t * 2.2 + i * 23 + seg * 37) * 6 * scale;
        const bx = center + Math.cos(angle) * boltLen * progress + jx;
        const by = center + Math.sin(angle) * boltLen * progress + jy;
        d += ` L ${bx} ${by}`;
      }
      lightningParts.push(d);
    }

    // Colors — alpha scales with capacity
    const pathwayAlpha = (0.02 + cap * 0.05).toFixed(3);
    const lightningAlpha = (0.01 + cap * 0.05).toFixed(3);

    return {
      pathwaysPath: pathwayParts.join(' '),
      lightningPath: lightningParts.join(' '),
      pathwayColor: `rgba(255,255,255,${pathwayAlpha})`,
      lightningColor: `rgba(255,255,255,${lightningAlpha})`,
      hazeColor: capacityToSkiaColor(cap, HAZE_OPACITY + cap * 0.04),
    };
  });

  // ── Extract individual values (all top-level, zero hooks in loops) ──
  const pathwaysPath = useDerivedValue(() => frame.value.pathwaysPath);
  const lightningPath = useDerivedValue(() => frame.value.lightningPath);
  const pathwayColor = useDerivedValue(() => frame.value.pathwayColor);
  const lightningColor = useDerivedValue(() => frame.value.lightningColor);
  const hazeColor = useDerivedValue(() => frame.value.hazeColor);

  // ── Wave/horizon line — standalone derived value (independent of frame) ──
  // Three-harmonic organic wave with volumetric glow and echo.
  // Reads capacity + time directly, not via frame object.
  const waveFrame = useDerivedValue(() => {
    const cap = capacity.value;
    const t = time.value;

    // Y-position: capacity 1.0 → near top (resourced/cyan)
    //             capacity 0.0 → near bottom (depleted/crimson)
    const waveBaseY = center + orbR * 0.8 * (1 - cap * 2);
    const clampedWY = Math.max(
      center - orbR * 0.92,
      Math.min(center + orbR * 0.92, waveBaseY),
    );
    // Horizontal chord width at wave Y-level
    const wDy = clampedWY - center;
    const halfChord = Math.sqrt(Math.max(0, orbR * orbR - wDy * wDy));
    const wL = center - halfChord;
    const wR = center + halfChord;

    const SEGS = 40; // extra segments for smooth high-frequency harmonics
    const amp = 10 * scale;
    const primaryParts: string[] = [];
    const echoParts: string[] = [];

    for (let i = 0; i <= SEGS; i++) {
      const p = i / SEGS;
      const x = wL + p * (wR - wL);
      const fade = Math.sin(p * Math.PI); // edge taper at circular boundary

      // Three harmonics — organic, fluid motion
      const h1 = Math.sin(p * Math.PI * 2.5 + t * 1.2);          // primary
      const h2 = Math.sin(p * Math.PI * 5.0 + t * 0.8) * 0.3;    // secondary
      const h3 = Math.sin(p * Math.PI * 8.0 + t * 2.0) * 0.12;   // tertiary
      const displacement = (h1 + h2 + h3) * amp * fade;

      const y = clampedWY + displacement;
      const echoY = y + 3 * scale; // echo trail 3px below primary

      const cmd = i === 0 ? 'M' : 'L';
      primaryParts.push(`${cmd} ${x} ${y}`);
      echoParts.push(`${cmd} ${x} ${echoY}`);
    }

    return {
      path: primaryParts.join(' '),
      echoPath: echoParts.join(' '),
      // Volumetric glow — graduated alpha for vertical masking
      wideGlowColor: capacityToSkiaColor(cap, 0.35),  // widest, dimmest
      midGlowColor: capacityToSkiaColor(cap, 0.45),   // medium band
      primaryColor: capacityToSkiaColor(cap, 0.85),    // crisp horizon
      echoColor: capacityToSkiaColor(cap, 0.30),       // dim trail
    };
  });

  const wavePath = useDerivedValue(() => waveFrame.value.path);
  const waveEchoPath = useDerivedValue(() => waveFrame.value.echoPath);
  const waveWideGlowColor = useDerivedValue(() => waveFrame.value.wideGlowColor);
  const waveMidGlowColor = useDerivedValue(() => waveFrame.value.midGlowColor);
  const wavePrimaryColor = useDerivedValue(() => waveFrame.value.primaryColor);
  const waveEchoColor = useDerivedValue(() => waveFrame.value.echoColor);

  return (
    <Group clip={circleClipPath}>
      {/* Ambient medium glow — subtle, NOT a solid fill */}
      <Circle cx={center} cy={center} r={orbR * 0.7} color={hazeColor}>
        <BlurMask blur={orbR * 0.35} style="normal" />
      </Circle>

      {/* Neural pathways — connect mid-layer nodes */}
      <Path
        path={pathwaysPath}
        style="stroke"
        strokeWidth={0.8 * scale}
        strokeCap="round"
        color={pathwayColor}
      />

      {/* Lightning — visible at higher capacity */}
      <Path
        path={lightningPath}
        style="stroke"
        strokeWidth={1 * scale}
        strokeCap="round"
        color={lightningColor}
      />

      {/* Wave — wide soft glow band (vertical masking: dimmest, widest) */}
      <Path
        path={wavePath}
        style="stroke"
        strokeWidth={10 * scale}
        strokeCap="round"
        color={waveWideGlowColor}
      >
        <BlurMask blur={8 * scale} style="normal" />
      </Path>

      {/* Wave — medium glow band (vertical masking: mid-brightness) */}
      <Path
        path={wavePath}
        style="stroke"
        strokeWidth={4 * scale}
        strokeCap="round"
        color={waveMidGlowColor}
      >
        <BlurMask blur={3 * scale} style="normal" />
      </Path>

      {/* Wave — crisp primary horizon line (brightest) */}
      <Path
        path={wavePath}
        style="stroke"
        strokeWidth={2 * scale}
        strokeCap="round"
        color={wavePrimaryColor}
      />

      {/* Wave — dim echo trail 3px below */}
      <Path
        path={waveEchoPath}
        style="stroke"
        strokeWidth={1 * scale}
        strokeCap="round"
        color={waveEchoColor}
      />
    </Group>
  );
};

export default DeepFieldLayer;
