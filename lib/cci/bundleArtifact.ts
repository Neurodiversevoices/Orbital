/**
 * Bundle CCI Artifact Generator
 *
 * Generates PDF artifact for Bundle CCI featuring:
 * - Avatar-only seat representation (no names/PII)
 * - Individual seat charts using summaryChart.ts
 * - Combined aggregate chart
 * - Same visual style as Bundle CCI Brief (app view)
 *
 * SINGLE SOURCE OF TRUTH: Uses lib/cci/summaryChart.ts for all chart rendering.
 * LAYOUT: Matches the Bundle CCI Brief grid layout (5 seats per row).
 */

import { CCIIssuanceMetadata } from './types';
import { renderSummaryChartSVG, CAPACITY_COLORS } from './summaryChart';
import {
  generateBundleSeatData,
  calculateAggregateCapacity,
  getBundleStats,
  getSeatCapacityState,
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
 * Uses CAPACITY_COLORS from summaryChart.ts for visual consistency.
 */
function generateAvatarSVG(seat: BundleSeatData, size: number = 24): string {
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
 * - Matches Bundle CCI Brief layout (5 seats per row grid)
 * - Mini chart cards with avatar + state indicator
 * - Combined aggregate chart at bottom
 * - Stats summary (resourced/stretched/depleted counts)
 * - Uses summaryChart.ts for all chart rendering
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

  // Generate mini chart cards matching BundleCCIPreview style (5 per row)
  const seatsPerRow = 5;
  const rows: string[] = [];
  for (let i = 0; i < seats.length; i += seatsPerRow) {
    const rowSeats = seats.slice(i, i + seatsPerRow);
    const rowHTML = rowSeats.map((seat, j) => {
      const index = i + j;
      const state = getSeatCapacityState(seat);
      const stateColor = CAPACITY_COLORS[state];
      const chart = generateSeatChartSVG(seat);
      const avatar = generateAvatarSVG(seat, 20);

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
    /* ============================================
       BUNDLE CCI ARTIFACT - Matches Brief Layout
       Uses summaryChart.ts colors as source of truth
       ============================================ */
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

    /* Header */
    .artifact-title {
      font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.95);
      margin-bottom: 4px; letter-spacing: 0.5px;
    }
    .artifact-subtitle {
      font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 12px;
    }
    .bundle-badge {
      display: inline-block; background: rgba(156,39,176,0.15); color: #9C27B0;
      padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;
      letter-spacing: 0.5px; margin-left: 8px; border: 1px solid rgba(156,39,176,0.3);
    }

    /* Chain of custody */
    .chain-of-custody {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px; padding: 8px 10px; margin-bottom: 10px;
    }
    .coc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 16px; }
    .coc-line { font-size: 8px; line-height: 1.4; }
    .coc-label { font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; font-size: 7px; letter-spacing: 0.5px; }
    .coc-value { color: rgba(255,255,255,0.8); }
    .coc-value-mono { font-family: 'JetBrains Mono', monospace; font-size: 7px; color: rgba(255,255,255,0.7); }
    .coc-status { font-weight: 700; color: #9C27B0; }

    /* Stats row - matches BundleCCIPreview statsRow */
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
    .stat-label { font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; }

    /* Section titles */
    .section-header { margin-bottom: 8px; }
    .section-title {
      font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9);
      letter-spacing: 0.3px;
    }
    .section-subtitle { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; }

    /* Mini Chart Grid - matches BundleCCIPreview MiniChartCard */
    .grid-container { margin-bottom: 14px; }
    .grid-row { display: flex; gap: 6px; margin-bottom: 6px; }

    .mini-chart-card {
      flex: 1; min-width: 0;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px; padding: 6px;
    }
    .mini-chart-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 4px;
    }
    .avatar-wrap { flex-shrink: 0; }
    .avatar-wrap svg { display: block; }
    .state-indicator { width: 8px; height: 8px; border-radius: 4px; }
    .mini-chart-container {
      background: ${CAPACITY_COLORS.background};
      border-radius: 4px; overflow: hidden;
    }
    .mini-chart-container svg { width: 100%; height: 60px; display: block; }

    /* Aggregate section - matches BundleCCIPreview aggregateSection */
    .aggregate-section {
      margin-top: 10px; padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .aggregate-chart-container { text-align: center; margin-bottom: 10px; }
    .aggregate-chart-container svg { width: 100%; max-width: 320px; height: auto; }

    /* Footer */
    .footer-section { margin-top: auto; padding-top: 8px; }
    .legal-block {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px; padding: 8px 10px;
    }
    .legal-title { font-size: 7px; font-weight: 700; color: rgba(255,255,255,0.5); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    .legal-body { font-size: 7px; line-height: 1.5; color: rgba(255,255,255,0.4); }
    .legal-rights { font-size: 7px; font-weight: 700; color: rgba(255,255,255,0.5); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
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
  <!-- Header -->
  <div class="artifact-title">${seatCount} Seats<span class="bundle-badge">BUNDLE</span></div>
  <div class="artifact-subtitle">Anonymous seat-level capacity view</div>

  <!-- Chain of Custody -->
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
        <span class="coc-label">Bundle ID:</span>
        <span class="coc-value">BND-${seatCount}-2025-Q4</span>
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

  <!-- Privacy Notice -->
  <div class="privacy-notice">
    Privacy first: avatars only, no individual attribution
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
      <div class="stat-label">Avg</div>
    </div>
  </div>

  <!-- Seat Grid (5 per row) - matches BundleCCIPreview -->
  <div class="section-header">
    <div class="section-title">${seatCount} Seats</div>
    <div class="section-subtitle">Individual capacity · 90 days · Non-diagnostic</div>
  </div>
  <div class="grid-container">
    ${rows.join('\n')}
  </div>

  <!-- Aggregate Chart -->
  <div class="aggregate-section">
    <div class="section-header">
      <div class="section-title">Combined Aggregate</div>
      <div class="section-subtitle">Average capacity across all ${seatCount} seats</div>
    </div>
    <div class="aggregate-chart-container">
      ${aggregateChart}
    </div>
  </div>

  <!-- Footer -->
  <div class="footer-section">
    <div class="legal-block">
      <div class="legal-title">Confidential &amp; Proprietary Notice</div>
      <div class="legal-body">
        This Bundle Capacity Instrument contains ANONYMIZED aggregate data only. Individual seat holders are NOT identified.
        This is NOT a diagnostic tool. Not a symptom severity scale. For coordination purposes only.
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
