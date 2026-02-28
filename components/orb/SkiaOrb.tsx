/**
 * SkiaOrb — v7.3
 *
 * Hero orb component with Skia canvas rendering and pan-gesture capacity control.
 *
 * Visual layers (back → front):
 *   1. Outer glow — blurred circle behind the orb
 *   2. Glass wall — 16px thick double-stroke ring with refraction effect
 *   3. 100 3D nodes — scattered glowing dots with parallax shift
 *   4. 10 neural pathways — quadratic bezier curves connecting node pairs
 *   5. 4-layer lightning — jagged animated paths from center to inner edge
 *   6. Orb body — solid color fill
 *   7. Clinical state label — RN Text below the canvas
 *
 * Gesture: Drag up = increase capacity, drag down = decrease.
 * Color interpolates across the design system spectrum:
 *   crimson (0.0) → amber (0.5) → teal (0.75) → cyan (1.0)
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  Canvas,
  Circle,
  Path,
  BlurMask,
  Group,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  useDerivedValue,
  runOnJS,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  capacityToSkiaColor,
  getStateLabel,
  getStateContext,
} from './orbColors';

// =============================================================================
// TYPES
// =============================================================================

export interface SkiaOrbProps {
  /** Canvas size in points. Default 320. */
  size?: number;
  /** Initial capacity 0.0–1.0. Default 0.82. */
  initialCapacity?: number;
  /** Called when a drag ends with the snapped capacity value. */
  onCapacityChange?: (capacity: number) => void;
}

interface NodePoint {
  /** Angle in radians from center */
  angle: number;
  /** Distance from center as fraction of inner radius (0–1) */
  dist: number;
  /** Base radius of the dot */
  radius: number;
}

interface NeuralPathway {
  /** Index of source node */
  from: number;
  /** Index of destination node */
  to: number;
  /** Control point offset angle */
  ctrlAngle: number;
  /** Control point offset magnitude as fraction of inner radius */
  ctrlMag: number;
}

interface LightningBolt {
  /** Starting angle from center */
  startAngle: number;
  /** Ending angle from center */
  endAngle: number;
  /** Array of normalized segment offsets for jaggedness */
  segments: number[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DRAG_SENSITIVITY = 0.007;
const SNAP_INCREMENT = 0.05;
const SPRING_CONFIG = { damping: 15, stiffness: 120 };

const NODE_COUNT = 100;
const PATHWAY_COUNT = 10;
const LIGHTNING_LAYERS = 4;
const LIGHTNING_SEGMENTS = 8;

const LIGHTNING_OPACITIES = [0.8, 0.5, 0.3, 0.15];
const LIGHTNING_WIDTHS = [2, 1.5, 1, 0.5];

// =============================================================================
// HELPERS
// =============================================================================

/** Snap a value to the nearest increment. */
function snapTo(value: number, increment: number): number {
  'worklet';
  return Math.round(value / increment) * increment;
}

/** Clamp between 0 and 1. */
function clamp01(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

/** Seeded pseudo-random for stable generation. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Convert polar to cartesian. */
function polarToXY(
  cx: number,
  cy: number,
  angle: number,
  distance: number,
): { x: number; y: number } {
  return {
    x: cx + Math.cos(angle) * distance,
    y: cy + Math.sin(angle) * distance,
  };
}

// =============================================================================
// STATIC GEOMETRY GENERATORS
// =============================================================================

function generateNodes(rand: () => number): NodePoint[] {
  const nodes: NodePoint[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      angle: rand() * Math.PI * 2,
      dist: 0.15 + rand() * 0.75, // keep away from exact center and edge
      radius: 1 + rand() * 2, // 1–3px
    });
  }
  return nodes;
}

function generatePathways(
  rand: () => number,
  nodeCount: number,
): NeuralPathway[] {
  const pathways: NeuralPathway[] = [];
  for (let i = 0; i < PATHWAY_COUNT; i++) {
    const from = Math.floor(rand() * nodeCount);
    let to = Math.floor(rand() * nodeCount);
    // Avoid self-connection
    if (to === from) to = (to + 1) % nodeCount;
    pathways.push({
      from,
      to,
      ctrlAngle: rand() * Math.PI * 2,
      ctrlMag: 0.2 + rand() * 0.4,
    });
  }
  return pathways;
}

function generateLightningBolts(rand: () => number): LightningBolt[] {
  const bolts: LightningBolt[] = [];
  for (let i = 0; i < LIGHTNING_LAYERS; i++) {
    const segments: number[] = [];
    for (let s = 0; s < LIGHTNING_SEGMENTS; s++) {
      // Random lateral offset for jaggedness
      segments.push((rand() - 0.5) * 2);
    }
    bolts.push({
      startAngle: rand() * Math.PI * 2,
      endAngle: rand() * Math.PI * 2,
      segments,
    });
  }
  return bolts;
}

// =============================================================================
// PATH STRING BUILDERS (for Skia <Path path="..." />)
// =============================================================================

function buildLightningPathString(
  cx: number,
  cy: number,
  innerRadius: number,
  bolt: LightningBolt,
  phase: number,
): string {
  // Lightning goes from near center outward to a point on the inner edge
  const startDist = innerRadius * 0.08;
  const endDist = innerRadius * 0.92;

  const targetAngle = bolt.endAngle + phase * 0.3;
  const perpAngle = targetAngle + Math.PI / 2;
  const jitterScale = innerRadius * 0.12;

  const steps = bolt.segments.length;
  const parts: string[] = [];

  const startPt = polarToXY(cx, cy, bolt.startAngle + phase * 0.1, startDist);
  parts.push(`M ${startPt.x} ${startPt.y}`);

  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps;
    const mainDist = startDist + (endDist - startDist) * t;
    const base = polarToXY(cx, cy, targetAngle, mainDist);

    // Apply jagged lateral offset, modulated by phase for animation
    const jitterPhase = bolt.segments[i] * Math.cos(phase * 2 + i);
    const offX = Math.cos(perpAngle) * jitterPhase * jitterScale;
    const offY = Math.sin(perpAngle) * jitterPhase * jitterScale;

    parts.push(`L ${base.x + offX} ${base.y + offY}`);
  }

  return parts.join(' ');
}

function buildNeuralPathwayString(
  cx: number,
  cy: number,
  innerRadius: number,
  pathway: NeuralPathway,
  nodes: NodePoint[],
  capacityVal: number,
): string {
  const nodeFrom = nodes[pathway.from];
  const nodeTo = nodes[pathway.to];

  const shift = (capacityVal - 0.5) * innerRadius * 0.06;

  const fromPt = polarToXY(
    cx,
    cy,
    nodeFrom.angle,
    nodeFrom.dist * innerRadius + shift,
  );
  const toPt = polarToXY(
    cx,
    cy,
    nodeTo.angle,
    nodeTo.dist * innerRadius + shift,
  );

  // Control point: offset from midpoint
  const midX = (fromPt.x + toPt.x) / 2;
  const midY = (fromPt.y + toPt.y) / 2;
  const ctrlDist = pathway.ctrlMag * innerRadius;
  const ctrlX = midX + Math.cos(pathway.ctrlAngle) * ctrlDist;
  const ctrlY = midY + Math.sin(pathway.ctrlAngle) * ctrlDist;

  return `M ${fromPt.x} ${fromPt.y} Q ${ctrlX} ${ctrlY} ${toPt.x} ${toPt.y}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SkiaOrb({
  size = 320,
  initialCapacity = 0.82,
  onCapacityChange,
}: SkiaOrbProps) {
  const capacity = useSharedValue(initialCapacity);
  const dragStartCap = useSharedValue(initialCapacity);

  // Lightning animation phase — loops continuously
  const lightningPhase = useSharedValue(0);

  // State label tracking
  const [stateLabel, setStateLabel] = React.useState(
    getStateLabel(initialCapacity),
  );
  const [stateContext, setStateContext] = React.useState(
    getStateContext(initialCapacity),
  );

  const labelOpacity = useSharedValue(1);

  // ── Geometry constants ──────────────────────────────────────────────
  const center = size / 2;
  const orbRadius = size * 0.38; // ~122px at 320
  const glowRadius = size * 0.46; // ~147px at 320
  const innerRadius = orbRadius - 10; // Inside the glass wall
  const glassOuterR = orbRadius + 2;
  const glassInnerR = orbRadius - 14;

  // ── Generate stable random geometry ─────────────────────────────────
  const rand = useMemo(() => seededRandom(42), []);
  const nodes = useMemo(() => generateNodes(rand), [rand]);
  const pathways = useMemo(
    () => generatePathways(rand, nodes.length),
    [rand, nodes.length],
  );
  const lightningBolts = useMemo(() => generateLightningBolts(rand), [rand]);

  // ── Start lightning animation loop ──────────────────────────────────
  useEffect(() => {
    lightningPhase.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: 4000,
        easing: Easing.linear,
      }),
      -1, // infinite repeat
      false, // no reverse
    );
  }, [lightningPhase]);

  // ── Derived Skia colors from capacity ───────────────────────────────
  const orbColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.85);
  });

  const orbCoreColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.4);
  });

  const glowColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.25);
  });

  const glassOuterColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.12);
  });

  const glassInnerColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.08);
  });

  const glassHighlightColor = useDerivedValue(() => {
    return `rgba(255,255,255,0.07)`;
  });

  const glassEdgeColor = useDerivedValue(() => {
    return `rgba(255,255,255,0.15)`;
  });

  // Node colors at different opacities
  const nodeColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.6);
  });

  const nodeGlowColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.2);
  });

  const pathwayColor = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, 0.15);
  });

  // Lightning colors per layer
  const lightningColor0 = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, LIGHTNING_OPACITIES[0]);
  });
  const lightningColor1 = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, LIGHTNING_OPACITIES[1]);
  });
  const lightningColor2 = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, LIGHTNING_OPACITIES[2]);
  });
  const lightningColor3 = useDerivedValue(() => {
    return capacityToSkiaColor(capacity.value, LIGHTNING_OPACITIES[3]);
  });

  const lightningColors = [
    lightningColor0,
    lightningColor1,
    lightningColor2,
    lightningColor3,
  ];

  // ── Derived lightning paths (animated via phase) ────────────────────
  const lightningPath0 = useDerivedValue(() => {
    return buildLightningPathString(
      center,
      center,
      innerRadius,
      lightningBolts[0],
      lightningPhase.value,
    );
  });
  const lightningPath1 = useDerivedValue(() => {
    return buildLightningPathString(
      center,
      center,
      innerRadius,
      lightningBolts[1],
      lightningPhase.value + 1.2,
    );
  });
  const lightningPath2 = useDerivedValue(() => {
    return buildLightningPathString(
      center,
      center,
      innerRadius,
      lightningBolts[2],
      lightningPhase.value + 2.5,
    );
  });
  const lightningPath3 = useDerivedValue(() => {
    return buildLightningPathString(
      center,
      center,
      innerRadius,
      lightningBolts[3],
      lightningPhase.value + 3.8,
    );
  });

  const lightningPaths = [
    lightningPath0,
    lightningPath1,
    lightningPath2,
    lightningPath3,
  ];

  // ── Derived node positions (parallax shifted by capacity) ───────────
  const nodePositions = useDerivedValue(() => {
    const shift = (capacity.value - 0.5) * innerRadius * 0.06;
    return nodes.map((node) => {
      const dist = node.dist * innerRadius + shift;
      return {
        x: center + Math.cos(node.angle) * dist,
        y: center + Math.sin(node.angle) * dist,
        r: node.radius,
      };
    });
  });

  // ── Derived neural pathway strings ──────────────────────────────────
  const neuralPaths = useDerivedValue(() => {
    return pathways.map((pw) =>
      buildNeuralPathwayString(
        center,
        center,
        innerRadius,
        pw,
        nodes,
        capacity.value,
      ),
    );
  });

  // ── JS callback bridge ──────────────────────────────────────────────
  const updateLabels = useCallback(
    (val: number) => {
      const newLabel = getStateLabel(val);
      const newContext = getStateContext(val);
      setStateLabel(newLabel);
      setStateContext(newContext);
    },
    [],
  );

  const fireCapacityChange = useCallback(
    (val: number) => {
      const rounded = Math.round(val * 100) / 100;
      onCapacityChange?.(rounded);
      updateLabels(rounded);
    },
    [onCapacityChange, updateLabels],
  );

  // Initialize labels
  useEffect(() => {
    updateLabels(initialCapacity);
  }, [initialCapacity, updateLabels]);

  // ── Pan gesture ─────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartCap.value = capacity.value;
      // Fade label slightly during drag
      labelOpacity.value = withTiming(0.5, { duration: 150 });
    })
    .onUpdate((e) => {
      // Drag up (negative dy) = increase capacity
      const raw = dragStartCap.value - e.translationY * DRAG_SENSITIVITY;
      capacity.value = clamp01(raw);
    })
    .onEnd(() => {
      const snapped = clamp01(snapTo(capacity.value, SNAP_INCREMENT));
      capacity.value = withSpring(snapped, SPRING_CONFIG);
      labelOpacity.value = withTiming(1, { duration: 300 });
      runOnJS(fireCapacityChange)(snapped);
    });

  // ── Animated label style ────────────────────────────────────────────
  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  // ── Canvas height includes room for label below ─────────────────────
  const canvasSize = size;
  const labelAreaHeight = 64;
  const totalHeight = canvasSize + labelAreaHeight;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { width: size, height: totalHeight }]}>
      <GestureDetector gesture={panGesture}>
        <View style={{ width: canvasSize, height: canvasSize }}>
          <Canvas style={{ width: canvasSize, height: canvasSize }}>
            {/* Layer 1: Outer glow */}
            <Circle
              cx={center}
              cy={center}
              r={glowRadius}
              color={glowColor}
            >
              <BlurMask blur={40} style="normal" />
            </Circle>

            {/* Layer 2: Glass wall — outer stroke */}
            <Circle
              cx={center}
              cy={center}
              r={glassOuterR}
              style="stroke"
              strokeWidth={3}
              color={glassEdgeColor}
            />
            {/* Glass wall — thick translucent band */}
            <Circle
              cx={center}
              cy={center}
              r={orbRadius - 6}
              style="stroke"
              strokeWidth={16}
              color={glassHighlightColor}
            />
            {/* Glass wall — inner stroke */}
            <Circle
              cx={center}
              cy={center}
              r={glassInnerR}
              style="stroke"
              strokeWidth={2}
              color={glassOuterColor}
            />
            {/* Glass wall — subtle color tint on outer edge */}
            <Circle
              cx={center}
              cy={center}
              r={orbRadius}
              style="stroke"
              strokeWidth={1}
              color={glassInnerColor}
            >
              <BlurMask blur={4} style="normal" />
            </Circle>

            {/* Layer 3: Orb body — base fill */}
            <Circle
              cx={center}
              cy={center}
              r={innerRadius}
              color={orbCoreColor}
            />

            {/* Layer 4: 100 3D nodes — glowing dots with parallax */}
            <NodesLayer
              nodePositions={nodePositions}
              nodeColor={nodeColor}
              nodeGlowColor={nodeGlowColor}
              center={center}
              innerRadius={innerRadius}
            />

            {/* Layer 5: 10 neural pathways */}
            <NeuralPathwaysLayer
              neuralPaths={neuralPaths}
              pathwayColor={pathwayColor}
            />

            {/* Layer 6: 4-layer lightning */}
            {lightningPaths.map((pathStr, i) => (
              <Path
                key={`lightning-${i}`}
                path={pathStr}
                style="stroke"
                strokeWidth={LIGHTNING_WIDTHS[i]}
                strokeCap="round"
                strokeJoin="round"
                color={lightningColors[i]}
              />
            ))}

            {/* Layer 7: Bright orb core overlay for depth */}
            <Circle
              cx={center}
              cy={center}
              r={innerRadius * 0.4}
              color={orbColor}
            >
              <BlurMask blur={20} style="normal" />
            </Circle>
          </Canvas>
        </View>
      </GestureDetector>

      {/* Clinical state label — below the canvas */}
      <Animated.View style={[styles.labelContainer, labelAnimatedStyle]}>
        <Text style={styles.stateLabel}>{stateLabel}</Text>
        <Text style={styles.stateContext}>{stateContext}</Text>
      </Animated.View>
    </View>
  );
}

// =============================================================================
// SUB-COMPONENTS (memoized for performance)
// =============================================================================

/**
 * Renders 100 scattered glowing nodes inside the orb.
 * Uses derivedValue for positions so nodes shift with capacity.
 */
const NodesLayer = React.memo(function NodesLayer({
  nodePositions,
  nodeColor,
  nodeGlowColor,
  center,
  innerRadius,
}: {
  nodePositions: { value: { x: number; y: number; r: number }[] };
  nodeColor: { value: string };
  nodeGlowColor: { value: string };
  center: number;
  innerRadius: number;
}) {
  // Render a fixed number of Circle elements that read from the derived positions
  // We use indices to map to the derived array
  return (
    <Group>
      {Array.from({ length: NODE_COUNT }, (_, i) => (
        <NodeDot
          key={`node-${i}`}
          index={i}
          nodePositions={nodePositions}
          nodeColor={nodeColor}
          nodeGlowColor={nodeGlowColor}
          center={center}
          innerRadius={innerRadius}
        />
      ))}
    </Group>
  );
});

/**
 * Single node dot — reads its position from the shared derived array.
 */
const NodeDot = React.memo(function NodeDot({
  index,
  nodePositions,
  nodeColor,
  nodeGlowColor,
  center,
  innerRadius,
}: {
  index: number;
  nodePositions: { value: { x: number; y: number; r: number }[] };
  nodeColor: { value: string };
  nodeGlowColor: { value: string };
  center: number;
  innerRadius: number;
}) {
  const cx = useDerivedValue(() => {
    const pos = nodePositions.value[index];
    return pos ? pos.x : center;
  });
  const cy = useDerivedValue(() => {
    const pos = nodePositions.value[index];
    return pos ? pos.y : center;
  });
  const r = useDerivedValue(() => {
    const pos = nodePositions.value[index];
    return pos ? pos.r : 1.5;
  });
  const glowR = useDerivedValue(() => {
    const pos = nodePositions.value[index];
    return pos ? pos.r + 3 : 4.5;
  });

  // Clip: only show nodes within the inner radius
  const isVisible = useDerivedValue(() => {
    const pos = nodePositions.value[index];
    if (!pos) return 0;
    const dx = pos.x - center;
    const dy = pos.y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < innerRadius ? 1 : 0;
  });

  const clippedNodeColor = useDerivedValue(() => {
    return isVisible.value === 1 ? nodeColor.value : 'rgba(0,0,0,0)';
  });

  const clippedGlowColor = useDerivedValue(() => {
    return isVisible.value === 1 ? nodeGlowColor.value : 'rgba(0,0,0,0)';
  });

  return (
    <>
      {/* Glow halo */}
      <Circle cx={cx} cy={cy} r={glowR} color={clippedGlowColor}>
        <BlurMask blur={3} style="normal" />
      </Circle>
      {/* Core dot */}
      <Circle cx={cx} cy={cy} r={r} color={clippedNodeColor} />
    </>
  );
});

/**
 * Renders 10 neural pathway bezier curves.
 */
const NeuralPathwaysLayer = React.memo(function NeuralPathwaysLayer({
  neuralPaths,
  pathwayColor,
}: {
  neuralPaths: { value: string[] };
  pathwayColor: { value: string };
}) {
  return (
    <Group>
      {Array.from({ length: PATHWAY_COUNT }, (_, i) => (
        <NeuralPath
          key={`pathway-${i}`}
          index={i}
          neuralPaths={neuralPaths}
          pathwayColor={pathwayColor}
        />
      ))}
    </Group>
  );
});

/**
 * Single neural pathway curve.
 */
const NeuralPath = React.memo(function NeuralPath({
  index,
  neuralPaths,
  pathwayColor,
}: {
  index: number;
  neuralPaths: { value: string[] };
  pathwayColor: { value: string };
}) {
  const pathString = useDerivedValue(() => {
    const paths = neuralPaths.value;
    return paths[index] || 'M 0 0';
  });

  return (
    <Path
      path={pathString}
      style="stroke"
      strokeWidth={1}
      strokeCap="round"
      color={pathwayColor}
    >
      <BlurMask blur={2} style="normal" />
    </Path>
  );
});

// Re-export capacity shared value access for parent components
export { useSharedValue } from 'react-native-reanimated';

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  stateLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 13,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  stateContext: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
});
