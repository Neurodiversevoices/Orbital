/**
 * CCI Summary Chart Renderer
 *
 * SINGLE SOURCE OF TRUTH for the 6-point summary chart visual style.
 * Used by:
 * - Individual CCI artifact
 * - Circle CCI artifact (per-member charts)
 * - Circle CCI app screen (brief.tsx)
 *
 * Visual Style:
 * - 6 downsampled data points
 * - Smooth Bezier curves with area fill
 * - Multi-layer node markers
 * - H/M/L zone indicators
 * - Oct/Nov/Dec x-axis labels
 * - Dark background with colored zones
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/** Chart dimensions (matches Individual CCI artifact golden master) */
export const SUMMARY_CHART = {
  width: 320,
  height: 140,
  padding: { left: 32, right: 8, top: 8, bottom: 24 },
  graphWidth: 280,  // 320 - 32 - 8
  graphHeight: 108, // 140 - 8 - 24
  bandHeight: 36,   // 108 / 3
} as const;

/** X positions for 6 data points (evenly distributed across graph area) */
const DATA_POINT_X = [40, 80, 128, 188, 248, 300] as const;

/** Colors for capacity zones */
export const CAPACITY_COLORS = {
  resourced: '#00E5FF',  // Cyan - High
  stretched: '#E8A830',  // Amber - Medium
  depleted: '#F44336',   // Red - Low
  background: '#0a0b10',
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get capacity color based on 0-100 scale value.
 * Thresholds: 66+ = resourced, 33-66 = stretched, <33 = depleted
 */
export function getCapacityColor(value: number): string {
  if (value >= 66) return CAPACITY_COLORS.resourced;
  if (value >= 33) return CAPACITY_COLORS.stretched;
  return CAPACITY_COLORS.depleted;
}

/**
 * Convert 0-100 value to Y coordinate in chart space.
 * 100 = top (y=8), 0 = bottom (y=116)
 */
function valueToY(value: number): number {
  const { padding, graphHeight } = SUMMARY_CHART;
  const normalized = value / 100; // 0 to 1
  return padding.top + graphHeight - (normalized * graphHeight);
}

/**
 * Detect if data has volatile (alternating) pattern.
 * Used to preserve zigzag shapes when downsampling.
 */
function isVolatilePattern(data: number[]): boolean {
  if (data.length < 10) return false;

  let directionChanges = 0;
  let prevDirection = 0;

  for (let i = 1; i < Math.min(data.length, 30); i++) {
    const diff = data[i] - data[i - 1];
    const direction = diff > 5 ? 1 : diff < -5 ? -1 : 0;

    if (direction !== 0 && direction !== prevDirection && prevDirection !== 0) {
      directionChanges++;
    }
    if (direction !== 0) prevDirection = direction;
  }

  return directionChanges > 8;
}

/**
 * Sample peaks and valleys for volatile data patterns.
 * Preserves the oscillating shape when downsampling.
 */
function samplePeaksAndValleys(data: number[], targetPoints: number): number[] {
  if (data.length <= targetPoints) return data;

  // Find all local peaks and valleys
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

  // Always include first and last
  const result: number[] = [data[0]];

  // Sample alternating peaks and valleys
  let lastWasPeak = data[0] > data[Math.min(5, data.length - 1)];
  const middlePoints = targetPoints - 2;
  const step = extrema.length / middlePoints;

  for (let i = 0; i < middlePoints && extrema.length > 0; i++) {
    // Find next extremum of opposite type
    const targetType = !lastWasPeak;
    let found = false;

    for (let j = 0; j < extrema.length; j++) {
      if (extrema[j].isPeak === targetType) {
        result.push(extrema[j].value);
        extrema.splice(0, j + 1);
        lastWasPeak = targetType;
        found = true;
        break;
      }
    }

    if (!found && extrema.length > 0) {
      result.push(extrema[0].value);
      extrema.shift();
    }
  }

  result.push(data[data.length - 1]);

  // Ensure exactly targetPoints
  while (result.length < targetPoints) {
    result.splice(result.length - 1, 0, result[result.length - 2]);
  }
  while (result.length > targetPoints) {
    result.splice(Math.floor(result.length / 2), 1);
  }

  return result;
}

/**
 * Downsample 90-day data to 6 representative points.
 * Uses peak-valley sampling for volatile patterns to preserve shape.
 */
export function downsampleTo6Points(data: number[], targetPoints: number = 6): number[] {
  if (data.length <= targetPoints) return data;

  // Use peak-valley sampling for volatile patterns
  if (isVolatilePattern(data)) {
    return samplePeaksAndValleys(data, targetPoints);
  }

  // Standard downsampling for stable patterns
  const result: number[] = [];
  const step = (data.length - 1) / (targetPoints - 1);

  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.round(i * step);
    result.push(data[idx]);
  }

  return result;
}

// =============================================================================
// SVG PATH GENERATION
// =============================================================================

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  color: string;
}

/**
 * Convert 6 values to chart coordinates with colors.
 */
function valuesToPoints(values: number[]): ChartPoint[] {
  return values.map((value, i) => ({
    x: DATA_POINT_X[i],
    y: valueToY(value),
    value,
    color: getCapacityColor(value),
  }));
}

/**
 * Generate smooth Bezier curve path through points.
 * Uses monotone cubic interpolation for natural-looking curves.
 */
function generateBezierPath(points: ChartPoint[]): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const dx = p2.x - p1.x;

    // Control points at 30% with slope-based Y adjustment
    const cp1x = p1.x + dx * 0.3;
    const cp1y = p1.y + (p2.y - p0.y) * 0.15;
    const cp2x = p2.x - dx * 0.3;
    const cp2y = p2.y - (p3.y - p1.y) * 0.15;

    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y.toFixed(1)}`;
  }

  return path;
}

/**
 * Generate area fill path (closes curve to bottom of chart).
 */
function generateAreaPath(points: ChartPoint[]): string {
  const linePath = generateBezierPath(points);
  if (!linePath) return '';

  const { padding, graphHeight } = SUMMARY_CHART;
  const bottomY = padding.top + graphHeight;

  return `${linePath} L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`;
}

/**
 * Generate multi-layer node markers SVG.
 * Each node has: outer dark ring (r=5), colored core (r=3.5), white center (r=1.5)
 */
function generateNodesSVG(points: ChartPoint[]): string {
  return points.map(p => `
            <!-- Node at ${p.value.toFixed(0)}% -->
            <circle cx="${p.x}" cy="${p.y.toFixed(1)}" r="5" fill="${CAPACITY_COLORS.background}"/>
            <circle cx="${p.x}" cy="${p.y.toFixed(1)}" r="3.5" fill="${p.color}"/>
            <circle cx="${p.x}" cy="${p.y.toFixed(1)}" r="1.5" fill="white" fill-opacity="0.9"/>`).join('');
}

// =============================================================================
// MAIN RENDER FUNCTION
// =============================================================================

export interface SummaryChartOptions {
  /** Include gradient definitions (needed for first chart only) */
  includeGradientDefs?: boolean;
  /** Unique ID prefix for gradients (to avoid conflicts with multiple charts) */
  gradientId?: string;
}

/**
 * Render complete summary chart SVG string.
 * Matches the Individual CCI artifact visual style exactly.
 */
export function renderSummaryChartSVG(
  values: number[],
  options: SummaryChartOptions = {}
): string {
  const { includeGradientDefs = true, gradientId = 'chart' } = options;
  const { width, height, bandHeight, padding, graphHeight } = SUMMARY_CHART;

  // Downsample to 6 points
  const downsampled = downsampleTo6Points(values, 6);
  const points = valuesToPoints(downsampled);

  // Generate paths
  const curvePath = generateBezierPath(points);
  const areaPath = generateAreaPath(points);
  const nodesSVG = generateNodesSVG(points);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <!-- Zone backgrounds -->
          <rect x="${padding.left}" y="${padding.top}" width="280" height="${bandHeight}" fill="${CAPACITY_COLORS.resourced}" fill-opacity="0.06"/>
          <rect x="${padding.left}" y="${padding.top + bandHeight}" width="280" height="${bandHeight}" fill="${CAPACITY_COLORS.stretched}" fill-opacity="0.04"/>
          <rect x="${padding.left}" y="${padding.top + bandHeight * 2}" width="280" height="${bandHeight}" fill="${CAPACITY_COLORS.depleted}" fill-opacity="0.06"/>

          <!-- Zone divider lines (dashed) -->
          <line x1="${padding.left}" y1="${padding.top + bandHeight}" x2="312" y2="${padding.top + bandHeight}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 3"/>
          <line x1="${padding.left}" y1="${padding.top + bandHeight * 2}" x2="312" y2="${padding.top + bandHeight * 2}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 3"/>

          <!-- Borders -->
          <line x1="${padding.left}" y1="${padding.top}" x2="312" y2="${padding.top}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
          <line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="312" y2="${padding.top + graphHeight}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
          <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>

          <!-- H/M/L zone indicators (left side) -->
          <circle cx="16" cy="${padding.top + bandHeight / 2}" r="4" fill="${CAPACITY_COLORS.resourced}" fill-opacity="0.9"/>
          <circle cx="16" cy="${padding.top + bandHeight * 1.5}" r="4" fill="${CAPACITY_COLORS.stretched}" fill-opacity="0.9"/>
          <circle cx="16" cy="${padding.top + bandHeight * 2.5}" r="4" fill="${CAPACITY_COLORS.depleted}" fill-opacity="0.9"/>

          <!-- H/M/L labels -->
          <text x="6" y="${padding.top + bandHeight / 2 + 3}" font-size="7" fill="${CAPACITY_COLORS.resourced}" font-family="Inter, sans-serif" font-weight="600">H</text>
          <text x="6" y="${padding.top + bandHeight * 1.5 + 3}" font-size="7" fill="${CAPACITY_COLORS.stretched}" font-family="Inter, sans-serif" font-weight="600">M</text>
          <text x="6" y="${padding.top + bandHeight * 2.5 + 3}" font-size="7" fill="${CAPACITY_COLORS.depleted}" font-family="Inter, sans-serif" font-weight="600">L</text>

          <!-- Gradient definitions -->${includeGradientDefs ? `
          <defs>
            <linearGradient id="${gradientId}AreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${CAPACITY_COLORS.resourced}" stop-opacity="0.20"/>
              <stop offset="50%" stop-color="${CAPACITY_COLORS.stretched}" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="${CAPACITY_COLORS.depleted}" stop-opacity="0.20"/>
            </linearGradient>
            <linearGradient id="${gradientId}LineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${CAPACITY_COLORS.resourced}"/>
              <stop offset="50%" stop-color="${CAPACITY_COLORS.stretched}"/>
              <stop offset="100%" stop-color="${CAPACITY_COLORS.depleted}"/>
            </linearGradient>
          </defs>` : ''}

          <!-- Area fill under curve -->
          <path d="${areaPath}" fill="url(#${gradientId}AreaGrad)"/>

          <!-- Under-stroke (dark shadow) -->
          <path d="${curvePath}" stroke="${CAPACITY_COLORS.background}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

          <!-- Main gradient stroke -->
          <path d="${curvePath}" stroke="url(#${gradientId}LineGrad)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

          <!-- Data point nodes (multi-layer) -->
          <g class="data-nodes">${nodesSVG}
          </g>

          <!-- X-axis labels -->
          <text x="70" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Oct</text>
          <text x="170" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Nov</text>
          <text x="270" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Dec</text>
        </svg>`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { SUMMARY_CHART as CHART_DIMENSIONS };
