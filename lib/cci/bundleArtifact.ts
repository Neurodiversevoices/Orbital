/**
 * Bundle CCI Artifact Generator
 *
 * Generates PDF artifact for Bundle CCI featuring:
 * - Avatar-only seat representation (no names/PII)
 * - Individual seat charts using summaryChart.ts
 * - Combined aggregate chart
 * - Same visual style as Individual/Circle CCI
 *
 * Uses lib/cci/summaryChart.ts for all chart rendering.
 */

import { CCIIssuanceMetadata } from './types';
import { renderSummaryChartSVG } from './summaryChart';
import {
  generateBundleSeatData,
  calculateAggregateCapacity,
  getBundleStats,
  getSeatCapacityState,
  AVATAR_COLORS,
  type BundleSeatData,
} from './bundleDemoData';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format timestamp in UTC
 */
function formatUTCTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

/**
 * Generate placeholder hash
 */
function generatePlaceholderHash(): string {
  return 'sha256:b7d3f9a81c2e4b6f...e91c2d8a4';
}

/**
 * Generate avatar SVG circle (no text, just colored circle with capacity ring)
 */
function generateAvatarSVG(seat: BundleSeatData, size: number = 24): string {
  const state = getSeatCapacityState(seat);
  const ringColor = {
    resourced: '#00E5FF',
    stretched: '#E8A830',
    depleted: '#F44336',
  }[state];

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

/**
 * Generate mini chart SVG for a seat
 */
function generateSeatChartSVG(seat: BundleSeatData): string {
  return renderSummaryChartSVG(seat.capacityHistory, {
    includeGradientDefs: true,
    gradientId: seat.id,
  });
}

/**
 * Generate aggregate chart SVG
 */
function generateAggregateChartSVG(seats: BundleSeatData[]): string {
  const aggregateHistory = calculateAggregateCapacity(seats);
  return renderSummaryChartSVG(aggregateHistory, {
    includeGradientDefs: true,
    gradientId: 'aggregate',
  });
}

// =============================================================================
// BUNDLE CCI ARTIFACT HTML GENERATOR
// =============================================================================

/**
 * Generate Bundle CCI artifact HTML
 *
 * Features:
 * - Avatar grid (no names) with capacity indicators
 * - Mini charts for each seat (2 per row, 5 rows for 10, etc.)
 * - Combined aggregate chart
 * - Stats summary (resourced/stretched/depleted counts)
 *
 * @param seatCount Number of bundle seats (10, 15, or 20)
 * @param metadata Optional metadata overrides
 */
export function generateBundleCCIArtifactHTML(
  seatCount: 10 | 15 | 20,
  metadata?: Partial<CCIIssuanceMetadata>
): string {
  const now = new Date();
  const timestamp = metadata?.generatedAt || formatUTCTimestamp(now);
  const hash = metadata?.integrityHash || generatePlaceholderHash();

  // Generate seat data
  const seats = generateBundleSeatData(seatCount);
  const stats = getBundleStats(seats);
  const aggregateChart = generateAggregateChartSVG(seats);

  // Generate seat cards HTML (2 per row for compact layout)
  const seatCardsHTML = seats.map((seat, index) => {
    const state = getSeatCapacityState(seat);
    const stateClass = `status-${state}`;
    const chart = generateSeatChartSVG(seat);
    const avatar = generateAvatarSVG(seat, 28);

    return `
    <div class="seat-card">
      <div class="seat-header">
        <div class="seat-avatar">${avatar}</div>
        <div class="seat-meta">
          <span class="seat-number">Seat ${index + 1}</span>
          <span class="status-badge ${stateClass}">${state}</span>
        </div>
      </div>
      <div class="seat-chart">${chart}</div>
    </div>`;
  }).join('\n');

  // Split seats into rows of 2 for the PDF layout
  const seatsPerRow = 2;
  const rows: string[] = [];
  for (let i = 0; i < seats.length; i += seatsPerRow) {
    const rowSeats = seats.slice(i, i + seatsPerRow);
    const rowHTML = rowSeats.map((seat, j) => {
      const index = i + j;
      const state = getSeatCapacityState(seat);
      const stateClass = `status-${state}`;
      const chart = generateSeatChartSVG(seat);
      const avatar = generateAvatarSVG(seat, 24);

      return `
      <div class="seat-card">
        <div class="seat-header">
          <div class="seat-avatar">${avatar}</div>
          <div class="seat-meta">
            <span class="seat-number">Seat ${index + 1}</span>
            <span class="status-badge ${stateClass}">${state}</span>
          </div>
        </div>
        <div class="seat-chart">${chart}</div>
      </div>`;
    }).join('');

    rows.push(`<div class="seat-row">${rowHTML}</div>`);
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
      font-size: 10px; line-height: 1.5; color: #1e293b; background: #fff;
      -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    }
    .page { width: 612px; min-height: 792px; padding: 24px 32px 20px 32px; background: #fff; position: relative; }

    /* Header */
    .artifact-title {
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: #0f172a;
      text-align: center; margin-bottom: 4px; padding-bottom: 6px;
      border-bottom: 2px solid #9C27B0; letter-spacing: 0.8px; text-transform: uppercase;
    }
    .bundle-badge {
      display: inline-block; background: rgba(156,39,176,0.15); color: #9C27B0;
      padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 600;
      letter-spacing: 0.5px; margin-left: 6px;
    }

    /* Chain of custody */
    .chain-of-custody { padding: 6px 0 8px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; }
    .coc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 16px; }
    .coc-line { font-size: 7px; line-height: 1.4; color: #1e293b; }
    .coc-label { font-weight: 600; color: #0f172a; text-transform: uppercase; font-size: 6.5px; letter-spacing: 0.5px; }
    .coc-value { font-weight: 400; color: #334155; }
    .coc-value-mono { font-family: 'JetBrains Mono', monospace; font-size: 7px; color: #334155; }
    .coc-status { font-weight: 700; color: #0f172a; }

    /* Bundle info */
    .bundle-info { margin-bottom: 6px; }
    .info-grid { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 2px 8px; font-size: 7px; }
    .info-label { font-weight: 600; color: #0f172a; }
    .info-value { color: #334155; }

    /* Stats row */
    .stats-row {
      display: flex; justify-content: space-around; gap: 8px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;
      padding: 6px 8px; margin-bottom: 8px;
    }
    .stat-item { text-align: center; }
    .stat-dot { width: 8px; height: 8px; border-radius: 50%; margin: 0 auto 2px auto; }
    .stat-dot-resourced { background: #00E5FF; }
    .stat-dot-stretched { background: #E8A830; }
    .stat-dot-depleted { background: #F44336; }
    .stat-value { font-size: 14px; font-weight: 700; color: #0f172a; }
    .stat-value-avg { color: #9C27B0; }
    .stat-label { font-size: 6px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Section titles */
    .section-title {
      font-size: 8px; font-weight: 700; color: #0f172a;
      margin-bottom: 4px; letter-spacing: 0.5px; text-transform: uppercase;
    }
    .section-subtitle { font-size: 6.5px; color: #64748b; margin-bottom: 6px; }

    /* Aggregate chart */
    .aggregate-section { margin-bottom: 10px; }
    .aggregate-chart {
      background: #0a0b10; border-radius: 4px; padding: 8px;
      width: 100%; max-width: 360px; margin: 0 auto;
    }
    .aggregate-chart svg { width: 100%; height: auto; }

    /* Seat grid */
    .seats-section { margin-bottom: 8px; }
    .seat-row { display: flex; gap: 6px; margin-bottom: 4px; }
    .seat-card {
      flex: 1; background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 3px; padding: 4px; min-width: 0;
    }
    .seat-header { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
    .seat-avatar { flex-shrink: 0; }
    .seat-avatar svg { display: block; }
    .seat-meta { flex: 1; min-width: 0; }
    .seat-number { font-size: 7px; font-weight: 600; color: #0f172a; display: block; }
    .seat-chart { background: #0a0b10; border-radius: 2px; overflow: hidden; }
    .seat-chart svg { width: 100%; height: 50px; display: block; }

    /* Status badges */
    .status-badge {
      display: inline-block; padding: 1px 4px; border-radius: 2px;
      font-size: 5.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .status-resourced { background: rgba(0,229,255,0.15); color: #00b8d9; }
    .status-stretched { background: rgba(232,168,48,0.15); color: #b8860b; }
    .status-depleted { background: rgba(244,67,54,0.15); color: #d32f2f; }

    /* Footer */
    .footer-section { border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: auto; }
    .legal-block { background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 6px; }
    .legal-title { font-size: 5.5px; font-weight: 700; color: #0f172a; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .legal-body { font-size: 5.5px; line-height: 1.4; color: #475569; }
    .legal-rights { font-size: 5.5px; font-weight: 700; color: #0f172a; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.8px; }
    .privacy-notice { font-size: 6px; color: #9C27B0; font-weight: 600; margin-bottom: 4px; }

    @media print {
      .page { border: none; }
      .seat-chart, .aggregate-chart, svg rect, svg circle, svg path, svg line {
        print-color-adjust: exact; -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

<div class="page">
  <h1 class="artifact-title">Bundle Capacity Instrument<span class="bundle-badge">${seatCount} SEATS</span></h1>

  <div class="chain-of-custody">
    <div class="coc-grid">
      <div class="coc-line">
        <span class="coc-label">Generated:</span>
        <span class="coc-value-mono">${timestamp}</span>
      </div>
      <div class="coc-line">
        <span class="coc-label">Protocol:</span>
        <span class="coc-value">Structured EMA v4.2</span>
      </div>
      <div class="coc-line">
        <span class="coc-label">Observation Window:</span>
        <span class="coc-value">2025-10-01 to 2025-12-31 <em>(Closed)</em></span>
      </div>
      <div class="coc-line">
        <span class="coc-label">Status:</span>
        <span class="coc-status">IMMUTABLE SNAPSHOT</span>
      </div>
      <div class="coc-line" style="grid-column: span 2;">
        <span class="coc-label">Integrity Hash:</span>
        <span class="coc-value-mono">${hash}</span>
      </div>
    </div>
  </div>

  <div class="bundle-info">
    <div class="info-grid">
      <span class="info-label">Bundle ID:</span>
      <span class="info-value">BND-${seatCount}-2025-Q4</span>
      <span class="info-label">Seats:</span>
      <span class="info-value">${seatCount}</span>
      <span class="info-label">Type:</span>
      <span class="info-value">Pro Bundle</span>
      <span class="info-label">Period:</span>
      <span class="info-value">Oct 1, 2025 – Dec 31, 2025</span>
    </div>
  </div>

  <div class="privacy-notice">
    PRIVACY: Individual identities anonymized. Avatars represent seats, not named individuals.
  </div>

  <!-- Stats Summary -->
  <div class="stats-row">
    <div class="stat-item">
      <div class="stat-dot stat-dot-resourced"></div>
      <div class="stat-value">${stats.resourcedCount}</div>
      <div class="stat-label">Resourced</div>
    </div>
    <div class="stat-item">
      <div class="stat-dot stat-dot-stretched"></div>
      <div class="stat-value">${stats.stretchedCount}</div>
      <div class="stat-label">Stretched</div>
    </div>
    <div class="stat-item">
      <div class="stat-dot stat-dot-depleted"></div>
      <div class="stat-value">${stats.depletedCount}</div>
      <div class="stat-label">Depleted</div>
    </div>
    <div class="stat-item">
      <div class="stat-value stat-value-avg">${stats.averageCapacity}%</div>
      <div class="stat-label">Avg Capacity</div>
    </div>
  </div>

  <!-- Combined Aggregate Chart -->
  <div class="aggregate-section">
    <div class="section-title">Combined Aggregate Capacity</div>
    <div class="section-subtitle">Average across all ${seatCount} seats · Non-diagnostic</div>
    <div class="aggregate-chart">
      ${aggregateChart}
    </div>
  </div>

  <!-- Individual Seat Charts (anonymous) -->
  <div class="seats-section">
    <div class="section-title">Individual Seat Capacity — 90 Days</div>
    <div class="section-subtitle">Anonymized view · No individual attribution</div>
    ${rows.join('\n')}
  </div>

  <div class="footer-section">
    <div class="legal-block">
      <div class="legal-title">Confidential &amp; Proprietary Notice</div>
      <div class="legal-body">
        This Bundle Capacity Instrument contains ANONYMIZED aggregate data only. Individual seat holders are NOT identified.
        All underlying methodologies, algorithms, data structures, and presentation formats constitute proprietary intellectual property
        of Orbital Health Intelligence, Inc. This is NOT a diagnostic tool. For coordination and documentation purposes only.
      </div>
      <div class="legal-rights">© 2026 Orbital Health Intelligence, Inc. All Rights Reserved.</div>
    </div>
  </div>
</div>

</body>
</html>`;
}

/**
 * Get the Bundle CCI golden master HTML
 */
export function getBundleGoldenMasterHTML(seatCount: 10 | 15 | 20 = 10): string {
  return generateBundleCCIArtifactHTML(seatCount, {
    generatedAt: '2026-01-10 14:02:41 UTC',
    integrityHash: 'sha256:b7d3f9a81c2e4b6f...e91c2d8a4',
  });
}

/**
 * Create Bundle CCI artifact object
 */
export function createBundleCCIArtifact(
  seatCount: 10 | 15 | 20,
  metadata?: Partial<CCIIssuanceMetadata>
) {
  const now = new Date();
  const fullMetadata: CCIIssuanceMetadata = {
    generatedAt: metadata?.generatedAt || formatUTCTimestamp(now),
    protocol: metadata?.protocol || 'Structured EMA v4.2',
    observationStart: metadata?.observationStart || '2025-10-01',
    observationEnd: metadata?.observationEnd || '2025-12-31',
    integrityHash: metadata?.integrityHash || generatePlaceholderHash(),
  };

  return {
    id: `cci-bundle-${seatCount}-${Date.now()}`,
    version: 'Q4-2025',
    seatCount,
    metadata: fullMetadata,
    html: generateBundleCCIArtifactHTML(seatCount, fullMetadata),
  };
}
