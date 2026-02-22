/**
 * CCI Power PDF — Premium Dark-Theme Template
 *
 * New generation template for the CCI Capacity Clinical Summary.
 * Does NOT modify or replace the golden master in artifact.ts.
 *
 * Layout (612×792px US Letter, #080C16 dark background):
 * 1. Header: Orbital logo + title + observation period + baseline
 * 2. Status strip: label, stability bar, meaning, driver bars
 * 3. Hero chart (40%): SVG capacity-over-time with projection zone
 * 4. Session-ready summary paragraph (cyan left border)
 * 5. 3-column bottom grid: functional impact, interventions, strengths
 * 6. Footer: methodology, privacy, disclaimer
 */

import { CCIFormattedStrings, CCIDynamicData } from './dynamic/types';
import { CCIProjectionResult } from './dynamic/projection';
import { CCINarrativeResult } from './dynamic/narrative';
import {
  CCIFunctionalImpact,
  SeverityLevel,
  SEVERITY_COLORS,
} from './dynamic/impact';
import { CCIIssuanceMetadata } from './types';
import { renderSummaryChartSVG, getCapacityColor, CAPACITY_COLORS } from './summaryChart';

// =============================================================================
// TYPES
// =============================================================================

export interface CCIPowerTemplateInput {
  metadata: CCIIssuanceMetadata;
  formatted: CCIFormattedStrings;
  dynamicData: CCIDynamicData;
  projection: CCIProjectionResult | null;
  narrative: CCINarrativeResult;
  impact: CCIFunctionalImpact;
  driverStats?: { sensory: number; demand: number; social: number };
}

// =============================================================================
// SEVERITY PILL GENERATOR
// =============================================================================

function severityPill(severity: SeverityLevel): string {
  const color = SEVERITY_COLORS[severity];
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:7px;font-weight:700;letter-spacing:0.5px;color:${color};background:${color}20;border:1px solid ${color}40;">${severity}</span>`;
}

// =============================================================================
// DRIVER BAR GENERATOR
// =============================================================================

function driverBar(label: string, percent: number, color: string): string {
  const width = Math.max(2, Math.min(100, Math.round(percent)));
  return `
    <div style="margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
        <span style="font-size:7px;font-weight:600;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
        <span style="font-size:7px;color:rgba(255,255,255,0.5);">${percent}%</span>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
        <div style="height:100%;width:${width}%;background:${color};border-radius:2px;"></div>
      </div>
    </div>`;
}

// =============================================================================
// HERO CHART SVG
// =============================================================================

function generateHeroChartSVG(
  input: CCIPowerTemplateInput,
): string {
  const { dynamicData, projection, formatted } = input;
  const values = dynamicData.chartValues;
  const labels = dynamicData.chartXLabels;

  // Chart dimensions for hero area (wider, taller)
  const width = 528;
  const height = 240;
  const padL = 40;
  const padR = projection ? 140 : 20;
  const padT = 16;
  const padB = 30;
  const graphW = width - padL - padR;
  const graphH = height - padT - padB;
  const bandH = graphH / 3;

  // Value to Y
  const toY = (v: number) => padT + graphH - (Math.max(0, Math.min(100, v)) / 100) * graphH;

  // X positions for 6 data points
  const xPositions = values.map((_, i) => padL + (i / Math.max(values.length - 1, 1)) * graphW);

  // Compute baseline Y
  const { resourced, stretched, depleted, total } = dynamicData.overallDistribution;
  const baselineValue = total > 0 ? Math.round((resourced * 100 + stretched * 50 + depleted * 0) / total) : 50;
  const baselineY = toY(baselineValue);

  // Points with colors
  const points = values.map((v, i) => ({
    x: xPositions[i],
    y: toY(v),
    v,
    color: getCapacityColor(v),
  }));

  // Bezier path
  let curvePath = `M ${points[0].x},${points[0].y.toFixed(1)}`;
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
    curvePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  // Area path
  const areaPath = `${curvePath} L ${points[points.length - 1].x.toFixed(1)},${(padT + graphH).toFixed(1)} L ${points[0].x.toFixed(1)},${(padT + graphH).toFixed(1)} Z`;

  // Nodes
  const nodesSVG = points.map(p => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#080C16"/>
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${p.color}"/>
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.5" fill="white" fill-opacity="0.9"/>`).join('');

  // X labels
  const labelPositions = [padL + graphW * 0.15, padL + graphW * 0.5, padL + graphW * 0.85];
  const xLabelsSVG = labels.map((label, i) =>
    `<text x="${labelPositions[i].toFixed(1)}" y="${(height - 6).toFixed(1)}" font-size="9" fill="rgba(255,255,255,0.5)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">${label}</text>`
  ).join('\n');

  // Zone legend (right side of main chart area)
  const legendX = padL + graphW + 8;
  const legendSVG = `
    <circle cx="${legendX}" cy="${padT + bandH * 0.5}" r="3" fill="${CAPACITY_COLORS.resourced}" fill-opacity="0.8"/>
    <text x="${legendX + 8}" y="${padT + bandH * 0.5 + 3}" font-size="7" fill="rgba(255,255,255,0.5)" font-family="Inter, sans-serif">Resourced</text>
    <circle cx="${legendX}" cy="${padT + bandH * 1.5}" r="3" fill="${CAPACITY_COLORS.stretched}" fill-opacity="0.8"/>
    <text x="${legendX + 8}" y="${padT + bandH * 1.5 + 3}" font-size="7" fill="rgba(255,255,255,0.5)" font-family="Inter, sans-serif">Stretched</text>
    <circle cx="${legendX}" cy="${padT + bandH * 2.5}" r="3" fill="${CAPACITY_COLORS.depleted}" fill-opacity="0.8"/>
    <text x="${legendX + 8}" y="${padT + bandH * 2.5 + 3}" font-size="7" fill="rgba(255,255,255,0.5)" font-family="Inter, sans-serif">Depleted</text>`;

  // Projection zone (if declining)
  let projectionSVG = '';
  if (projection && projection.hasOverloadRisk) {
    const projZoneX = padL + graphW;
    const projZoneW = padR - 10;
    const lastPoint = points[points.length - 1];

    // Projection points: sample 6 from 42
    const projSample = [0, 7, 14, 21, 28, 41].map(i =>
      Math.min(i, projection.projectedPoints.length - 1)
    );
    const projPoints = projSample.map((idx, i) => ({
      x: projZoneX + ((i + 1) / 7) * projZoneW,
      y: toY(projection.projectedPoints[idx]),
      v: projection.projectedPoints[idx],
    }));

    // Critical zone marker
    const criticalY = toY(33);

    // Dashed declining line from last real point through projections
    let projPath = `M ${lastPoint.x.toFixed(1)},${lastPoint.y.toFixed(1)}`;
    for (const pp of projPoints) {
      projPath += ` L ${pp.x.toFixed(1)},${pp.y.toFixed(1)}`;
    }

    projectionSVG = `
      <!-- Projection zone background -->
      <defs>
        <linearGradient id="projGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#F44336" stop-opacity="0"/>
          <stop offset="100%" stop-color="#F44336" stop-opacity="0.12"/>
        </linearGradient>
      </defs>
      <rect x="${projZoneX}" y="${padT}" width="${projZoneW}" height="${graphH}" fill="url(#projGrad)"/>

      <!-- Projected label -->
      <text x="${projZoneX + projZoneW / 2}" y="${padT + 10}" font-size="7" fill="rgba(244,67,54,0.7)" font-family="Inter, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="1">PROJECTED</text>

      <!-- Critical zone line -->
      <line x1="${projZoneX}" y1="${criticalY}" x2="${projZoneX + projZoneW}" y2="${criticalY}" stroke="#F44336" stroke-width="1" stroke-dasharray="4 2" stroke-opacity="0.5"/>
      <text x="${projZoneX + projZoneW}" y="${criticalY - 4}" font-size="6" fill="rgba(244,67,54,0.6)" font-family="Inter, sans-serif" text-anchor="end">CRITICAL ZONE (&lt;60)</text>

      <!-- Dashed projection line -->
      <path d="${projPath}" stroke="#F44336" stroke-width="1.5" fill="none" stroke-dasharray="6 3" stroke-opacity="0.7"/>

      <!-- Hollow ring dots -->
      ${projPoints.map(pp => `
        <circle cx="${pp.x.toFixed(1)}" cy="${pp.y.toFixed(1)}" r="3.5" fill="none" stroke="#F44336" stroke-width="1.5" stroke-opacity="0.6"/>
      `).join('')}

      <!-- Overload risk callout -->
      ${projection.weeksToCritical !== null ? `
      <rect x="${projZoneX + 4}" y="${criticalY + 6}" width="${projZoneW - 8}" height="22" rx="3" fill="#F4433620" stroke="#F4433640" stroke-width="1"/>
      <text x="${projZoneX + projZoneW / 2}" y="${criticalY + 15}" font-size="6" fill="#F44336" font-family="Inter, sans-serif" font-weight="700" text-anchor="middle">OVERLOAD RISK</text>
      <text x="${projZoneX + projZoneW / 2}" y="${criticalY + 23}" font-size="6" fill="rgba(244,67,54,0.7)" font-family="Inter, sans-serif" text-anchor="middle">~${projection.weeksToCritical}wk</text>
      ` : ''}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <!-- Zone backgrounds -->
    <rect x="${padL}" y="${padT}" width="${graphW}" height="${bandH}" fill="${CAPACITY_COLORS.resourced}" fill-opacity="0.05"/>
    <rect x="${padL}" y="${padT + bandH}" width="${graphW}" height="${bandH}" fill="${CAPACITY_COLORS.stretched}" fill-opacity="0.03"/>
    <rect x="${padL}" y="${padT + bandH * 2}" width="${graphW}" height="${bandH}" fill="${CAPACITY_COLORS.depleted}" fill-opacity="0.05"/>

    <!-- Zone dividers -->
    <line x1="${padL}" y1="${padT + bandH}" x2="${padL + graphW}" y2="${padT + bandH}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="${padL}" y1="${padT + bandH * 2}" x2="${padL + graphW}" y2="${padT + bandH * 2}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="3 3"/>

    <!-- Baseline reference -->
    <line x1="${padL}" y1="${baselineY}" x2="${padL + graphW}" y2="${baselineY}" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="6 3"/>
    <text x="${padL - 4}" y="${baselineY + 3}" font-size="6" fill="rgba(255,255,255,0.3)" font-family="Inter, sans-serif" text-anchor="end">${baselineValue}%</text>

    <!-- Borders -->
    <line x1="${padL}" y1="${padT}" x2="${padL + graphW}" y2="${padT}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <line x1="${padL}" y1="${padT + graphH}" x2="${padL + graphW}" y2="${padT + graphH}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + graphH}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

    <!-- Gradient defs -->
    <defs>
      <linearGradient id="heroAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${CAPACITY_COLORS.resourced}" stop-opacity="0.15"/>
        <stop offset="50%" stop-color="${CAPACITY_COLORS.stretched}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="${CAPACITY_COLORS.depleted}" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="heroLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${CAPACITY_COLORS.resourced}"/>
        <stop offset="50%" stop-color="${CAPACITY_COLORS.stretched}"/>
        <stop offset="100%" stop-color="${CAPACITY_COLORS.depleted}"/>
      </linearGradient>
    </defs>

    <!-- Area fill -->
    <path d="${areaPath}" fill="url(#heroAreaGrad)"/>

    <!-- Dark under-stroke -->
    <path d="${curvePath}" stroke="#080C16" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Main gradient stroke -->
    <path d="${curvePath}" stroke="url(#heroLineGrad)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Data nodes -->
    ${nodesSVG}

    <!-- Zone legend -->
    ${legendSVG}

    <!-- X-axis labels -->
    ${xLabelsSVG}

    <!-- Projection zone -->
    ${projectionSVG}
  </svg>`;
}

// =============================================================================
// STABILITY BAR
// =============================================================================

function stabilityBar(percent: number): string {
  const clamp = Math.max(0, Math.min(100, percent));
  const color = clamp >= 70 ? CAPACITY_COLORS.resourced
    : clamp >= 45 ? CAPACITY_COLORS.stretched
      : CAPACITY_COLORS.depleted;

  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${clamp}%;background:${color};border-radius:3px;"></div>
      </div>
      <span style="font-size:12px;font-weight:700;color:${color};font-family:'JetBrains Mono',monospace;">${clamp}%</span>
    </div>`;
}

// =============================================================================
// MAIN TEMPLATE
// =============================================================================

export function generateCCIPowerHTML(input: CCIPowerTemplateInput): string {
  const { metadata, formatted, dynamicData, projection, narrative, impact, driverStats } = input;

  const heroChart = generateHeroChartSVG(input);

  // Compute baseline for header
  const { resourced, stretched, depleted, total } = dynamicData.overallDistribution;
  const baselineValue = total > 0 ? Math.round((resourced * 100 + stretched * 50 + depleted * 0) / total) : 50;

  // Status label
  const depletedPct = total > 0 ? Math.round((depleted / total) * 100) : 0;
  const resourcedPct = total > 0 ? Math.round((resourced / total) * 100) : 0;
  const statusLabel = resourcedPct >= 50 ? 'RESOURCED' : depletedPct >= 40 ? 'NEAR CAPACITY' : 'STRETCHED';
  const statusColor = resourcedPct >= 50 ? CAPACITY_COLORS.resourced : depletedPct >= 40 ? CAPACITY_COLORS.depleted : CAPACITY_COLORS.stretched;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Capacity Clinical Summary</title>
  <style>
    @page { size: 612px 792px; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 612px; height: 792px; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px; line-height: 1.5; color: rgba(255,255,255,0.85);
      background: #080C16;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .page {
      width: 612px; height: 792px;
      padding: 24px 28px 20px 28px;
      background: #080C16;
      position: relative;
      display: flex; flex-direction: column;
    }
    .mono { font-family: 'JetBrains Mono', 'Consolas', monospace; }
    @media print {
      .page, body, svg rect, svg circle, svg path, svg line, svg text {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ======= HEADER ======= -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);">
    <div>
      <div style="font-size:7px;font-weight:600;color:${CAPACITY_COLORS.resourced};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">ORBITAL</div>
      <div style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.95);letter-spacing:0.5px;">Capacity Clinical Summary</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.4);margin-top:2px;">${formatted.observationWindowDisplay} ${formatted.windowStatus}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:7px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.5px;">Patient ID</div>
      <div class="mono" style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.7);">${formatted.patientId}</div>
      <div style="font-size:7px;color:rgba(255,255,255,0.3);margin-top:2px;">Baseline: ${baselineValue}%</div>
    </div>
  </div>

  <!-- ======= STATUS STRIP ======= -->
  <div style="display:flex;gap:12px;margin-bottom:12px;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:4px;">
    <!-- Status Label -->
    <div style="width:90px;flex-shrink:0;">
      <div style="font-size:7px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Status</div>
      <div style="font-size:11px;font-weight:700;color:${statusColor};letter-spacing:0.5px;">${statusLabel}</div>
    </div>
    <!-- Stability Score -->
    <div style="flex:1;min-width:120px;">
      <div style="font-size:7px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Pattern Stability</div>
      ${stabilityBar(dynamicData.patternStabilityPercent)}
      <div style="font-size:6.5px;color:rgba(255,255,255,0.3);margin-top:2px;">${formatted.verdict}</div>
    </div>
    <!-- Driver Bars -->
    <div style="width:140px;flex-shrink:0;">
      <div style="font-size:7px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Load Drivers</div>
      ${driverStats ? `
        ${driverBar('Sensory', driverStats.sensory, CAPACITY_COLORS.resourced)}
        ${driverBar('Demand', driverStats.demand, CAPACITY_COLORS.stretched)}
        ${driverBar('Social', driverStats.social, CAPACITY_COLORS.depleted)}
      ` : `
        ${driverBar('Sensory', 0, CAPACITY_COLORS.resourced)}
        ${driverBar('Demand', 0, CAPACITY_COLORS.stretched)}
        ${driverBar('Social', 0, CAPACITY_COLORS.depleted)}
      `}
    </div>
  </div>

  <!-- ======= HERO CHART ======= -->
  <div style="margin-bottom:12px;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:10px 12px 8px 12px;">
    <div style="font-size:7px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
      Capacity Over Time <span style="font-weight:400;color:rgba(255,255,255,0.3);margin-left:6px;">Non-Diagnostic</span>
    </div>
    ${heroChart}
  </div>

  <!-- ======= SESSION-READY SUMMARY ======= -->
  <div style="margin-bottom:12px;padding:10px 14px;border-left:3px solid ${CAPACITY_COLORS.resourced};background:rgba(0,229,255,0.03);border-radius:0 4px 4px 0;">
    <div style="font-size:7px;font-weight:600;color:${CAPACITY_COLORS.resourced};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Session-Ready Summary</div>
    <div style="font-size:8px;line-height:1.65;color:rgba(255,255,255,0.7);">${narrative.summary}</div>
  </div>

  <!-- ======= 3-COLUMN BOTTOM GRID ======= -->
  <div style="display:flex;gap:10px;margin-bottom:auto;">
    <!-- Column 1: Functional Impact -->
    <div style="flex:1;padding:10px;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.06);border-radius:4px;">
      <div style="font-size:7px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Functional Impact</div>
      ${impact.items.map(item => `
        <div style="margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
            <span style="font-size:7.5px;font-weight:600;color:rgba(255,255,255,0.7);">${item.domain}</span>
            ${severityPill(item.severity)}
          </div>
          <div style="font-size:6.5px;color:rgba(255,255,255,0.4);line-height:1.4;">${item.descriptor}</div>
        </div>
      `).join('')}
    </div>

    <!-- Column 2: Intervention Targets -->
    <div style="flex:1;padding:10px;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.06);border-radius:4px;">
      <div style="font-size:7px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Intervention Targets</div>
      ${impact.interventionTargets.map(target => `
        <div style="margin-bottom:6px;padding-left:10px;position:relative;">
          <div style="position:absolute;left:0;top:1px;font-size:8px;font-weight:700;color:${CAPACITY_COLORS.resourced};">${target.priority}</div>
          <div style="font-size:7.5px;font-weight:600;color:rgba(255,255,255,0.75);">${target.label}</div>
          <div style="font-size:6.5px;color:rgba(255,255,255,0.4);line-height:1.4;">${target.rationale}</div>
        </div>
      `).join('')}
      ${impact.interventionTargets.length === 0 ? '<div style="font-size:7px;color:rgba(255,255,255,0.3);font-style:italic;">No elevated targets identified</div>' : ''}
    </div>

    <!-- Column 3: Strengths + Recent Patterns -->
    <div style="flex:1;padding:10px;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.06);border-radius:4px;">
      <div style="font-size:7px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Observed Strengths</div>
      ${impact.strengths.map(s => `
        <div style="font-size:7px;color:rgba(255,255,255,0.65);margin-bottom:3px;padding-left:10px;position:relative;">
          <span style="position:absolute;left:0;color:${CAPACITY_COLORS.resourced};">&#10003;</span>${s}
        </div>
      `).join('')}
      ${impact.strengths.length === 0 ? '<div style="font-size:7px;color:rgba(255,255,255,0.3);font-style:italic;">Insufficient data</div>' : ''}

      <div style="font-size:7px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.8px;margin-top:8px;margin-bottom:6px;">Recent Patterns</div>
      ${impact.recentPatterns.map(p => `
        <div style="font-size:7px;color:rgba(255,255,255,0.55);margin-bottom:3px;padding-left:10px;position:relative;">
          <span style="position:absolute;left:1px;top:-1px;color:rgba(255,255,255,0.3);">&#8226;</span>${p}
        </div>
      `).join('')}
    </div>
  </div>

  <!-- ======= FOOTER ======= -->
  <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
    <!-- Methodology -->
    <div style="font-size:6px;color:rgba(255,255,255,0.3);line-height:1.5;margin-bottom:4px;">
      <strong style="color:rgba(255,255,255,0.4);">Methodology:</strong> Capacity signals derived from structured ecological momentary assessment (EMA). Stability computed via day-to-day volatility normalization. Projections use weighted linear regression on recent 21-day window. This is NOT a diagnostic instrument.
    </div>
    <!-- Privacy -->
    <div style="font-size:6px;color:rgba(255,255,255,0.3);line-height:1.5;margin-bottom:6px;">
      <strong style="color:rgba(255,255,255,0.4);">Privacy:</strong> Patient ID is anonymized. No personally identifiable information is contained in this document. Data remains under patient control.
    </div>
    <!-- Closing bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:3px;">
      <div>
        <span class="mono" style="font-size:6px;color:rgba(255,255,255,0.25);">Hash: ${metadata.integrityHash}</span>
      </div>
      <div style="font-size:6px;color:rgba(255,255,255,0.3);">
        Generated ${metadata.generatedAt}
      </div>
    </div>
    <!-- Clinical use disclaimer -->
    <div style="text-align:center;margin-top:4px;">
      <span style="font-size:5.5px;color:rgba(255,255,255,0.2);letter-spacing:0.5px;text-transform:uppercase;">For clinical documentation support only. Not a diagnosis. &copy; 2026 Orbital Health Intelligence, Inc.</span>
    </div>
  </div>

</div>
</body>
</html>`;
}
