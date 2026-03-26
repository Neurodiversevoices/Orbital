/**
 * CCI Clinical Artifact v1 — Shared HTML Builder
 *
 * Generates the static HTML layout for the 6-section Clinical Artifact.
 * Consumed by both cciToPDF.ts (for expo-print rendering) and
 * cciToFHIR.ts (for the human-readable FHIR attachment).
 *
 * The HTML uses inline CSS matching the React Native component's
 * artifact-specific color palette — NOT the app-wide theme.
 */

import type { CCIV1Data } from './generateCCIV1Data';

// =============================================================================
// HTML BUILDER
// =============================================================================

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type ClassificationColor = { color: string; bg: string; border: string };

function getBaselineColor(val: string): ClassificationColor {
  switch (val) {
    case 'Above': return { color: '#56CCF2', bg: 'rgba(86,204,242,0.08)', border: 'rgba(86,204,242,0.15)' };
    case 'Near': return { color: '#D4A843', bg: 'rgba(212,168,67,0.08)', border: 'rgba(212,168,67,0.15)' };
    case 'Below': return { color: '#C94444', bg: 'rgba(201,68,68,0.08)', border: 'rgba(201,68,68,0.15)' };
    default: return { color: '#D4A843', bg: 'rgba(212,168,67,0.08)', border: 'rgba(212,168,67,0.15)' };
  }
}

function getDirectionIcon(dir: string): string {
  switch (dir) {
    case 'Increasing': return '↑';
    case 'Decreasing': return '↓';
    default: return '→';
  }
}

function getAreaIcon(dir: string): string {
  switch (dir) {
    case 'Increased': return '↑';
    case 'Decreased': return '↓';
    default: return '→';
  }
}

function getAreaColor(dir: string): string {
  switch (dir) {
    case 'Increased': return '#56CCF2';
    case 'Decreased': return '#C94444';
    default: return '#D4A843';
  }
}

function getBaselineBarWidth(baseline: string): string {
  switch (baseline) {
    case 'Above': return '85%';
    case 'Near': return '50%';
    case 'Below': return '20%';
    default: return '50%';
  }
}

/**
 * Build a self-contained HTML document for the CCI Clinical Artifact v1.
 *
 * @param data - The computed CCIV1Data
 * @returns Complete HTML string with embedded CSS and Google Fonts
 */
export function buildCCIV1HTML(data: CCIV1Data): string {
  const baselineColor = getBaselineColor(data.baseline90Day);
  const dirColor = getBaselineColor(
    data.direction30Day === 'Increasing' ? 'Above' :
    data.direction30Day === 'Decreasing' ? 'Below' : 'Near'
  );
  const dirIcon = getDirectionIcon(data.direction30Day);
  const coveragePct = Math.round((data.coverageDays / data.coverageTotal) * 100);
  const coverageBarColor = coveragePct > 70 ? '#56CCF2' : '#D4A843';

  const areasHTML = data.areasOfChange.map((item) => {
    const aColor = getAreaColor(item.direction);
    const aIcon = getAreaIcon(item.direction);
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:6px;border-left:2px solid ${aColor};margin-bottom:6px;">
        <span style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#E8E9ED;">${item.area}</span>
        <span style="font-family:'Space Mono',monospace;font-size:11px;color:${aColor};display:inline-flex;align-items:center;gap:4px;">
          <span style="font-size:13px;">${aIcon}</span>${item.direction}
        </span>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: 612px 792px; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', -apple-system, sans-serif;
      background: #01020A;
      color: #E8E9ED;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .mono { font-family: 'Space Mono', monospace; }
    .container { width: 100%; max-width: 380px; }
    .context-label {
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #5A5E72;
      margin-bottom: 8px;
      padding-left: 2px;
    }
    .card {
      background: #0A0C14;
      border: 1px solid #1A1D2E;
      border-radius: 10px;
      overflow: hidden;
    }
    .section { padding: 14px 20px; }
    .section-header { padding: 16px 20px 14px; }
    .divider { height: 1px; background: #1A1D2E; }
    .section-row { display: flex; justify-content: space-between; align-items: center; }
    .mono-label {
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      font-weight: 400;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5A5E72;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.04em;
      border: 1px solid;
    }
    .footer {
      padding: 12px 20px;
      background: rgba(255,255,255,0.06);
      border-top: 1px solid #1A1D2E;
    }
    .footer-text {
      font-family: 'Space Mono', monospace;
      font-size: 8px;
      line-height: 1.7;
      color: #5A5E72;
      letter-spacing: 0.04em;
    }
    .fhir-meta {
      margin-top: 10px;
      font-family: 'Space Mono', monospace;
      font-size: 8px;
      color: #5A5E72;
      display: flex;
      justify-content: space-between;
      padding: 0 2px;
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="context-label">EHR Sidebar • Clinical Capacity Instrument</div>

    <div class="card">
      <!-- Section 1: ID Header -->
      <div class="section-header">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:15px;font-weight:600;color:#E8E9ED;letter-spacing:-0.01em;margin-bottom:2px;">Clinical Capacity Instrument</div>
            <div class="mono" style="font-size:10px;color:#5A5E72;letter-spacing:0.08em;">${data.instrumentVersion} • ${data.fhirResourceType}</div>
          </div>
          <div class="mono" style="font-size:10px;color:#8B8FA3;text-align:right;line-height:1.6;">
            <div style="color:#56CCF2;font-weight:700;font-size:11px;">${data.reportId}</div>
            <div>${formatDisplayDate(data.generatedDate)}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:14px;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:6px;">
          <div>
            <span class="mono-label">Client ID</span>
            <div style="font-size:14px;font-weight:500;color:#E8E9ED;margin-top:2px;">${data.clientId}</div>
          </div>
          <div>
            <span class="mono-label">Provider</span>
            <div style="font-size:12px;font-weight:500;color:#E8E9ED;margin-top:2px;">${data.providerName}</div>
          </div>
          <div>
            <span class="mono-label">Period</span>
            <div style="font-size:12px;font-weight:500;color:#E8E9ED;margin-top:2px;">${formatDisplayDate(data.periodStart)} — ${formatDisplayDate(data.periodEnd)}</div>
          </div>
          <div>
            <span class="mono-label">NPI</span>
            <div style="font-size:12px;font-weight:500;color:#E8E9ED;margin-top:2px;">${data.providerNPI}</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Section 2: 90-Day Baseline -->
      <div class="section">
        <div class="section-row">
          <span class="mono-label">90-Day Baseline</span>
          <span class="chip" style="background:${baselineColor.bg};border-color:${baselineColor.border};color:${baselineColor.color};">${data.baseline90Day}</span>
        </div>
        <div style="margin-top:10px;height:4px;border-radius:2px;background:rgba(255,255,255,0.04);position:relative;overflow:visible;">
          <div style="position:absolute;top:0;left:0;height:100%;border-radius:2px;background:${baselineColor.color};opacity:0.6;width:${getBaselineBarWidth(data.baseline90Day)};"></div>
          <div style="position:absolute;top:-1px;left:20%;width:1px;height:6px;background:#2A2D3E;"></div>
          <div style="position:absolute;top:-1px;left:50%;width:1px;height:6px;background:#2A2D3E;"></div>
          <div style="position:absolute;top:-1px;left:80%;width:1px;height:6px;background:#2A2D3E;"></div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Section 3: 30-Day Direction -->
      <div class="section">
        <div class="section-row">
          <span class="mono-label">30-Day Direction</span>
          <span class="chip" style="background:${dirColor.bg};border-color:${dirColor.border};color:${dirColor.color};">
            <span style="font-size:15px;line-height:1;">${dirIcon}</span>
            ${data.direction30Day}
          </span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Section 4: Areas Showing Most Change -->
      <div class="section">
        <span class="mono-label">Areas Showing Most Change</span>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">
          ${areasHTML}
        </div>
      </div>

      <div class="divider"></div>

      <!-- Section 5: Coverage -->
      <div class="section">
        <div class="section-row" style="margin-bottom:8px;">
          <span class="mono-label">Coverage</span>
          <span class="mono" style="font-size:13px;color:#E8E9ED;font-weight:700;">${data.coverageDays} of ${data.coverageTotal} days</span>
        </div>
        <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.04);overflow:hidden;">
          <div style="height:100%;border-radius:3px;width:${coveragePct}%;background:${coverageBarColor};opacity:0.7;"></div>
        </div>
        <div class="mono" style="font-size:9px;color:#5A5E72;margin-top:4px;text-align:right;">${coveragePct}% DATA COVERAGE</div>
      </div>

      <!-- Section 6: Governance Footer -->
      <div class="footer">
        <div class="footer-text">
          This instrument is generated from self-reported capacity check-ins only. It is not a substitute for professional judgment or formal records of care. Provider interpretation required.
        </div>
        <div style="margin-top:6px;display:flex;justify-content:space-between;" class="footer-text">
          <span>ORBITAL HEALTH • ${data.instrumentVersion}</span>
          <span>FHIR DocumentReference Ready</span>
        </div>
      </div>
    </div>

    <div class="fhir-meta">
      <span>resourceType: DocumentReference</span>
      <span>status: current</span>
    </div>
  </div>
</body>
</html>`;
}
