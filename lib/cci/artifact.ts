/**
 * CCI-Q4 Artifact Generator
 *
 * GOLDEN MASTER LOCKED: This file reproduces the EXACT HTML/CSS/SVG
 * from output/cci_ultra.html which generated the golden master PDF.
 *
 * DO NOT MODIFY VISUAL OUTPUT.
 * DO NOT REFACTOR STYLES.
 * DO NOT "IMPROVE" LAYOUT.
 *
 * Only dynamic fields: timestamp, hash (same position/style).
 */

import { CCIArtifact, CCIArtifactJSON, CCIIssuanceMetadata } from './types';

/**
 * Generate CCI artifact HTML
 *
 * Returns the EXACT HTML that matches the golden master PDF.
 * Only timestamp and hash fields are dynamic.
 */
export function generateCCIArtifactHTML(metadata?: Partial<CCIIssuanceMetadata>): string {
  const now = new Date();
  const timestamp = metadata?.generatedAt || formatUTCTimestamp(now);
  const hash = metadata?.integrityHash || generatePlaceholderHash();

  // LOCKED HTML - matches output/cci_ultra.html EXACTLY
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clinical Capacity Instrument</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    /* ============================================
       RESET + PAGE SETUP
       ============================================ */
    @page {
      size: 612px 792px;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 612px;
      height: 792px;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      line-height: 1.5;
      color: #1e293b;
      background: #fff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .page {
      width: 612px;
      height: 792px;
      padding: 36px 42px 32px 42px;
      background: #fff;
      position: relative;
    }

    /* ============================================
       ARTIFACT TITLE
       ============================================ */
    .artifact-title {
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin-bottom: 6px;
      padding-bottom: 8px;
      border-bottom: 2px solid #0f172a;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    /* ============================================
       CHAIN OF CUSTODY (TOP METADATA)
       Typography: readable, high-contrast
       ============================================ */
    .chain-of-custody {
      padding: 12px 0 14px 0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 14px;
    }

    .coc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
    }

    .coc-line {
      font-size: 9px;
      line-height: 1.6;
      color: #1e293b;
    }

    .coc-label {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      color: #0f172a;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.5px;
    }

    .coc-value {
      font-family: 'Inter', sans-serif;
      font-weight: 400;
      color: #334155;
    }

    .coc-value-mono {
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 8.5px;
      color: #334155;
      letter-spacing: -0.2px;
    }

    .coc-value em {
      font-style: italic;
      color: #475569;
    }

    .coc-status {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.5px;
    }

    /* ============================================
       WHAT CAPACITY MEANS SECTION
       ============================================ */
    .capacity-definition {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #0f172a;
      padding: 12px 14px;
      margin-bottom: 14px;
    }

    .capacity-definition-title {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      letter-spacing: 0.3px;
    }

    .capacity-definition-body {
      font-family: 'Inter', sans-serif;
      font-size: 8px;
      line-height: 1.6;
      color: #334155;
    }

    .capacity-definition-body p {
      margin-bottom: 6px;
    }

    .capacity-definition-emphasis {
      font-weight: 600;
      color: #0f172a;
      font-style: italic;
    }

    .capacity-definition-list {
      margin: 4px 0 6px 16px;
      padding: 0;
    }

    .capacity-definition-list li {
      margin-bottom: 2px;
      color: #475569;
    }

    .capacity-definition-footer {
      font-style: italic;
      color: #64748b;
      margin-bottom: 0 !important;
    }

    /* ============================================
       SECTION TITLE
       ============================================ */
    .section-title {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* ============================================
       PATIENT INFO
       ============================================ */
    .patient-info {
      margin-bottom: 14px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr;
      gap: 4px 12px;
      font-size: 9px;
    }

    .info-label {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      color: #0f172a;
    }

    .info-value {
      font-family: 'Inter', sans-serif;
      color: #334155;
    }

    .info-value-mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: #334155;
    }

    /* ============================================
       MAIN CONTENT - TWO COLUMN
       ============================================ */
    .main-content {
      display: flex;
      gap: 20px;
      margin-bottom: 16px;
    }

    /* ============================================
       AUDIT PANEL (LEFT)
       ============================================ */
    .audit-panel {
      width: 180px;
      flex-shrink: 0;
      border-left: 3px solid #0f172a;
      padding-left: 12px;
      padding-top: 4px;
    }

    .audit-title {
      font-family: 'Inter', sans-serif;
      font-size: 9px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .audit-row {
      margin-bottom: 8px;
    }

    .audit-label {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      color: #0f172a;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .audit-value {
      font-family: 'Inter', sans-serif;
      color: #334155;
      font-size: 9px;
      font-weight: 500;
    }

    .audit-note {
      display: block;
      font-size: 7.5px;
      font-style: italic;
      color: #64748b;
      margin-top: 1px;
    }

    .verdict-row {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
    }

    .audit-verdict {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      color: #0f172a;
      font-size: 8px;
      letter-spacing: 0.3px;
    }

    /* ============================================
       CHARTS PANEL (RIGHT) - DARK CARD STYLE
       ============================================ */
    .charts-panel {
      flex: 1;
    }

    .chart-card {
      background: #0a0b10;
      border-radius: 4px;
      padding: 12px 14px 10px 14px;
      margin-bottom: 12px;
    }

    .chart-header {
      font-family: 'Inter', sans-serif;
      font-size: 8px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      text-align: center;
      margin-bottom: 8px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .chart-header-sub {
      font-weight: 400;
      color: rgba(255, 255, 255, 0.4);
      font-size: 7px;
      margin-left: 6px;
    }

    /* ============================================
       STABILITY & VOLATILITY CHART
       ============================================ */
    .bar-chart-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 10px 12px;
    }

    .bar-chart-title {
      font-family: 'Inter', sans-serif;
      font-size: 8px;
      font-weight: 600;
      color: #0f172a;
      text-align: center;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* ============================================
       PROVIDER STATEMENT + LEGAL (BOTTOM)
       Readable, strong hierarchy
       ============================================ */
    .footer-section {
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      margin-top: auto;
    }

    .provider-title {
      font-family: 'Inter', sans-serif;
      font-size: 8px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .provider-body {
      font-family: 'Inter', sans-serif;
      font-size: 7.5px;
      line-height: 1.5;
      color: #334155;
      margin-bottom: 8px;
    }

    .provider-body em {
      font-style: italic;
    }

    .legal-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      margin-top: 6px;
    }

    .legal-title {
      font-family: 'Inter', sans-serif;
      font-size: 7px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .legal-body {
      font-family: 'Inter', sans-serif;
      font-size: 6.5px;
      line-height: 1.55;
      color: #475569;
    }

    .legal-rights {
      font-family: 'Inter', sans-serif;
      font-size: 6.5px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* ============================================
       PRINT
       ============================================ */
    @media print {
      .page {
        border: none;
      }

      .chart-card,
      svg rect,
      svg circle,
      svg path,
      svg line {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

<div class="page">
  <!-- HEADER -->
  <h1 class="artifact-title">Clinical Artifact Record [Locked]</h1>

  <!-- CHAIN OF CUSTODY - READABLE META -->
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

  <!-- WHAT CAPACITY MEANS -->
  <div class="capacity-definition">
    <div class="capacity-definition-title">What "Capacity" Means in This Report</div>
    <div class="capacity-definition-body">
      <p>Capacity refers to a person's day-to-day functional bandwidth — the amount of emotional, cognitive, sensory, and social load they can manage before regulation begins to degrade.</p>
      <p class="capacity-definition-emphasis">Capacity is not a diagnosis, not a symptom checklist, and not a performance score.</p>
      <p>Changes in capacity often present clinically as:</p>
      <ul class="capacity-definition-list">
        <li>increased emotional reactivity</li>
        <li>cognitive fatigue or brain fog</li>
        <li>sensory overwhelm</li>
        <li>social withdrawal</li>
        <li>reduced tolerance for stressors</li>
      </ul>
      <p class="capacity-definition-footer">This report summarizes patterns over time, not isolated moments.</p>
    </div>
  </div>

  <!-- CAPACITY SUMMARY REPORT -->
  <h2 class="section-title">Capacity Summary Report</h2>

  <div class="patient-info">
    <div class="info-grid">
      <span class="info-label">Patient ID:</span>
      <span class="info-value-mono">34827-AFJ</span>
      <span class="info-label">Observation Period:</span>
      <span class="info-value">Oct 1, 2025 – Dec 31, 2025</span>
    </div>
  </div>

  <!-- TWO COLUMN LAYOUT -->
  <div class="main-content">
    <!-- LEFT: REPORTING QUALITY OVERVIEW -->
    <div class="audit-panel">
      <h3 class="audit-title">Reporting Quality Overview</h3>
      <div class="audit-row">
        <span class="audit-label">Tracking Continuity:</span>
        <span class="audit-value">85% (High Reliability)</span>
        <span class="audit-note">Reflects engagement with daily reflection. Gaps may correspond with overwhelm, avoidance, or periods of reduced capacity.</span>
      </div>
      <div class="audit-row">
        <span class="audit-label">Response Timing:</span>
        <span class="audit-value">Mean 4.2s</span>
        <span class="audit-note">Reflects how quickly the individual checks in with their internal state. Slower or inconsistent timing may correlate with cognitive fatigue or overload.</span>
      </div>
      <div class="audit-row">
        <span class="audit-label">Capacity Pattern Stability:</span>
        <span class="audit-value">92%</span>
        <span class="audit-note">Indicates how consistent reported capacity is over time. Sudden shifts may reflect stressors, environmental changes, or dysregulation.</span>
      </div>
      <div class="audit-row verdict-row">
        <span class="audit-label">Pattern Summary:</span>
        <span class="audit-verdict">Interpretable Capacity Trends</span>
      </div>
    </div>

    <!-- RIGHT: CHARTS -->
    <div class="charts-panel">
      <!-- CAPACITY LEVELS CHART - DARK CARD MATCHING APP -->
      <div class="chart-card">
        <div class="chart-header">
          Capacity Over Time<span class="chart-header-sub">— Normalized, Non-Diagnostic</span>
        </div>
        <svg width="100%" height="140" viewBox="0 0 320 140" preserveAspectRatio="xMidYMid meet">
          <!-- Zone backgrounds (subtle fills matching app) -->
          <rect x="32" y="8" width="280" height="36" fill="#00E5FF" fill-opacity="0.06"/>
          <rect x="32" y="44" width="280" height="36" fill="#E8A830" fill-opacity="0.04"/>
          <rect x="32" y="80" width="280" height="36" fill="#F44336" fill-opacity="0.06"/>

          <!-- Zone divider lines (dashed, subtle) -->
          <line x1="32" y1="44" x2="312" y2="44" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 3"/>
          <line x1="32" y1="80" x2="312" y2="80" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 3"/>

          <!-- Top/bottom/left borders -->
          <line x1="32" y1="8" x2="312" y2="8" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
          <line x1="32" y1="116" x2="312" y2="116" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
          <line x1="32" y1="8" x2="32" y2="116" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>

          <!-- Zone indicator circles (left side) -->
          <circle cx="16" cy="26" r="4" fill="#00E5FF" fill-opacity="0.9"/>
          <circle cx="16" cy="62" r="4" fill="#E8A830" fill-opacity="0.9"/>
          <circle cx="16" cy="98" r="4" fill="#F44336" fill-opacity="0.9"/>

          <!-- Zone labels -->
          <text x="6" y="29" font-size="7" fill="#00E5FF" font-family="Inter, sans-serif" font-weight="600">H</text>
          <text x="6" y="65" font-size="7" fill="#E8A830" font-family="Inter, sans-serif" font-weight="600">M</text>
          <text x="6" y="101" font-size="7" fill="#F44336" font-family="Inter, sans-serif" font-weight="600">L</text>

          <!-- Area fill under curve -->
          <defs>
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.20"/>
              <stop offset="50%" stop-color="#E8A830" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#F44336" stop-opacity="0.20"/>
            </linearGradient>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#00E5FF"/>
              <stop offset="50%" stop-color="#E8A830"/>
              <stop offset="100%" stop-color="#F44336"/>
            </linearGradient>
          </defs>

          <!-- Area fill path -->
          <path d="M 40,95 C 52,90 64,82 80,68 C 96,54 112,48 128,52 C 148,58 168,72 188,78 C 208,82 228,76 248,62 C 268,50 288,46 300,48 L 300,116 L 40,116 Z"
                fill="url(#areaGrad)"/>

          <!-- Under-stroke (dark) -->
          <path d="M 40,95 C 52,90 64,82 80,68 C 96,54 112,48 128,52 C 148,58 168,72 188,78 C 208,82 228,76 248,62 C 268,50 288,46 300,48"
                stroke="#0a0b10"
                stroke-width="5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"/>

          <!-- Main gradient stroke -->
          <path d="M 40,95 C 52,90 64,82 80,68 C 96,54 112,48 128,52 C 148,58 168,72 188,78 C 208,82 228,76 248,62 C 268,50 288,46 300,48"
                stroke="url(#lineGrad)"
                stroke-width="2.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"/>

          <!-- Data point nodes: outer dark ring + inner colored core -->
          <g class="data-nodes">
            <!-- Node 1: Low zone (red) -->
            <circle cx="40" cy="95" r="5" fill="#0a0b10"/>
            <circle cx="40" cy="95" r="3.5" fill="#F44336"/>
            <circle cx="40" cy="95" r="1.5" fill="white" fill-opacity="0.9"/>

            <!-- Node 2: Moderate zone -->
            <circle cx="80" cy="68" r="5" fill="#0a0b10"/>
            <circle cx="80" cy="68" r="3.5" fill="#E8A830"/>
            <circle cx="80" cy="68" r="1.5" fill="white" fill-opacity="0.9"/>

            <!-- Node 3: High zone -->
            <circle cx="128" cy="52" r="5" fill="#0a0b10"/>
            <circle cx="128" cy="52" r="3.5" fill="#00E5FF"/>
            <circle cx="128" cy="52" r="1.5" fill="white" fill-opacity="0.9"/>

            <!-- Node 4: Moderate zone -->
            <circle cx="188" cy="78" r="5" fill="#0a0b10"/>
            <circle cx="188" cy="78" r="3.5" fill="#E8A830"/>
            <circle cx="188" cy="78" r="1.5" fill="white" fill-opacity="0.9"/>

            <!-- Node 5: Moderate zone -->
            <circle cx="248" cy="62" r="5" fill="#0a0b10"/>
            <circle cx="248" cy="62" r="3.5" fill="#E8A830"/>
            <circle cx="248" cy="62" r="1.5" fill="white" fill-opacity="0.9"/>

            <!-- Node 6: High zone -->
            <circle cx="300" cy="48" r="5" fill="#0a0b10"/>
            <circle cx="300" cy="48" r="3.5" fill="#00E5FF"/>
            <circle cx="300" cy="48" r="1.5" fill="white" fill-opacity="0.9"/>
          </g>

          <!-- X-axis date labels -->
          <text x="70" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Oct</text>
          <text x="170" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Nov</text>
          <text x="270" y="132" font-size="9" fill="rgba(255,255,255,0.6)" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Dec</text>
        </svg>
      </div>

      <!-- STABILITY & VOLATILITY CHART -->
      <div class="bar-chart-card">
        <div class="bar-chart-title">Capacity Stability Summary</div>
        <svg width="100%" height="100" viewBox="0 0 320 100" preserveAspectRatio="xMidYMid meet">
          <!-- Y-axis -->
          <line x1="36" y1="10" x2="36" y2="75" stroke="#cbd5e1" stroke-width="1"/>
          <line x1="36" y1="75" x2="300" y2="75" stroke="#cbd5e1" stroke-width="1"/>

          <!-- Grid lines -->
          <line x1="36" y1="26" x2="300" y2="26" stroke="#e2e8f0" stroke-width="1"/>
          <line x1="36" y1="42" x2="300" y2="42" stroke="#e2e8f0" stroke-width="1"/>
          <line x1="36" y1="58" x2="300" y2="58" stroke="#e2e8f0" stroke-width="1"/>

          <!-- Y-axis labels -->
          <text x="30" y="14" font-size="7" fill="#64748b" font-family="Inter, sans-serif" text-anchor="end">80</text>
          <text x="30" y="30" font-size="7" fill="#64748b" font-family="Inter, sans-serif" text-anchor="end">60</text>
          <text x="30" y="46" font-size="7" fill="#64748b" font-family="Inter, sans-serif" text-anchor="end">40</text>
          <text x="30" y="62" font-size="7" fill="#64748b" font-family="Inter, sans-serif" text-anchor="end">20</text>
          <text x="30" y="78" font-size="7" fill="#64748b" font-family="Inter, sans-serif" text-anchor="end">0</text>

          <!-- October bars -->
          <rect x="50" y="22" width="22" height="53" fill="#00E5FF"/>
          <rect x="76" y="55" width="22" height="20" fill="#E8A830"/>

          <!-- November bars -->
          <rect x="130" y="28" width="22" height="47" fill="#00E5FF"/>
          <rect x="156" y="50" width="22" height="25" fill="#E8A830"/>

          <!-- December bars -->
          <rect x="210" y="25" width="22" height="50" fill="#00E5FF"/>
          <rect x="236" y="52" width="22" height="23" fill="#E8A830"/>

          <!-- X-axis labels -->
          <text x="74" y="90" font-size="8" fill="#334155" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Oct</text>
          <text x="154" y="90" font-size="8" fill="#334155" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Nov</text>
          <text x="234" y="90" font-size="8" fill="#334155" font-family="Inter, sans-serif" font-weight="500" text-anchor="middle">Dec</text>

          <!-- Legend -->
          <rect x="270" y="18" width="8" height="8" fill="#00E5FF"/>
          <text x="282" y="25" font-size="6.5" fill="#334155" font-family="Inter, sans-serif">Stability</text>
          <rect x="270" y="32" width="8" height="8" fill="#E8A830"/>
          <text x="282" y="39" font-size="6.5" fill="#334155" font-family="Inter, sans-serif">Volatility</text>
        </svg>
      </div>
    </div>
  </div>

  <!-- FOOTER: PROVIDER STATEMENT + LEGAL -->
  <div class="footer-section">
    <div class="provider-title">Provider Utility Statement</div>
    <div class="provider-body">
      This artifact is an objective summary of patient-generated capacity signals. <em>It is provided to assist clinical documentation of functional status and does NOT constitute a diagnosis.</em> Inclusion of this record in a medical file serves as evidence of data review, not endorsement of subjective claims. Designed to support clinical documentation and record review (e.g., CPT 90885).
    </div>

    <!-- HOW TO USE THIS REPORT -->
    <div class="capacity-definition" style="margin-top: 10px; margin-bottom: 10px;">
      <div class="capacity-definition-title">How to Use This Report</div>
      <div class="capacity-definition-body">
        <p>This report is intended to support therapeutic conversation, reflection, and pattern recognition.</p>
        <p>It may be useful for:</p>
        <ul class="capacity-definition-list">
          <li>identifying periods of overload</li>
          <li>discussing environmental or relational stressors</li>
          <li>tracking response to interventions</li>
          <li>supporting self-awareness and regulation strategies</li>
        </ul>
        <p class="capacity-definition-footer">This report should be interpreted alongside clinical judgment and client self-report.</p>
      </div>
    </div>

    <div class="legal-block">
      <div class="legal-title">Confidential &amp; Proprietary Notice</div>
      <div class="legal-body">
        This Clinical Capacity Instrument and all underlying methodologies, algorithms, data structures, and presentation formats constitute proprietary intellectual property and trade secrets of Orbital Health Intelligence, Inc. Unauthorized reproduction, distribution, reverse engineering, derivative works, or system emulation is strictly prohibited and may result in civil liability and criminal penalties under applicable trade secret, copyright, and unfair competition laws. This document is provided solely for the confidential use of the intended recipient for clinical documentation purposes. Any disclosure, copying, or distribution to unauthorized parties is expressly forbidden. Orbital Health Intelligence, Inc. reserves the right to seek injunctive relief, actual and consequential damages, and recovery of attorneys' fees for any violation of these terms.
      </div>
      <div class="legal-rights">© 2026 Orbital Health Intelligence, Inc. All Rights Reserved.</div>
    </div>
  </div>
</div>

</body>
</html>`;
}

/**
 * Format timestamp in UTC to match golden master format
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
 * Generate placeholder hash matching golden master format
 */
function generatePlaceholderHash(): string {
  return 'sha256:8f43c9d11e7a2b8f...a72b5f1d2';
}

/**
 * Create a full CCI artifact object
 */
export function createCCIArtifact(metadata?: Partial<CCIIssuanceMetadata>): CCIArtifact {
  const now = new Date();
  const fullMetadata: CCIIssuanceMetadata = {
    generatedAt: metadata?.generatedAt || formatUTCTimestamp(now),
    protocol: metadata?.protocol || 'Structured EMA v4.2',
    observationStart: metadata?.observationStart || '2025-10-01',
    observationEnd: metadata?.observationEnd || '2025-12-31',
    integrityHash: metadata?.integrityHash || generatePlaceholderHash(),
  };

  return {
    id: `cci-q4-${Date.now()}`,
    version: 'Q4-2025',
    metadata: fullMetadata,
    html: generateCCIArtifactHTML(fullMetadata),
  };
}

/**
 * Get the golden master HTML (for comparison)
 * Uses the exact timestamp/hash from the golden master PDF
 */
export function getGoldenMasterHTML(): string {
  return generateCCIArtifactHTML({
    generatedAt: '2026-01-10 14:02:41 UTC',
    integrityHash: 'sha256:8f43c9d11e7a2b8f...a72b5f1d2',
  });
}

// =============================================================================
// CIRCLE MEMBER CAPACITY DATA — Matches brief.tsx exactly
// =============================================================================

const CIRCLE_CAPACITY_DATA: Record<string, number[]> = {
  // Mia: Stable in stretched range with some good days
  mia: [
    2.1, 2.0, 1.9, 2.0, 2.2, 2.3, 2.1, 2.0, 1.8, 1.9,
    2.0, 2.1, 2.2, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8,
    1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 2.0, 1.9, 2.0, 2.1,
    2.0, 1.9, 1.8, 1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 1.9,
    2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.9,
    2.0, 2.1, 2.2, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9,
    1.8, 1.9, 2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.2, 2.1,
    2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.9, 2.0, 2.1,
    2.0, 1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 1.9, 2.0, 2.0,
  ],
  // Zach: Clear declining pattern - started resourced, now in sentinel range
  zach: [
    2.8, 2.7, 2.8, 2.6, 2.7, 2.5, 2.6, 2.4, 2.5, 2.3,
    2.4, 2.3, 2.2, 2.3, 2.1, 2.2, 2.0, 2.1, 2.0, 1.9,
    2.0, 1.9, 1.8, 1.9, 1.8, 1.7, 1.8, 1.7, 1.6, 1.7,
    1.6, 1.7, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5, 1.4, 1.5,
    1.4, 1.5, 1.4, 1.5, 1.4, 1.3, 1.4, 1.3, 1.4, 1.3,
    1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.3, 1.4, 1.3,
    1.2, 1.3, 1.2, 1.3, 1.2, 1.3, 1.2, 1.1, 1.2, 1.3,
    1.2, 1.1, 1.2, 1.3, 1.2, 1.1, 1.2, 1.1, 1.2, 1.1,
    1.2, 1.1, 1.2, 1.1, 1.0, 1.1, 1.2, 1.1, 1.0, 1.1,
  ],
  // Lily: Improving pattern - started low, now resourced
  lily: [
    1.4, 1.5, 1.4, 1.5, 1.6, 1.5, 1.6, 1.7, 1.6, 1.7,
    1.8, 1.7, 1.8, 1.9, 1.8, 1.9, 2.0, 1.9, 2.0, 2.1,
    2.0, 2.1, 2.2, 2.1, 2.2, 2.3, 2.2, 2.3, 2.4, 2.3,
    2.4, 2.3, 2.4, 2.5, 2.4, 2.5, 2.4, 2.5, 2.6, 2.5,
    2.6, 2.5, 2.6, 2.5, 2.6, 2.7, 2.6, 2.7, 2.6, 2.7,
    2.6, 2.7, 2.8, 2.7, 2.8, 2.7, 2.8, 2.7, 2.8, 2.9,
    2.8, 2.7, 2.8, 2.9, 2.8, 2.7, 2.8, 2.9, 2.8, 2.9,
    2.8, 2.9, 2.8, 2.9, 2.8, 2.9, 3.0, 2.9, 2.8, 2.9,
    3.0, 2.9, 2.8, 2.9, 3.0, 2.9, 2.8, 2.9, 3.0, 2.9,
  ],
  // Tyler: Volatile pattern - unpredictable swings
  tyler: [
    2.2, 1.8, 2.4, 1.6, 2.6, 1.9, 2.1, 1.4, 2.5, 1.7,
    2.3, 1.5, 2.7, 1.8, 2.0, 1.3, 2.4, 1.6, 2.2, 1.9,
    2.5, 1.4, 2.1, 1.7, 2.6, 1.5, 2.3, 1.8, 2.0, 1.4,
    2.4, 1.6, 2.2, 1.9, 2.5, 1.3, 2.1, 1.7, 2.6, 1.5,
    2.3, 1.8, 2.0, 1.4, 2.4, 1.6, 2.2, 1.9, 2.5, 1.3,
    2.1, 1.7, 2.6, 1.5, 2.3, 1.8, 2.0, 1.4, 2.4, 1.6,
    2.2, 1.9, 2.5, 1.3, 2.1, 1.7, 2.6, 1.5, 2.3, 1.8,
    2.0, 1.4, 2.4, 1.6, 2.2, 1.9, 2.5, 1.3, 2.1, 1.7,
    2.6, 1.5, 2.3, 1.8, 2.0, 1.4, 2.4, 1.6, 2.2, 1.8,
  ],
  // Emma: Gradual decline with recent dip
  emma: [
    2.6, 2.5, 2.6, 2.5, 2.4, 2.5, 2.4, 2.3, 2.4, 2.3,
    2.4, 2.3, 2.2, 2.3, 2.2, 2.3, 2.2, 2.1, 2.2, 2.1,
    2.2, 2.1, 2.0, 2.1, 2.0, 2.1, 2.0, 1.9, 2.0, 1.9,
    2.0, 1.9, 2.0, 1.9, 1.8, 1.9, 1.8, 1.9, 1.8, 1.7,
    1.8, 1.7, 1.8, 1.7, 1.8, 1.7, 1.6, 1.7, 1.6, 1.7,
    1.6, 1.7, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5,
    1.4, 1.5, 1.4, 1.5, 1.4, 1.5, 1.4, 1.3, 1.4, 1.3,
    1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.3, 1.2, 1.3,
    1.2, 1.1, 1.2, 1.1, 1.2, 1.1, 1.2, 1.1, 1.2, 1.2,
  ],
};

/**
 * Downsample 90-day data to 6 representative points (matching app)
 * Takes raw values at: Day 1, Day 18, Day 36, Day 54, Day 72, Day 90
 * No averaging - preserves actual peaks/valleys for volatile patterns
 */
function downsampleTo6Points(data: number[]): number[] {
  if (data.length <= 6) return data;

  const indices = [0, 17, 35, 53, 71, 89]; // 6 evenly spaced points
  return indices.map(i => data[Math.min(i, data.length - 1)]);
}

/**
 * Generate smooth Bezier curve path from points (monotone cubic interpolation)
 * Matches the app's CCIChart rendering style
 */
function generateBezierPath(data: number[], width: number, height: number): string {
  const points = downsampleTo6Points(data);
  if (points.length < 2) return '';

  const coords: { x: number; y: number }[] = points.map((value, index) => ({
    x: Math.round((index / (points.length - 1)) * width),
    y: Math.round(height - ((value - 1.0) / 2.0) * height)
  }));

  // Clamp Y values within bounds
  coords.forEach(p => {
    p.y = Math.max(2, Math.min(height - 2, p.y));
  });

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
function generateAreaPath(data: number[], width: number, height: number): string {
  const linePath = generateBezierPath(data, width, height);
  if (!linePath) return '';

  // Close path to bottom corners for area fill
  return `${linePath} L ${width},${height} L 0,${height} Z`;
}

/**
 * Get downsampled points with coordinates for node markers
 */
function getChartNodes(data: number[], width: number, height: number): { x: number; y: number; value: number }[] {
  const points = downsampleTo6Points(data);
  return points.map((value, index) => ({
    x: Math.round((index / (points.length - 1)) * width),
    y: Math.max(2, Math.min(height - 2, Math.round(height - ((value - 1.0) / 2.0) * height))),
    value
  }));
}

/**
 * Get capacity color based on value (4-tier matching app exactly)
 */
function getCapacityColor(value: number): string {
  if (value >= 2.5) return '#00E5FF'; // Cyan - Resourced
  if (value >= 2.0) return '#10B981'; // Green - Good
  if (value >= 1.5) return '#E8A830'; // Amber - Stretched
  return '#F44336'; // Red - Depleted
}

/**
 * Generate multi-layer node markers SVG (matching app style)
 */
function generateNodeMarkers(nodes: { x: number; y: number; value: number }[]): string {
  return nodes.map(node => {
    const color = getCapacityColor(node.value);
    return `
      <circle cx="${node.x}" cy="${node.y}" r="5" fill="#0a0b10"/>
      <circle cx="${node.x}" cy="${node.y}" r="3.5" fill="${color}"/>
      <circle cx="${node.x}" cy="${node.y}" r="1.5" fill="white" fill-opacity="0.9"/>`;
  }).join('');
}

/**
 * Generate Circle CCI artifact HTML
 *
 * Returns HTML for Circle capacity report with 5 individual member charts.
 * Matches the brief.tsx Circle view: Mia, Zach, Lily, Tyler, Emma.
 */
export function generateCircleCCIArtifactHTML(metadata?: Partial<CCIIssuanceMetadata>): string {
  const now = new Date();
  const timestamp = metadata?.generatedAt || formatUTCTimestamp(now);
  const hash = metadata?.integrityHash || generatePlaceholderHash();

  // Chart dimensions matching app
  const chartWidth = 372;
  const chartHeight = 50;

  // Generate Bezier curve paths (smooth, 6 points)
  const miaPath = generateBezierPath(CIRCLE_CAPACITY_DATA.mia, chartWidth, chartHeight);
  const zachPath = generateBezierPath(CIRCLE_CAPACITY_DATA.zach, chartWidth, chartHeight);
  const lilyPath = generateBezierPath(CIRCLE_CAPACITY_DATA.lily, chartWidth, chartHeight);
  const tylerPath = generateBezierPath(CIRCLE_CAPACITY_DATA.tyler, chartWidth, chartHeight);
  const emmaPath = generateBezierPath(CIRCLE_CAPACITY_DATA.emma, chartWidth, chartHeight);

  // Generate area fill paths
  const miaArea = generateAreaPath(CIRCLE_CAPACITY_DATA.mia, chartWidth, chartHeight);
  const zachArea = generateAreaPath(CIRCLE_CAPACITY_DATA.zach, chartWidth, chartHeight);
  const lilyArea = generateAreaPath(CIRCLE_CAPACITY_DATA.lily, chartWidth, chartHeight);
  const tylerArea = generateAreaPath(CIRCLE_CAPACITY_DATA.tyler, chartWidth, chartHeight);
  const emmaArea = generateAreaPath(CIRCLE_CAPACITY_DATA.emma, chartWidth, chartHeight);

  // Get node markers for each member (6 points with multi-layer styling)
  const miaNodes = getChartNodes(CIRCLE_CAPACITY_DATA.mia, chartWidth, chartHeight);
  const zachNodes = getChartNodes(CIRCLE_CAPACITY_DATA.zach, chartWidth, chartHeight);
  const lilyNodes = getChartNodes(CIRCLE_CAPACITY_DATA.lily, chartWidth, chartHeight);
  const tylerNodes = getChartNodes(CIRCLE_CAPACITY_DATA.tyler, chartWidth, chartHeight);
  const emmaNodes = getChartNodes(CIRCLE_CAPACITY_DATA.emma, chartWidth, chartHeight);

  // Generate node marker SVG for each member
  const miaMarkers = generateNodeMarkers(miaNodes);
  const zachMarkers = generateNodeMarkers(zachNodes);
  const lilyMarkers = generateNodeMarkers(lilyNodes);
  const tylerMarkers = generateNodeMarkers(tylerNodes);
  const emmaMarkers = generateNodeMarkers(emmaNodes);

  // Get dominant colors for gradients (based on downsampled data)
  const miaDownsampled = downsampleTo6Points(CIRCLE_CAPACITY_DATA.mia);
  const zachDownsampled = downsampleTo6Points(CIRCLE_CAPACITY_DATA.zach);
  const lilyDownsampled = downsampleTo6Points(CIRCLE_CAPACITY_DATA.lily);
  const tylerDownsampled = downsampleTo6Points(CIRCLE_CAPACITY_DATA.tyler);
  const emmaDownsampled = downsampleTo6Points(CIRCLE_CAPACITY_DATA.emma);

  const miaStartColor = getCapacityColor(miaDownsampled[0]);
  const miaEndColor = getCapacityColor(miaDownsampled[miaDownsampled.length - 1]);
  const zachStartColor = getCapacityColor(zachDownsampled[0]);
  const zachEndColor = getCapacityColor(zachDownsampled[zachDownsampled.length - 1]);
  const lilyStartColor = getCapacityColor(lilyDownsampled[0]);
  const lilyEndColor = getCapacityColor(lilyDownsampled[lilyDownsampled.length - 1]);
  const tylerStartColor = getCapacityColor(tylerDownsampled[0]);
  const tylerEndColor = getCapacityColor(tylerDownsampled[tylerDownsampled.length - 1]);
  const emmaStartColor = getCapacityColor(emmaDownsampled[0]);
  const emmaEndColor = getCapacityColor(emmaDownsampled[emmaDownsampled.length - 1]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Circle Capacity Instrument</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @page { size: 612px 792px; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 612px; height: 792px; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px; line-height: 1.5; color: #1e293b; background: #fff;
      -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    }
    .page { width: 612px; height: 792px; padding: 28px 36px 24px 36px; background: #fff; position: relative; }
    .artifact-title {
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: #0f172a;
      text-align: center; margin-bottom: 4px; padding-bottom: 6px;
      border-bottom: 2px solid #00E5FF; letter-spacing: 0.8px; text-transform: uppercase;
    }
    .circle-badge {
      display: inline-block; background: rgba(0,229,255,0.15); color: #00E5FF;
      padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 600;
      letter-spacing: 0.5px; margin-left: 6px;
    }
    .chain-of-custody { padding: 8px 0 10px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px; }
    .coc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
    .coc-line { font-size: 8px; line-height: 1.5; color: #1e293b; }
    .coc-label { font-family: 'Inter', sans-serif; font-weight: 600; color: #0f172a; text-transform: uppercase; font-size: 7px; letter-spacing: 0.5px; }
    .coc-value { font-family: 'Inter', sans-serif; font-weight: 400; color: #334155; }
    .coc-value-mono { font-family: 'JetBrains Mono', 'Consolas', monospace; font-size: 7.5px; color: #334155; letter-spacing: -0.2px; }
    .coc-value em { font-style: italic; color: #475569; }
    .coc-status { font-family: 'Inter', sans-serif; font-weight: 700; color: #0f172a; letter-spacing: 0.5px; }
    .section-title { font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 700; color: #0f172a; margin-bottom: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
    .section-subtitle { font-family: 'Inter', sans-serif; font-size: 7px; color: #64748b; margin-bottom: 8px; }
    .circle-info { margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 3px 10px; font-size: 8px; }
    .info-label { font-family: 'Inter', sans-serif; font-weight: 600; color: #0f172a; }
    .info-value { font-family: 'Inter', sans-serif; color: #334155; }
    .info-value-mono { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #334155; }
    .members-grid { display: flex; flex-direction: column; gap: 6px; }
    .member-card { display: flex; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; }
    .member-info { width: 120px; flex-shrink: 0; padding-right: 8px; border-right: 1px solid #e2e8f0; }
    .member-name { font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600; color: #0f172a; margin-bottom: 2px; }
    .member-username { font-family: 'Inter', sans-serif; font-size: 7px; color: #64748b; margin-bottom: 4px; }
    .member-detail { font-family: 'Inter', sans-serif; font-size: 7px; color: #475569; margin-bottom: 1px; }
    .member-detail-label { font-weight: 600; color: #334155; }
    .status-badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 6.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .status-resourced { background: rgba(0,229,255,0.15); color: #00b8d9; }
    .status-stretched { background: rgba(232,168,48,0.15); color: #b8860b; }
    .status-depleted { background: rgba(244,67,54,0.15); color: #d32f2f; }
    .member-chart { flex: 1; padding-left: 8px; }
    .chart-card { background: #0a0b10; border-radius: 3px; padding: 4px 6px 2px 6px; height: 100%; }
    .footer-section { border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px; }
    .legal-block { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 8px; }
    .legal-title { font-family: 'Inter', sans-serif; font-size: 6px; font-weight: 700; color: #0f172a; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .legal-body { font-family: 'Inter', sans-serif; font-size: 6px; line-height: 1.4; color: #475569; }
    .legal-rights { font-family: 'Inter', sans-serif; font-size: 6px; font-weight: 700; color: #0f172a; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.8px; }
    @media print { .page { border: none; } .chart-card, svg rect, svg circle, svg path, svg line { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>

<div class="page">
  <h1 class="artifact-title">Circle Capacity Instrument<span class="circle-badge">CIRCLE</span></h1>

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

  <div class="circle-info">
    <div class="info-grid">
      <span class="info-label">Circle ID:</span>
      <span class="info-value-mono">SSG-2025-Q4</span>
      <span class="info-label">Members:</span>
      <span class="info-value">5</span>
      <span class="info-label">Circle Name:</span>
      <span class="info-value">Sensory Support Group</span>
      <span class="info-label">Coordinator:</span>
      <span class="info-value">Emily Zhang</span>
    </div>
  </div>

  <div class="section-title">Member Capacity — 90 Days</div>
  <div class="section-subtitle">Non-diagnostic. Per-member view. Observation period: Oct 1, 2025 – Dec 31, 2025</div>

  <div class="members-grid">
    <!-- Member 1: Mia - Stretched, Flat -->
    <div class="member-card">
      <div class="member-info">
        <div class="member-name">Mia Anderson</div>
        <div class="member-username">@mia</div>
        <div class="member-detail"><span class="member-detail-label">Status:</span> <span class="status-badge status-stretched">Stretched</span></div>
        <div class="member-detail"><span class="member-detail-label">Trend:</span> Flat</div>
        <div class="member-detail"><span class="member-detail-label">Participation:</span> 6/7</div>
        <div class="member-detail"><span class="member-detail-label">Notes:</span> Sensory sensitivity</div>
      </div>
      <div class="member-chart">
        <div class="chart-card">
          <svg width="100%" height="54" viewBox="0 0 ${chartWidth} ${chartHeight + 4}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="miaGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${miaStartColor}"/><stop offset="100%" stop-color="${miaEndColor}"/></linearGradient>
              <linearGradient id="miaAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${miaEndColor}" stop-opacity="0.20"/><stop offset="100%" stop-color="${miaEndColor}" stop-opacity="0.02"/></linearGradient>
            </defs>
            <rect x="0" y="0" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#00E5FF" fill-opacity="0.08"/>
            <rect x="0" y="${Math.round(chartHeight / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#E8A830" fill-opacity="0.06"/>
            <rect x="0" y="${Math.round(chartHeight * 2 / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#F44336" fill-opacity="0.08"/>
            <path d="${miaArea}" fill="url(#miaAreaGrad)"/>
            <path d="${miaPath}" stroke="#0a0b10" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${miaPath}" stroke="url(#miaGrad)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            ${miaMarkers}
          </svg>
        </div>
      </div>
    </div>

    <!-- Member 2: Zach - Depleted, Declining -->
    <div class="member-card">
      <div class="member-info">
        <div class="member-name">Zach Teguns</div>
        <div class="member-username">@zach</div>
        <div class="member-detail"><span class="member-detail-label">Status:</span> <span class="status-badge status-depleted">Depleted</span></div>
        <div class="member-detail"><span class="member-detail-label">Trend:</span> Declining</div>
        <div class="member-detail"><span class="member-detail-label">Participation:</span> 7/7</div>
        <div class="member-detail"><span class="member-detail-label">Notes:</span> Sleep disruption</div>
      </div>
      <div class="member-chart">
        <div class="chart-card">
          <svg width="100%" height="54" viewBox="0 0 ${chartWidth} ${chartHeight + 4}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="zachGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${zachStartColor}"/><stop offset="100%" stop-color="${zachEndColor}"/></linearGradient>
              <linearGradient id="zachAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${zachStartColor}" stop-opacity="0.20"/><stop offset="100%" stop-color="${zachEndColor}" stop-opacity="0.02"/></linearGradient>
            </defs>
            <rect x="0" y="0" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#00E5FF" fill-opacity="0.08"/>
            <rect x="0" y="${Math.round(chartHeight / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#E8A830" fill-opacity="0.06"/>
            <rect x="0" y="${Math.round(chartHeight * 2 / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#F44336" fill-opacity="0.08"/>
            <path d="${zachArea}" fill="url(#zachAreaGrad)"/>
            <path d="${zachPath}" stroke="#0a0b10" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${zachPath}" stroke="url(#zachGrad)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            ${zachMarkers}
          </svg>
        </div>
      </div>
    </div>

    <!-- Member 3: Lily - Resourced, Improving -->
    <div class="member-card">
      <div class="member-info">
        <div class="member-name">Lily Teguns</div>
        <div class="member-username">@lily</div>
        <div class="member-detail"><span class="member-detail-label">Status:</span> <span class="status-badge status-resourced">Resourced</span></div>
        <div class="member-detail"><span class="member-detail-label">Trend:</span> Improving</div>
        <div class="member-detail"><span class="member-detail-label">Participation:</span> 5/5</div>
        <div class="member-detail"><span class="member-detail-label">Notes:</span> Steady progress</div>
      </div>
      <div class="member-chart">
        <div class="chart-card">
          <svg width="100%" height="54" viewBox="0 0 ${chartWidth} ${chartHeight + 4}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="lilyGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${lilyStartColor}"/><stop offset="100%" stop-color="${lilyEndColor}"/></linearGradient>
              <linearGradient id="lilyAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${lilyEndColor}" stop-opacity="0.20"/><stop offset="100%" stop-color="${lilyStartColor}" stop-opacity="0.02"/></linearGradient>
            </defs>
            <rect x="0" y="0" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#00E5FF" fill-opacity="0.08"/>
            <rect x="0" y="${Math.round(chartHeight / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#E8A830" fill-opacity="0.06"/>
            <rect x="0" y="${Math.round(chartHeight * 2 / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#F44336" fill-opacity="0.08"/>
            <path d="${lilyArea}" fill="url(#lilyAreaGrad)"/>
            <path d="${lilyPath}" stroke="#0a0b10" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${lilyPath}" stroke="url(#lilyGrad)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            ${lilyMarkers}
          </svg>
        </div>
      </div>
    </div>

    <!-- Member 4: Tyler - Stretched, Flat (Volatile) -->
    <div class="member-card">
      <div class="member-info">
        <div class="member-name">Tyler Ramirez</div>
        <div class="member-username">@tyler</div>
        <div class="member-detail"><span class="member-detail-label">Status:</span> <span class="status-badge status-stretched">Stretched</span></div>
        <div class="member-detail"><span class="member-detail-label">Trend:</span> Volatile</div>
        <div class="member-detail"><span class="member-detail-label">Participation:</span> 5/5</div>
        <div class="member-detail"><span class="member-detail-label">Notes:</span> Transition support</div>
      </div>
      <div class="member-chart">
        <div class="chart-card">
          <svg width="100%" height="54" viewBox="0 0 ${chartWidth} ${chartHeight + 4}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="tylerGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${tylerStartColor}"/><stop offset="100%" stop-color="${tylerEndColor}"/></linearGradient>
              <linearGradient id="tylerAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${tylerEndColor}" stop-opacity="0.20"/><stop offset="100%" stop-color="${tylerEndColor}" stop-opacity="0.02"/></linearGradient>
            </defs>
            <rect x="0" y="0" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#00E5FF" fill-opacity="0.08"/>
            <rect x="0" y="${Math.round(chartHeight / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#E8A830" fill-opacity="0.06"/>
            <rect x="0" y="${Math.round(chartHeight * 2 / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#F44336" fill-opacity="0.08"/>
            <path d="${tylerArea}" fill="url(#tylerAreaGrad)"/>
            <path d="${tylerPath}" stroke="#0a0b10" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${tylerPath}" stroke="url(#tylerGrad)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            ${tylerMarkers}
          </svg>
        </div>
      </div>
    </div>

    <!-- Member 5: Emma - Depleted, Declining -->
    <div class="member-card">
      <div class="member-info">
        <div class="member-name">Emily Zhang</div>
        <div class="member-username">@emma</div>
        <div class="member-detail"><span class="member-detail-label">Status:</span> <span class="status-badge status-depleted">Depleted</span></div>
        <div class="member-detail"><span class="member-detail-label">Trend:</span> Declining</div>
        <div class="member-detail"><span class="member-detail-label">Participation:</span> 5/5</div>
        <div class="member-detail"><span class="member-detail-label">Notes:</span> Schedule changes</div>
      </div>
      <div class="member-chart">
        <div class="chart-card">
          <svg width="100%" height="54" viewBox="0 0 ${chartWidth} ${chartHeight + 4}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="emmaGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${emmaStartColor}"/><stop offset="100%" stop-color="${emmaEndColor}"/></linearGradient>
              <linearGradient id="emmaAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${emmaStartColor}" stop-opacity="0.20"/><stop offset="100%" stop-color="${emmaEndColor}" stop-opacity="0.02"/></linearGradient>
            </defs>
            <rect x="0" y="0" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#00E5FF" fill-opacity="0.08"/>
            <rect x="0" y="${Math.round(chartHeight / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#E8A830" fill-opacity="0.06"/>
            <rect x="0" y="${Math.round(chartHeight * 2 / 3)}" width="${chartWidth}" height="${Math.round(chartHeight / 3)}" fill="#F44336" fill-opacity="0.08"/>
            <path d="${emmaArea}" fill="url(#emmaAreaGrad)"/>
            <path d="${emmaPath}" stroke="#0a0b10" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${emmaPath}" stroke="url(#emmaGrad)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            ${emmaMarkers}
          </svg>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-section">
    <div class="legal-block">
      <div class="legal-title">Confidential &amp; Proprietary Notice</div>
      <div class="legal-body">
        This Circle Capacity Instrument and all underlying methodologies, algorithms, data structures, and presentation formats constitute proprietary intellectual property of Orbital Health Intelligence, Inc. This is NOT a diagnostic tool. Not a symptom severity scale. For coordination purposes only.
      </div>
      <div class="legal-rights">© 2026 Orbital Health Intelligence, Inc. All Rights Reserved.</div>
    </div>
  </div>
</div>

</body>
</html>`;
}

/**
 * Get the Circle CCI golden master HTML
 */
export function getCircleGoldenMasterHTML(): string {
  return generateCircleCCIArtifactHTML({
    generatedAt: '2026-01-10 14:02:41 UTC',
    integrityHash: 'sha256:c7e91a4b22f8d3c1...b92e1f8a3',
  });
}

// =============================================================================
// JSON EXPORT FORMAT
// =============================================================================

/**
 * Create a machine-readable JSON export of the CCI artifact.
 *
 * DOCTRINE: CCI Artifact vs. Raw Data
 * This provides a structured, signed document format for clinical integrations.
 * The JSON format complements (does not replace) the HTML/PDF artifact.
 *
 * Use cases:
 * - EHR integration
 * - Clinical data exchange
 * - Programmatic verification
 * - Research exports (with consent)
 */
export function createCCIArtifactJSON(
  metadata?: Partial<CCIIssuanceMetadata>,
  patientId?: string
): CCIArtifactJSON {
  const now = new Date();
  const timestamp = metadata?.generatedAt || formatUTCTimestamp(now);
  const hash = metadata?.integrityHash || generatePlaceholderHash();

  const observationStart = metadata?.observationStart || '2025-10-01';
  const observationEnd = metadata?.observationEnd || '2025-12-31';

  return {
    $schema: 'https://orbital.health/schemas/cci-q4-2025.json',
    type: 'CCI-Q4',
    id: `cci-q4-${Date.now()}`,
    version: 'Q4-2025',
    metadata: {
      generatedAt: timestamp,
      protocol: metadata?.protocol || 'Structured EMA v4.2',
      observationStart,
      observationEnd,
      integrityHash: hash,
    },
    summary: {
      patientId: patientId || '34827-AFJ',
      observationPeriod: {
        start: observationStart,
        end: observationEnd,
        status: 'closed',
      },
      reportingQuality: {
        trackingContinuity: 85,
        trackingContinuityRating: 'high',
        responseTimingMeanMs: 4200,
        patternStability: 92,
        verdict: 'Interpretable Capacity Trends',
      },
      monthlyBreakdown: [
        { month: '2025-10', stability: 66, volatility: 25 },
        { month: '2025-11', stability: 59, volatility: 31 },
        { month: '2025-12', stability: 63, volatility: 29 },
      ],
    },
    legal: {
      confidential: true,
      copyright: '© 2026 Orbital Health Intelligence, Inc. All Rights Reserved.',
      disclaimer:
        'This artifact is an objective summary of patient-generated capacity signals. ' +
        'It does NOT constitute a diagnosis. Designed to support clinical documentation.',
    },
    signature: {
      algorithm: 'sha256',
      hash,
      signedAt: timestamp,
    },
  };
}

/**
 * Convert CCI artifact to JSON string with pretty formatting.
 */
export function serializeCCIArtifactJSON(artifact: CCIArtifactJSON): string {
  return JSON.stringify(artifact, null, 2);
}
