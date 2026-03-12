/**
 * orbConstants.ts — Shared constants for Clinical Instrument Orb v9
 */

export const ORB_SIZE = 320;
export const CANVAS_PADDING = 24;
export const CANVAS_SIZE = ORB_SIZE + CANVAS_PADDING * 2;
export const CENTER = CANVAS_SIZE / 2;

// Housing — 5-ring machined stack
export const HOUSING_OUTER_RADIUS = ORB_SIZE / 2 + 18;
export const HOUSING_INNER_RADIUS = ORB_SIZE / 2 + 2;
export const HOUSING_RING_WIDTH = HOUSING_OUTER_RADIUS - HOUSING_INNER_RADIUS;
export const ORB_RADIUS = ORB_SIZE / 2;

export const HOUSING_BASE = '#1A1D23';
export const HOUSING_CERAMIC = '#1E2128';
export const HOUSING_HIGHLIGHT = '#2A2E36';
export const HOUSING_SHADOW = '#08090C';
export const HOUSING_BEVEL_LIGHT = 'rgba(255, 255, 255, 0.08)';
export const HOUSING_BEVEL_DARK = 'rgba(0, 0, 0, 0.5)';
export const HOUSING_INNER_SHADOW = 'rgba(0, 0, 0, 0.7)';
export const HOUSING_GROOVE = 'rgba(0, 0, 0, 0.85)';
export const HOUSING_ETCH = 'rgba(255, 255, 255, 0.025)';

// Glass lens
export const GLASS_SPECULAR_OPACITY = 0.10;
export const GLASS_VIGNETTE_OPACITY = 0.4;
export const LENS_IOR = 1.15;
export const CHROMATIC_ABERRATION = 0.003;
export const FRESNEL_OPACITY = 0.06;

// Deep field / suspended medium
export const NODE_COUNT = 100; // backward compat
export const NODE_COUNT_DEEP = 30;
export const NODE_COUNT_MID = 40;
export const NODE_COUNT_FORE = 20;
export const PATHWAY_COUNT = 8;
export const LIGHTNING_LAYERS = 4;
export const FIELD_BLUR_DEEP = 3.0;
export const FIELD_BLUR_MID = 1.5;
export const FIELD_BLUR_SIGMA = 1.5;
export const MEDIUM_OPACITY = 0.85;
export const VISCOSITY = 0.92;
export const HAZE_OPACITY = 0.06;

// Surface engravings
export const TICK_COUNT = 60;
export const MAJOR_TICK_COUNT = 12;
export const TICK_OPACITY = 0.04;
export const MAJOR_TICK_OPACITY = 0.07;
export const ENGRAVING_COLOR = 'rgba(255, 255, 255, 0.04)';

// Micro texture (lens only)
export const GRAIN_COUNT = 80;
export const GRAIN_OPACITY = 0.025;
export const SCRATCH_COUNT = 12;
export const SCRATCH_OPACITY = 0.015;

// Parallax
export const PARALLAX_MAX_OFFSET = 4;
export const PARALLAX_DEPTH_HOUSING = 0.0;
export const PARALLAX_DEPTH_FIELD = 0.3;
export const PARALLAX_DEPTH_SURFACE = 0.6;

// Interaction
export const DRAG_SENSITIVITY = 0.007;
export const SNAP_INCREMENT = 0.05;
export const DAMPING_RATIO = 1.2;
export const STIFFNESS = 120;
export const MASS = 1.0;

// Gauge — sealed instrument
export const GAUGE_WIDTH = 280;
export const GAUGE_HEIGHT = 48;
export const GAUGE_NEEDLE_WIDTH = 2.5;
export const GAUGE_NEEDLE_SHADOW_BLUR = 6;
export const GAUGE_GLASS_OPACITY = 0.08;
export const GAUGE_DAMPING = 0.88;
export const GAUGE_TICK_COUNT = 40;
export const GAUGE_MAJOR_TICK_INTERVAL = 10;
export const GAUGE_RECESS_DEPTH = 3;

// State thresholds
export const STATE_THRESHOLDS = {
  CRITICAL: 0.15,
  LIMIT: 0.30,
  ELEVATED: 0.50,
  STABLE: 0.70,
  RESOURCED: 0.85,
} as const;

export type CapacityState = 'CRITICAL' | 'LIMIT' | 'ELEVATED' | 'STABLE' | 'RESOURCED';

export function getCapacityState(capacity: number): CapacityState {
  'worklet';
  if (capacity < STATE_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (capacity < STATE_THRESHOLDS.LIMIT) return 'LIMIT';
  if (capacity < STATE_THRESHOLDS.ELEVATED) return 'ELEVATED';
  if (capacity < STATE_THRESHOLDS.STABLE) return 'STABLE';
  return 'RESOURCED';
}
