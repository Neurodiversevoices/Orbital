/**
 * Bundle CCI PDF Export Script
 *
 * Generates PDF for Bundle CCI artifact using the same HTML generator
 * as lib/cci/bundleArtifact.ts
 *
 * Usage:
 *   node scripts/bundle-cci-export-pdf.js [seat-count] [output-path]
 *
 * Examples:
 *   node scripts/bundle-cci-export-pdf.js 10
 *   node scripts/bundle-cci-export-pdf.js 15 output/bundle-15.pdf
 *   node scripts/bundle-cci-export-pdf.js 20 output/bundle-20.pdf
 *
 * Default: 10 seats, outputs to output/bundle-cci-10.pdf
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// =============================================================================
// CONSTANTS (from lib/cci/summaryChart.ts - Single Source of Truth)
// =============================================================================

const CAPACITY_COLORS = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
  background: '#0a0b10',
};

const SUMMARY_CHART = {
  width: 320,
  height: 140,
  padding: { left: 32, right: 8, top: 8, bottom: 24 },
  graphWidth: 280,
  graphHeight: 108,
  bandHeight: 36,
};

const DATA_POINT_X = [40, 80, 128, 188, 248, 300];

// =============================================================================
// CHART RENDERING (from lib/cci/summaryChart.ts)
// =============================================================================

function getCapacityColor(value) {
  if (value >= 66) return CAPACITY_COLORS.resourced;
  if (value >= 33) return CAPACITY_COLORS.stretched;
  return CAPACITY_COLORS.depleted;
}

function valueToY(value) {
  const { padding, graphHeight } = SUMMARY_CHART;
  const normalized = value / 100;
  return padding.top + graphHeight - (normalized * graphHeight);
}

function isVolatilePattern(data) {
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

function samplePeaksAndValleys(data, targetPoints) {
  if (data.length <= targetPoints) return data;
  const extrema = [];
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
  const result = [data[0]];
  let lastWasPeak = data[0] > data[Math.min(5, data.length - 1)];
  const middlePoints = targetPoints - 2;
  for (let i = 0; i < middlePoints && extrema.length > 0; i++) {
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
  while (result.length < targetPoints) {
    result.splice(result.length - 1, 0, result[result.length - 2]);
  }
  while (result.length > targetPoints) {
    result.splice(Math.floor(result.length / 2), 1);
  }
  return result;
}

function downsampleTo6Points(data, targetPoints = 6) {
  if (data.length <= targetPoints) return data;
  if (isVolatilePattern(data)) {
    return samplePeaksAndValleys(data, targetPoints);
  }
  const result = [];
  const step = (data.length - 1) / (targetPoints - 1);
  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.round(i * step);
    result.push(data[idx]);
  }
  return result;
}

function valuesToPoints(values) {
  return values.map((value, i) => ({
    x: DATA_POINT_X[i],
    y: valueToY(value),
    value,
    color: getCapacityColor(value),
  }));
}

function generateBezierPath(points) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const dx = p2.x - p1.x;
    const cp1x = p1.x + dx * 0.3;
    const cp1y = p1.y + (p2.y - p0.y) * 0.15;
    const cp2x = p2.x - dx * 0.3;
    const cp2y = p2.y - (p3.y - p1.y) * 0.15;
    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y.toFixed(1)}`;
  }
  return path;
}

function generateAreaPath(points) {
  const linePath = generateBezierPath(points);
  if (!linePath) return '';
  const { padding, graphHeight } = SUMMARY_CHART;
  const bottomY = padding.top + graphHeight;
  return `${linePath} L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`;
}

function generateNodesSVG(points) {
  return points.map(p => `
    <circle cx="${p.x}" cy="${p.y.toFixed(1)}" r="5" fill="${CAPACITY_COLORS.background}"/>
    <circle cx="${p.x}" cy="${p.y.toFixed(1)}" r="3.5" fill="${p.color}"/>
    <circle cx="${p.x}" cy="${p.y.toFixed(1)}" r="1.5" fill="white" fill-opacity="0.9"/>`).join('');
}

function renderSummaryChartSVG(values, options = {}) {
  const { includeGradientDefs = true, gradientId = 'chart' } = options;
  const { width, height, bandHeight, padding, graphHeight } = SUMMARY_CHART;
  const downsampled = downsampleTo6Points(values, 6);
  const points = valuesToPoints(downsampled);
  const curvePath = generateBezierPath(points);
  const areaPath = generateAreaPath(points);
  const nodesSVG = generateNodesSVG(points);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="${padding.left}" y="${padding.top}" width="280" height="${bandHeight}" fill="${CAPACITY_COLORS.resourced}" fill-opacity="0.06"/>
    <rect x="${padding.left}" y="${padding.top + bandHeight}" width="280" height="${bandHeight}" fill="${CAPACITY_COLORS.stretched}" fill-opacity="0.04"/>
    <rect x="${padding.left}" y="${padding.top + bandHeight * 2}" width="280" height="${bandHeight}" fill="${CAPACITY_COLORS.depleted}" fill-opacity="0.06"/>
    <line x1="${padding.left}" y1="${padding.top + bandHeight}" x2="312" y2="${padding.top + bandHeight}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="${padding.left}" y1="${padding.top + bandHeight * 2}" x2="312" y2="${padding.top + bandHeight * 2}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="${padding.left}" y1="${padding.top}" x2="312" y2="${padding.top}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <line x1="${padding.left}" y1="${padding.top + graphHeight}" x2="312" y2="${padding.top + graphHeight}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + graphHeight}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <circle cx="16" cy="${padding.top + bandHeight / 2}" r="4" fill="${CAPACITY_COLORS.resourced}" fill-opacity="0.9"/>
    <circle cx="16" cy="${padding.top + bandHeight * 1.5}" r="4" fill="${CAPACITY_COLORS.stretched}" fill-opacity="0.9"/>
    <circle cx="16" cy="${padding.top + bandHeight * 2.5}" r="4" fill="${CAPACITY_COLORS.depleted}" fill-opacity="0.9"/>
    <text x="6" y="${padding.top + bandHeight / 2 + 3}" font-size="7" fill="${CAPACITY_COLORS.resourced}" font-family="Inter, sans-serif" font-weight="600">H</text>
    <text x="6" y="${padding.top + bandHeight * 1.5 + 3}" font-size="7" fill="${CAPACITY_COLORS.stretched}" font-family="Inter, sans-serif" font-weight="600">M</text>
    <text x="6" y="${padding.top + bandHeight * 2.5 + 3}" font-size="7" fill="${CAPACITY_COLORS.depleted}" font-family="Inter, sans-serif" font-weight="600">L</text>
    ${includeGradientDefs ? `<defs>
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
    <path d="${areaPath}" fill="url(#${gradientId}AreaGrad)"/>
    <path d="${curvePath}" stroke="${CAPACITY_COLORS.background}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${curvePath}" stroke="url(#${gradientId}LineGrad)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="data-nodes">${nodesSVG}</g>
    <text x="70" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Oct</text>
    <text x="170" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Nov</text>
    <text x="270" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Dec</text>
  </svg>`;
}

// =============================================================================
// SEAT DATA GENERATION (from lib/cci/bundleDemoData.ts)
// =============================================================================

const AVATAR_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#A855F7', '#6366F1', '#14B8A6', '#FBBF24', '#F87171',
  '#C084FC', '#818CF8', '#2DD4BF', '#FCD34D', '#FCA5A5',
];

function generateCapacityHistory() {
  const history = [];
  let current = 30 + Math.random() * 50;
  for (let i = 0; i < 90; i++) {
    const trend = Math.sin(i / 15) * 10;
    const noise = (Math.random() - 0.5) * 15;
    current = Math.max(10, Math.min(95, current + trend * 0.1 + noise * 0.3));
    history.push(Math.round(current));
  }
  return history;
}

function generateBundleSeatData(seatCount) {
  const seats = [];
  for (let i = 0; i < seatCount; i++) {
    seats.push({
      id: `seat-${i}`,
      seatIndex: i,
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      capacityHistory: generateCapacityHistory(),
    });
  }
  return seats;
}

function getSeatCapacityState(seat) {
  const current = seat.capacityHistory[seat.capacityHistory.length - 1];
  if (current >= 66) return 'resourced';
  if (current >= 33) return 'stretched';
  return 'depleted';
}

function calculateAggregateCapacity(seats) {
  const historyLength = seats[0].capacityHistory.length;
  const aggregate = [];
  for (let i = 0; i < historyLength; i++) {
    const sum = seats.reduce((acc, seat) => acc + seat.capacityHistory[i], 0);
    aggregate.push(Math.round(sum / seats.length));
  }
  return aggregate;
}

function getBundleStats(seats) {
  let resourcedCount = 0;
  let stretchedCount = 0;
  let depletedCount = 0;
  let totalCapacity = 0;

  seats.forEach(seat => {
    const state = getSeatCapacityState(seat);
    if (state === 'resourced') resourcedCount++;
    else if (state === 'stretched') stretchedCount++;
    else depletedCount++;
    totalCapacity += seat.capacityHistory[seat.capacityHistory.length - 1];
  });

  return {
    resourcedCount,
    stretchedCount,
    depletedCount,
    averageCapacity: Math.round(totalCapacity / seats.length),
  };
}

// =============================================================================
// BUNDLE ARTIFACT HTML GENERATOR
// =============================================================================

function formatUTCTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

function generateAvatarSVG(seat, size = 24) {
  const state = getSeatCapacityState(seat);
  const ringColor = CAPACITY_COLORS[state];
  const borderWidth = 2;
  const innerRadius = (size / 2) - borderWidth;
  const cx = size / 2;
  const cy = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${size/2 - 1}" fill="none" stroke="${ringColor}" stroke-width="${borderWidth}"/>
    <circle cx="${cx}" cy="${cy}" r="${innerRadius - 1}" fill="${seat.avatarColor}"/>
    <circle cx="${cx}" cy="${cy}" r="${size * 0.1}" fill="rgba(255,255,255,0.4)"/>
  </svg>`;
}

function generateBundleCCIArtifactHTML(seatCount) {
  const now = new Date();
  const timestamp = formatUTCTimestamp(now);
  const hash = 'sha256:b7d3f9a81c2e4b6f...e91c2d8a4';

  const seats = generateBundleSeatData(seatCount);
  const stats = getBundleStats(seats);
  const aggregateHistory = calculateAggregateCapacity(seats);
  const aggregateChart = renderSummaryChartSVG(aggregateHistory, { gradientId: 'aggregate' });

  // Generate mini chart cards (5 per row)
  const seatsPerRow = 5;
  const rows = [];
  for (let i = 0; i < seats.length; i += seatsPerRow) {
    const rowSeats = seats.slice(i, i + seatsPerRow);
    const rowHTML = rowSeats.map((seat) => {
      const state = getSeatCapacityState(seat);
      const stateColor = CAPACITY_COLORS[state];
      const chart = renderSummaryChartSVG(seat.capacityHistory, { gradientId: seat.id });
      const avatar = generateAvatarSVG(seat, 18);

      return `
        <div class="mini-chart-card">
          <div class="mini-chart-header">
            <div class="avatar-wrap">${avatar}</div>
            <div class="state-indicator" style="background-color: ${stateColor}"></div>
          </div>
          <div class="mini-chart-container">${chart}</div>
        </div>`;
    }).join('');

    rows.push(`<div class="grid-row">${rowHTML}</div>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bundle Capacity Instrument</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @page { size: 612px 792px; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 612px; min-height: 792px; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px; line-height: 1.5; color: #fff;
      background: ${CAPACITY_COLORS.background};
      -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    }
    .page {
      width: 612px; min-height: 792px; padding: 20px 24px;
      background: ${CAPACITY_COLORS.background}; position: relative;
    }
    .artifact-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.95); margin-bottom: 4px; }
    .artifact-subtitle { font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
    .bundle-badge {
      display: inline-block; background: rgba(156,39,176,0.15); color: #9C27B0;
      padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;
      margin-left: 8px; border: 1px solid rgba(156,39,176,0.3);
    }
    .chain-of-custody {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px; padding: 8px 10px; margin-bottom: 10px;
    }
    .coc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 16px; }
    .coc-line { font-size: 8px; line-height: 1.4; }
    .coc-label { font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; font-size: 7px; }
    .coc-value { color: rgba(255,255,255,0.8); }
    .coc-value-mono { font-family: 'JetBrains Mono', monospace; font-size: 7px; color: rgba(255,255,255,0.7); }
    .coc-status { font-weight: 700; color: #9C27B0; }
    .stats-row {
      display: flex; justify-content: space-around; gap: 8px;
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px; padding: 10px 12px; margin-bottom: 12px;
    }
    .stat-item { text-align: center; }
    .stat-dot { width: 10px; height: 10px; border-radius: 50%; margin: 0 auto 4px auto; }
    .stat-dot-resourced { background: ${CAPACITY_COLORS.resourced}; }
    .stat-dot-stretched { background: ${CAPACITY_COLORS.stretched}; }
    .stat-dot-depleted { background: ${CAPACITY_COLORS.depleted}; }
    .stat-value { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9); }
    .stat-value-avg { color: #9C27B0; }
    .stat-label { font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
    .section-header { margin-bottom: 8px; }
    .section-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9); }
    .section-subtitle { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; }
    .grid-container { margin-bottom: 10px; }
    .grid-row { display: flex; gap: 6px; margin-bottom: 6px; }
    .mini-chart-card {
      flex: 1; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 6px;
    }
    .mini-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .avatar-wrap { flex-shrink: 0; }
    .avatar-wrap svg { display: block; }
    .state-indicator { width: 6px; height: 6px; border-radius: 3px; }
    .mini-chart-container { background: ${CAPACITY_COLORS.background}; border-radius: 3px; overflow: hidden; }
    .mini-chart-container svg { width: 100%; height: auto; display: block; }
    .aggregate-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); }
    .aggregate-chart-container { text-align: center; margin-bottom: 10px; }
    .aggregate-chart-container svg { width: 100%; max-width: 320px; height: auto; }
    .footer-section { margin-top: auto; padding-top: 8px; }
    .legal-block {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px; padding: 8px 10px;
    }
    .legal-title { font-size: 7px; font-weight: 700; color: rgba(255,255,255,0.5); margin-bottom: 3px; text-transform: uppercase; }
    .legal-body { font-size: 7px; line-height: 1.5; color: rgba(255,255,255,0.4); }
    .legal-rights { font-size: 7px; font-weight: 700; color: rgba(255,255,255,0.5); margin-top: 4px; text-transform: uppercase; }
    .privacy-notice {
      font-size: 9px; color: #9C27B0; font-weight: 600;
      background: rgba(156,39,176,0.1); border: 1px solid rgba(156,39,176,0.2);
      border-radius: 4px; padding: 6px 8px; margin-bottom: 10px;
    }
    @media print {
      .page { border: none; }
      .mini-chart-container, .aggregate-chart-container, svg rect, svg circle, svg path, svg line {
        print-color-adjust: exact; -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="artifact-title">${seatCount} Seats<span class="bundle-badge">BUNDLE</span></div>
  <div class="artifact-subtitle">Anonymous seat-level capacity view</div>

  <div class="chain-of-custody">
    <div class="coc-grid">
      <div class="coc-line"><span class="coc-label">Generated:</span> <span class="coc-value-mono">${timestamp}</span></div>
      <div class="coc-line"><span class="coc-label">Protocol:</span> <span class="coc-value">Structured EMA v4.2</span></div>
      <div class="coc-line"><span class="coc-label">Bundle ID:</span> <span class="coc-value">BND-${seatCount}-2025-Q4</span></div>
      <div class="coc-line"><span class="coc-label">Status:</span> <span class="coc-status">IMMUTABLE SNAPSHOT</span></div>
      <div class="coc-line" style="grid-column: span 2;"><span class="coc-label">Integrity Hash:</span> <span class="coc-value-mono">${hash}</span></div>
    </div>
  </div>

  <div class="privacy-notice">Privacy first: avatars only, no individual attribution</div>

  <div class="stats-row">
    <div class="stat-item"><div class="stat-dot stat-dot-resourced"></div><div class="stat-value">${stats.resourcedCount}</div><div class="stat-label">Resourced</div></div>
    <div class="stat-item"><div class="stat-dot stat-dot-stretched"></div><div class="stat-value">${stats.stretchedCount}</div><div class="stat-label">Stretched</div></div>
    <div class="stat-item"><div class="stat-dot stat-dot-depleted"></div><div class="stat-value">${stats.depletedCount}</div><div class="stat-label">Depleted</div></div>
    <div class="stat-item"><div class="stat-value stat-value-avg">${stats.averageCapacity}%</div><div class="stat-label">Avg</div></div>
  </div>

  <div class="section-header">
    <div class="section-title">${seatCount} Seats</div>
    <div class="section-subtitle">Individual capacity · 90 days · Non-diagnostic</div>
  </div>
  <div class="grid-container">
    ${rows.join('\n')}
  </div>

  <div class="aggregate-section">
    <div class="section-header">
      <div class="section-title">Combined Aggregate</div>
      <div class="section-subtitle">Average capacity across all ${seatCount} seats</div>
    </div>
    <div class="aggregate-chart-container">${aggregateChart}</div>
  </div>

  <div class="footer-section">
    <div class="legal-block">
      <div class="legal-title">Confidential &amp; Proprietary Notice</div>
      <div class="legal-body">This Bundle Capacity Instrument contains ANONYMIZED aggregate data only. Individual seat holders are NOT identified. This is NOT a diagnostic tool. For coordination purposes only.</div>
      <div class="legal-rights">© 2026 Orbital Health Intelligence, Inc. All Rights Reserved.</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// =============================================================================
// PDF EXPORT
// =============================================================================

async function exportBundleCCIPDF(seatCount, outputPath) {
  console.log('=== BUNDLE CCI PDF EXPORT ===\n');
  console.log('Seat Count:', seatCount);

  // Generate HTML
  console.log('Generating Bundle CCI HTML...');
  const html = generateBundleCCIArtifactHTML(seatCount);

  // Write HTML to temp file
  const tempHtmlPath = path.join(__dirname, '..', 'output', `bundle-cci-${seatCount}-temp.html`);
  fs.writeFileSync(tempHtmlPath, html);
  console.log('Temp HTML:', tempHtmlPath);

  // Default output path
  const defaultOutput = path.join(__dirname, '..', 'output', `bundle-cci-${seatCount}.pdf`);
  const pdfPath = outputPath || defaultOutput;
  console.log('Output PDF:', pdfPath);
  console.log('');

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 612, height: 792 });

  const fileUrl = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  console.log('Generating PDF...\n');

  await page.pdf({
    path: pdfPath,
    width: '612px',
    height: '792px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  // Clean up temp file
  fs.unlinkSync(tempHtmlPath);

  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log('=== SUCCESS ===\n');
    console.log('PDF generated:');
    console.log('  Path:', pdfPath);
    console.log('  Size:', Math.round(stats.size / 1024), 'KB');
    console.log('  Seats:', seatCount);
  } else {
    console.error('ERROR: PDF was not created');
    process.exit(1);
  }
}

// =============================================================================
// MAIN
// =============================================================================

const seatCountArg = parseInt(process.argv[2]) || 10;
const outputArg = process.argv[3];

if (![10, 15, 20].includes(seatCountArg)) {
  console.error('ERROR: Seat count must be 10, 15, or 20');
  process.exit(1);
}

exportBundleCCIPDF(seatCountArg, outputArg).catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
