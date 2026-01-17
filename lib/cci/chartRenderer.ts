/**
 * Shared CCI Chart Renderer
 *
 * Single source of truth for chart rendering logic.
 * Used by both the app (CCIChart) and artifact generator (artifact.ts).
 */

// =============================================================================
// COLOR SYSTEM — 4-tier capacity colors
// =============================================================================

/**
 * Get color based on capacity value (matches app exactly)
 * Cyan = Resourced, Green = Good, Amber = Stretched, Red = Depleted
 */
export function getCapacityColor(value: number): string {
  if (value >= 2.5) return '#00D7FF'; // Cyan - Resourced
  if (value >= 2.0) return '#10B981'; // Green - Good
  if (value >= 1.5) return '#E8A830'; // Amber - Stretched
  return '#F44336'; // Red - Depleted
}

// =============================================================================
// DOWNSAMPLING — Convert 90 days to 6 representative points
// =============================================================================

/**
 * Downsample 90-day data to 6 representative points
 * Takes raw values at evenly spaced intervals to preserve patterns
 */
export function downsampleTo6Points(data: number[]): number[] {
  if (data.length <= 6) return data;

  const indices = [0, 17, 35, 53, 71, 89]; // 6 evenly spaced points
  return indices.map(i => data[Math.min(i, data.length - 1)]);
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
 */
function capacityToY(value: number, height: number): number {
  const y = Math.round(height - ((value - 1.0) / 2.0) * height);
  return Math.max(2, Math.min(height - 2, y));
}

/**
 * Generate smooth Bezier curve path from capacity data
 * Uses monotone cubic interpolation for smooth curves
 */
export function generateBezierPath(data: number[], dimensions: ChartDimensions): string {
  const points = downsampleTo6Points(data);
  if (points.length < 2) return '';

  const { width, height } = dimensions;

  const coords = points.map((value, index) => ({
    x: Math.round((index / (points.length - 1)) * width),
    y: capacityToY(value, height)
  }));

  // Start path
  let path = `M ${coords[0].x},${coords[0].y}`;

  // Generate smooth cubic bezier curves between points
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];

    // Control points at 30% distance (matching app)
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${Math.round(cp1x)},${Math.round(cp1y)} ${Math.round(cp2x)},${Math.round(cp2y)} ${coords[i + 1].x},${coords[i + 1].y}`;
  }

  return path;
}

/**
 * Generate area fill path (closes the curve to bottom)
 */
export function generateAreaPath(data: number[], dimensions: ChartDimensions): string {
  const linePath = generateBezierPath(data, dimensions);
  if (!linePath) return '';

  const { width, height } = dimensions;
  return `${linePath} L ${width},${height} L 0,${height} Z`;
}

/**
 * Get chart nodes (downsampled points with coordinates)
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
