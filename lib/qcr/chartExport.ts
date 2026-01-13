/**
 * QCR Chart Export Utility
 *
 * Generates pure SVG strings matching the in-app EnergyGraph component.
 * Used for embedding charts in Clinical Capacity Instrument PDFs.
 *
 * Colors match EXACTLY:
 * - Resourced (High):  #00E5FF (Cyan)
 * - Stretched (Mod):   #E8A830 (Amber)
 * - Depleted (Low):    #F44336 (Red)
 */

import { CapacityLog, CapacityState } from '../../types';

// =============================================================================
// CONSTANTS - Match EnergyGraph.tsx exactly
// =============================================================================

const CHART_COLORS = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
} as const;

// Zone band fills (subtle, matching app)
const ZONE_FILLS = {
  high: 'rgba(0, 229, 255, 0.04)',
  moderate: 'rgba(232, 168, 48, 0.03)',
  low: 'rgba(244, 67, 54, 0.04)',
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface ChartExportOptions {
  /** Width of exported chart */
  width: number;
  /** Height of exported chart */
  height: number;
  /** Time range in days */
  timeRangeDays: number;
  /** Background color (default: transparent for PDF) */
  backgroundColor?: string;
  /** Show data points (default: true if <= 50 points) */
  showDataPoints?: boolean;
  /** Show zone labels (default: true) */
  showZoneLabels?: boolean;
  /** Show date labels (default: true) */
  showDateLabels?: boolean;
}

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  date: Date;
}

// =============================================================================
// HELPERS
// =============================================================================

const stateToValue = (state: CapacityState): number => {
  switch (state) {
    case 'resourced': return 0;
    case 'stretched': return 0.5;
    case 'depleted': return 1;
  }
};

const getColorForValue = (value: number): string => {
  if (value <= 0.25) return CHART_COLORS.resourced;
  if (value >= 0.75) return CHART_COLORS.depleted;
  return CHART_COLORS.stretched;
};

const getBucketSize = (days: number): number => {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  if (days <= 7) return 6 * hour;
  if (days <= 14) return 12 * hour;
  if (days <= 30) return day;
  if (days <= 90) return 3 * day;
  if (days <= 365) return 7 * day;
  if (days <= 730) return 14 * day;
  if (days <= 1825) return 30 * day;
  return 60 * day;
};

const formatDateLabel = (date: Date, days: number): string => {
  if (days <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else if (days <= 30) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (days <= 90) {
    return date.toLocaleDateString('en-US', { month: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
};

const getDateLabelCount = (days: number): number => {
  if (days <= 7) return 7;
  if (days <= 14) return 5;
  if (days <= 30) return 4;
  if (days <= 90) return 3;
  return 5;
};

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Generate SVG string for capacity chart matching EnergyGraph component exactly.
 */
export function generateChartSVG(
  logs: CapacityLog[],
  options: ChartExportOptions
): string {
  const {
    width,
    height,
    timeRangeDays,
    backgroundColor = 'transparent',
    showDataPoints = true,
    showZoneLabels = true,
    showDateLabels = true,
  } = options;

  // Padding (match EnergyGraph)
  const paddingTop = 32;
  const paddingBottom = 32;
  const paddingLeft = showZoneLabels ? 40 : 16;
  const paddingRight = 16;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;
  const zoneHeight = graphHeight / 3;

  // Time range calculation
  const now = Date.now();
  const rangeMs = timeRangeDays * 24 * 60 * 60 * 1000;
  const startTime = now - rangeMs;
  const bucketSize = getBucketSize(timeRangeDays);

  // Filter and bucket logs
  const filteredLogs = logs.filter((log) => log.timestamp >= startTime);
  const buckets: Map<number, { sum: number; count: number }> = new Map();

  filteredLogs.forEach((log) => {
    const bucketIndex = Math.floor((log.timestamp - startTime) / bucketSize);
    const value = stateToValue(log.state);

    if (buckets.has(bucketIndex)) {
      const bucket = buckets.get(bucketIndex)!;
      bucket.sum += value;
      bucket.count += 1;
    } else {
      buckets.set(bucketIndex, { sum: value, count: 1 });
    }
  });

  // Convert to points
  const numBuckets = Math.ceil(rangeMs / bucketSize);
  const sortedIndices = Array.from(buckets.keys()).sort((a, b) => a - b);

  const points: ChartPoint[] = sortedIndices.map((bucketIndex) => {
    const bucket = buckets.get(bucketIndex)!;
    const avgValue = bucket.sum / bucket.count;
    const x = paddingLeft + (bucketIndex / numBuckets) * graphWidth;
    const y = paddingTop + avgValue * graphHeight;
    const date = new Date(startTime + bucketIndex * bucketSize);
    return { x, y, value: avgValue, date };
  });

  // Generate bezier path (matching EnergyGraph smoothing)
  let pathData = '';
  if (points.length > 1) {
    pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const cp1x = current.x + (next.x - current.x) * 0.4;
      const cp2x = current.x + (next.x - current.x) * 0.6;
      pathData += ` C ${cp1x} ${current.y}, ${cp2x} ${next.y}, ${next.x} ${next.y}`;
    }
  } else if (points.length === 1) {
    pathData = `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`;
  }

  // Area fill path
  let areaPath = '';
  if (points.length > 0) {
    areaPath = pathData +
      ` L ${points[points.length - 1].x} ${paddingTop + graphHeight}` +
      ` L ${points[0].x} ${paddingTop + graphHeight} Z`;
  }

  // Date labels
  const labelCount = getDateLabelCount(timeRangeDays);
  const dateLabels: { x: number; label: string }[] = [];
  for (let i = 0; i < labelCount; i++) {
    const labelTime = startTime + (i / (labelCount - 1)) * rangeMs;
    const x = paddingLeft + (i / (labelCount - 1)) * graphWidth;
    dateLabels.push({
      x,
      label: formatDateLabel(new Date(labelTime), timeRangeDays),
    });
  }

  // Build SVG
  const svgParts: string[] = [];

  // SVG header
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

  // Defs (gradients)
  svgParts.push(`
  <defs>
    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${CHART_COLORS.resourced}"/>
      <stop offset="50%" stop-color="${CHART_COLORS.stretched}"/>
      <stop offset="100%" stop-color="${CHART_COLORS.depleted}"/>
    </linearGradient>
    <linearGradient id="areaFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${CHART_COLORS.resourced}" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="${CHART_COLORS.stretched}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${CHART_COLORS.depleted}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>`);

  // Background
  if (backgroundColor !== 'transparent') {
    svgParts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"/>`);
  }

  // Zone backgrounds
  svgParts.push(`
  <rect x="${paddingLeft}" y="${paddingTop}" width="${graphWidth}" height="${zoneHeight}" fill="${ZONE_FILLS.high}"/>
  <rect x="${paddingLeft}" y="${paddingTop + zoneHeight}" width="${graphWidth}" height="${zoneHeight}" fill="${ZONE_FILLS.moderate}"/>
  <rect x="${paddingLeft}" y="${paddingTop + 2 * zoneHeight}" width="${graphWidth}" height="${zoneHeight}" fill="${ZONE_FILLS.low}"/>`);

  // Zone divider lines
  svgParts.push(`
  <line x1="${paddingLeft}" y1="${paddingTop + zoneHeight}" x2="${width - paddingRight}" y2="${paddingTop + zoneHeight}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4 4"/>
  <line x1="${paddingLeft}" y1="${paddingTop + 2 * zoneHeight}" x2="${width - paddingRight}" y2="${paddingTop + 2 * zoneHeight}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4 4"/>`);

  // Border lines
  svgParts.push(`
  <line x1="${paddingLeft}" y1="${paddingTop}" x2="${width - paddingRight}" y2="${paddingTop}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="${paddingLeft}" y1="${paddingTop + graphHeight}" x2="${width - paddingRight}" y2="${paddingTop + graphHeight}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + graphHeight}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`);

  // Zone labels (colored circles)
  if (showZoneLabels) {
    svgParts.push(`
  <circle cx="14" cy="${paddingTop + zoneHeight / 2}" r="4" fill="${CHART_COLORS.resourced}" opacity="0.8"/>
  <circle cx="14" cy="${paddingTop + zoneHeight + zoneHeight / 2}" r="4" fill="${CHART_COLORS.stretched}" opacity="0.8"/>
  <circle cx="14" cy="${paddingTop + 2 * zoneHeight + zoneHeight / 2}" r="4" fill="${CHART_COLORS.depleted}" opacity="0.8"/>`);
  }

  // Data content
  if (points.length === 0) {
    // Empty state
    svgParts.push(`
  <line x1="${paddingLeft}" y1="${paddingTop + graphHeight / 2}" x2="${width - paddingRight}" y2="${paddingTop + graphHeight / 2}" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="8 8"/>
  <text x="${width / 2}" y="${paddingTop + graphHeight / 2 - 10}" font-size="11" fill="rgba(255,255,255,0.3)" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">No data for this period</text>`);
  } else {
    // Area fill
    if (areaPath) {
      svgParts.push(`<path d="${areaPath}" fill="url(#areaFill)"/>`);
    }

    // Main data line
    if (pathData) {
      svgParts.push(`<path d="${pathData}" stroke="url(#lineGradient)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }

    // Data points (if not too many)
    if (showDataPoints && points.length <= 50) {
      points.forEach((point) => {
        const color = getColorForValue(point.value);
        svgParts.push(`
  <circle cx="${point.x}" cy="${point.y}" r="4" fill="${color}"/>
  <circle cx="${point.x}" cy="${point.y}" r="2" fill="white" opacity="0.9"/>`);
      });
    }
  }

  // Date labels
  if (showDateLabels) {
    dateLabels.forEach((label) => {
      svgParts.push(`<text x="${label.x}" y="${height - 12}" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${label.label}</text>`);
    });
  }

  svgParts.push('</svg>');

  return svgParts.join('\n');
}

/**
 * Generate chart SVG for QCR PDF (90-day view, clinical styling).
 * This is the primary export function for Clinical Capacity Instruments.
 */
export function generateQCRChartSVG(
  logs: CapacityLog[],
  options?: Partial<ChartExportOptions>
): string {
  return generateChartSVG(logs, {
    width: 400,
    height: 180,
    timeRangeDays: 90,
    backgroundColor: 'transparent',
    showDataPoints: true,
    showZoneLabels: true,
    showDateLabels: true,
    ...options,
  });
}

/**
 * Generate chart for dark background (app-style, for dev preview).
 */
export function generateAppStyleChartSVG(
  logs: CapacityLog[],
  timeRangeDays: number = 90
): string {
  return generateChartSVG(logs, {
    width: 380,
    height: 200,
    timeRangeDays,
    backgroundColor: '#0A0B10',
    showDataPoints: true,
    showZoneLabels: true,
    showDateLabels: true,
  });
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export { CHART_COLORS, ZONE_FILLS };
