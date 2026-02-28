/**
 * Orb Color System
 *
 * Maps a continuous capacity value (0.0–1.0) to the design system spectrum:
 *   0.0 = crimson (#DC2626)
 *   0.5 = amber (#F59E0B)
 *   1.0 = cyan (#06B6D4)
 *
 * Teal (#2DD4BF) sits around 0.75 as the "resourced" anchor.
 */

// =============================================================================
// COLOR STOPS
// =============================================================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

const STOPS: { at: number; color: RGB }[] = [
  { at: 0.0, color: { r: 220, g: 38, b: 38 } },   // crimson #DC2626
  { at: 0.5, color: { r: 245, g: 158, b: 11 } },   // amber   #F59E0B
  { at: 0.75, color: { r: 45, g: 212, b: 191 } },   // teal    #2DD4BF
  { at: 1.0, color: { r: 6, g: 182, b: 212 } },     // cyan    #06B6D4
];

// =============================================================================
// INTERPOLATION
// =============================================================================

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Get the RGB color for a capacity value (0.0–1.0).
 */
export function getOrbColor(capacity: number): RGB {
  const c = Math.max(0, Math.min(1, capacity));

  // Find the surrounding stops
  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i];
    const hi = STOPS[i + 1];
    if (c >= lo.at && c <= hi.at) {
      const t = (c - lo.at) / (hi.at - lo.at);
      return {
        r: Math.round(lerp(lo.color.r, hi.color.r, t)),
        g: Math.round(lerp(lo.color.g, hi.color.g, t)),
        b: Math.round(lerp(lo.color.b, hi.color.b, t)),
      };
    }
  }

  // Fallback to last stop
  return STOPS[STOPS.length - 1].color;
}

/**
 * Get an rgba() string for Skia from a capacity value.
 */
export function capacityToSkiaColor(capacity: number, alpha: number = 1): string {
  const { r, g, b } = getOrbColor(capacity);
  return `rgba(${r},${g},${b},${alpha})`;
}

// =============================================================================
// STATE LABELS
// =============================================================================

/**
 * Get the discrete state label for a capacity value.
 */
export function getStateLabel(capacity: number): string {
  if (capacity < 0.15) return 'CRITICAL';
  if (capacity < 0.3) return 'LIMIT';
  if (capacity < 0.5) return 'ELEVATED';
  if (capacity < 0.7) return 'STABLE';
  return 'RESOURCED';
}

/**
 * Get the clinical context line for a capacity value.
 */
export function getStateContext(capacity: number): string {
  if (capacity < 0.15) return 'System overload — immediate rest needed';
  if (capacity < 0.3) return 'Approaching threshold — reduce demands';
  if (capacity < 0.5) return 'Elevated load — monitor inputs';
  if (capacity < 0.7) return 'Manageable load — within range';
  return 'Well-resourced — capacity available';
}
