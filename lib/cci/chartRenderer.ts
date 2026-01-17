/**
 * Shared CCI Chart Renderer
 *
 * Single source of truth for chart rendering logic.
 * Used by both the app (CCIChart) and artifact generator (artifact.ts).
 *
 * MATCHES: components/CCIChart.tsx exactly
 */

// =============================================================================
// COLOR SYSTEM — Matches CCIChart.tsx exactly
// =============================================================================

/**
 * Get color based on capacity value (matches CCIChart.tsx line 70-74)
 */
export function getCapacityColor(value: number): string {
  if (value >= 2.0) return '#00D7FF'; // Cyan - Resourced
  if (value >= 1.5) return '#E8A830'; // Amber - Stretched
  return '#F44336'; // Red - Depleted
}

// =============================================================================
// VOLATILITY DETECTION
// =============================================================================

/**
 * Detect if data pattern is volatile (frequent oscillations)
 * Returns true if the data alternates frequently between high and low
 */
function isVolatilePattern(data: number[]): boolean {
  if (data.length < 10) return false;

  // Count direction changes (oscillations)
  let directionChanges = 0;
  let prevDirection = 0;

  for (let i = 1; i < Math.min(data.length, 30); i++) {
    const diff = data[i] - data[i - 1];
    const direction = diff > 0.1 ? 1 : diff < -0.1 ? -1 : 0;

    if (direction !== 0 && direction !== prevDirection && prevDirection !== 0) {
      directionChanges++;
    }
    if (direction !== 0) prevDirection = direction;
  }

  // Volatile if more than 8 direction changes in first 30 points
  return directionChanges > 8;
}

/**
 * Sample peaks and valleys for volatile data
 * Ensures the zigzag pattern is preserved
 */
function samplePeaksAndValleys(data: number[], targetPoints: number): number[] {
  if (data.length <= targetPoints) return data;

  const result: number[] = [data[0]]; // Always include first point

  // Find local peaks and valleys
  const extrema: { index: number; value: number; isPeak: boolean }[] = [];

  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const next = data[i + 1];

    if (curr > prev && curr > next) {
      extrema.push({ index: i, value: curr, isPeak: true });
    } else if (curr < prev && curr < next) {
      extrema.push({ index: i, value: curr, isPeak: false });
    }
  }

  // Select alternating peaks and valleys spread across the data
  const step = Math.max(1, Math.floor(extrema.length / (targetPoints - 2)));
  let lastWasPeak = !extrema[0]?.isPeak;

  for (let i = 0; i < extrema.length && result.length < targetPoints - 1; i += step) {
    // Try to alternate between peaks and valleys
    let selected = extrema[i];

    // Look for alternating extreme within range
    for (let j = i; j < Math.min(i + step, extrema.length); j++) {
      if (extrema[j].isPeak !== lastWasPeak) {
        selected = extrema[j];
        break;
      }
    }

    result.push(selected.value);
    lastWasPeak = selected.isPeak;
  }

  // Always include last point
  result.push(data[data.length - 1]);

  // Ensure we have exactly targetPoints
  while (result.length < targetPoints) {
    const idx = Math.floor(data.length * result.length / targetPoints);
    result.splice(result.length - 1, 0, data[idx]);
  }

  return result.slice(0, targetPoints);
}

// =============================================================================
// DOWNSAMPLING — Matches CCIChart.tsx exactly (with volatility handling)
// =============================================================================

/**
 * Downsample data to target points
 * Matches CCIChart.tsx downsampleData function (lines 144-156)
 * Enhanced with volatility detection for patterns like Tyler's
 */
export function downsampleTo6Points(data: number[], targetPoints: number = 6): number[] {
  if (data.length <= targetPoints) return data;

  // Check if volatile - use peak-valley sampling
  if (isVolatilePattern(data)) {
    return samplePeaksAndValleys(data, targetPoints);
  }

  // Standard downsampling - matches CCIChart.tsx exactly
  const result: number[] = [];
  const step = (data.length - 1) / (targetPoints - 1);

  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.round(i * step);
    result.push(data[idx]);
  }

  return result;
}

// =============================================================================
// SVG PATH GENERATION — For artifact HTML rendering
// =============================================================================

export interface ChartDimensions {
  width: number;
  height: number;
}

export interface ChartNode {
  x: number;
  y: number;
  value: number;
}

/**
 * Map capacity value (1.0-3.0) to Y coordinate
 * Matches CCIChart.tsx valueToY function (lines 163-166)
 */
function capacityToY(value: number, height: number): number {
  const normalized = (value - 1) / 2; // 0 to 1
  const y = height - (normalized * height);
  return Math.max(2, Math.min(height - 2, Math.round(y)));
}

/**
 * Generate smooth Bezier curve path from capacity data
 * Matches CCIChart.tsx generateSmoothPath (lines 171-203)
 */
export function generateBezierPath(data: number[], dimensions: ChartDimensions): string {
  const points = downsampleTo6Points(data);
  if (points.length < 2) return '';

  const { width, height } = dimensions;

  const coords = points.map((value, index) => ({
    x: (index / (points.length - 1)) * width,
    y: capacityToY(value, height)
  }));

  // Start path - matches CCIChart format
  let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;

  // Generate smooth cubic bezier curves - matches CCIChart.tsx exactly
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];

    const dx = p2.x - p1.x;

    // CCIChart style: 30% control point placement with slope-based Y
    const cp1x = p1.x + dx * 0.3;
    const cp1y = p1.y + (p2.y - p0.y) * 0.15;

    const cp2x = p2.x - dx * 0.3;
    const cp2y = p2.y - (p3.y - p1.y) * 0.15;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

/**
 * Generate area fill path (closes the curve to bottom)
 * Matches CCIChart.tsx generateAreaPath (lines 229-240)
 */
export function generateAreaPath(data: number[], dimensions: ChartDimensions): string {
  const linePath = generateBezierPath(data, dimensions);
  if (!linePath) return '';

  const { width, height } = dimensions;
  return `${linePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;
}

/**
 * Get chart nodes (downsampled points with coordinates)
 * Matches CCIChart.tsx getKeyPoints (lines 206-216)
 */
export function getChartNodes(data: number[], dimensions: ChartDimensions): ChartNode[] {
  const points = downsampleTo6Points(data);
  const { width, height } = dimensions;

  return points.map((value, index) => ({
    x: Math.round((index / (points.length - 1)) * width),
    y: capacityToY(value, height),
    value
  }));
}

/**
 * Generate multi-layer node markers SVG (matching app style)
 * Matches CCIChart.tsx node rendering (lines 362-371)
 */
export function generateNodeMarkersSVG(nodes: ChartNode[]): string {
  return nodes.map(node => {
    const color = getCapacityColor(node.value);
    return `
      <circle cx="${node.x}" cy="${node.y}" r="5" fill="#0a0b10"/>
      <circle cx="${node.x}" cy="${node.y}" r="3.5" fill="${color}"/>
      <circle cx="${node.x}" cy="${node.y}" r="1.5" fill="white" fill-opacity="0.9"/>`;
  }).join('');
}
