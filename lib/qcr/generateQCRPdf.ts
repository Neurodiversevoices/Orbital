/**
 * QCR PDF Generation
 *
 * Client-side PDF generation for Quarterly Capacity Report.
 * Uses expo-print for HTML-to-PDF conversion.
 * Institutional artifact — suitable for EHR attachment, procurement workflows.
 *
 * Pricing: $149/quarter (institutional tier)
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { QuarterlyCapacityReport, getQuarterLabel } from './types';

// Methodology statement (institutional compliance)
const METHODOLOGY_STATEMENT =
  'Capacity Index derived from structured self-reported state observations using a three-level ecological momentary assessment model.';

// What Is Capacity Index? - Institutional definition
const CAPACITY_INDEX_DEFINITION = `
<p><strong>Capacity Index</strong> is a composite measure derived from structured self-reported state observations and correlated inputs including sleep, energy, and cognitive load. The index (0–100) represents an individual's functional capacity at a given moment.</p>
<p>Four signal sources contribute to the composite:</p>
<ol>
  <li><strong>Sleep Quality</strong> — Self-reported sleep duration and restfulness</li>
  <li><strong>Energy Level</strong> — Subjective energy rating at time of observation</li>
  <li><strong>Cognitive Load</strong> — Self-assessed focus, processing speed, and mental load tolerance</li>
  <li><strong>Subjective State</strong> — Direct capacity signal ("How resourced do you feel right now?")</li>
</ol>
<p>These inputs are triangulated using a weighted composite algorithm. No single input dominates; the index reflects convergent signal strength across dimensions.</p>
<div class="interpretation-box">
  <p class="interp-title">Index Interpretation:</p>
  <p><span class="state-resourced">67–100: Resourced</span> — Operating within sustainable capacity</p>
  <p><span class="state-stretched">34–66: Stretched</span> — Elevated load, recovery recommended</p>
  <p><span class="state-depleted">0–33: Depleted</span> — Functional impairment likely, intervention warranted</p>
</div>
`;

// Multi-person aggregation statement
const MULTI_PERSON_STATEMENT = `
<p><strong>Institutional Use Note:</strong></p>
<p>When this report is generated for a cohort (e.g., residency program, department, or sponsored group), individual-level data is <strong>never aggregated or visible</strong> to administrators. Cohort-level Strategic Briefs use anonymized, aggregate metrics only.</p>
<p>This report reflects a single individual's longitudinal record and is intended for that individual's clinical or personal use, or for sharing at their discretion with a provider or advocate.</p>
<p>Orbital does not provide institutional dashboards, comparative rankings, or identifiable cohort analytics.</p>
`;

/**
 * Generate and export QCR as PDF
 *
 * Export flow:
 * 1. generateQCRHtml(report) → HTML string with inline CSS + SVG
 * 2. Print.printToFileAsync({ html, base64: false }) → PDF file
 * 3. FileSystem.moveAsync() → rename to QCR_{quarterId}_{timestamp}.pdf
 * 4. Sharing.shareAsync() → share dialog
 */
export async function exportQCRToPdf(report: QuarterlyCapacityReport): Promise<boolean> {
  Sentry.addBreadcrumb({
    category: 'qcr',
    message: `PDF export started: ${report.period.quarterId}`,
    level: 'info',
    data: { dataPoints: report.chartData.dailyCapacity.length },
  });

  try {
    const html = generateQCRHtml(report);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Rename to meaningful filename: QCR_{quarterId}_{timestamp}.pdf
    const filename = `QCR_${report.period.quarterId}_${Date.now()}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    // Share the PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Quarterly Capacity Report - ${getQuarterLabel(report.period.quarterId)}`,
        UTI: 'com.adobe.pdf',
      });
      return true;
    } else {
      // Fallback for web or unsupported platforms
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      }
      return true;
    }
  } catch (error) {
    if (__DEV__) console.error('[QCR PDF] Export failed:', error);

    // Capture PDF failure to Sentry — critical for App Review diagnostics
    Sentry.withScope((scope) => {
      scope.setTag('feature', 'qcr_pdf');
      scope.setTag('qcr.quarter', report.period.quarterId);
      scope.setLevel('error');
      scope.setExtra('report_id', report.id);
      scope.setExtra('data_points', report.chartData.dailyCapacity.length);
      Sentry.captureException(
        error instanceof Error ? error : new Error(`[QCR PDF] Export failed: ${String(error)}`)
      );
    });

    return false;
  }
}

/**
 * Generate HTML document for PDF conversion
 * Returns complete HTML with inline CSS and inline SVG charts.
 * No external assets.
 *
 * Structure (per institutional spec):
 * 1. Header
 * 2. What Is Capacity Index?
 * 3. Record Depth & Coverage
 * 4. Weekly Mean Capacity (PRIMARY)
 * 5. Capacity Composition & Correlations
 * 6. Daily Capacity Index (SUPPLEMENTARY with caption)
 * 7. State Distribution
 * 8. Pattern Metrics
 * 9. Week Structure
 * 10. Driver Frequency
 * 11. Notable Episodes
 * 12. Clinical & Operational Insights
 * 13. Multi-Person Aggregation Statement
 * 14. Footer
 */
export function generateQCRHtml(report: QuarterlyCapacityReport): string {
  const quarterLabel = getQuarterLabel(report.period.quarterId);
  const generatedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format Chain of Custody timestamps
  const cocGenerated = report.chainOfCustody.generatedTimestamp;
  const cocWindowStart = new Date(report.chainOfCustody.observationWindowStart).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  const cocWindowEnd = new Date(report.chainOfCustody.observationWindowEnd).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  // Determine verdict CSS class
  const verdictClass = report.signalFidelity.verdict === 'CLINICALLY RELIABLE SIGNAL' ? 'reliable' :
    report.signalFidelity.verdict === 'ACCEPTABLE SIGNAL QUALITY' ? 'acceptable' : 'concerns';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quarterly Capacity Report - ${quarterLabel}</title>
  <style>
${getPdfStyles()}
  </style>
</head>
<body>
  <div class="document">
    <!-- Chain of Custody Lock (Forensic Header) -->
    <div class="chain-of-custody">
      <div class="coc-header">CLINICAL ARTIFACT RECORD [LOCKED]</div>
      <div class="coc-body">
        <div class="coc-field">
          <span class="coc-label">Generated</span>
          <span class="coc-value">${cocGenerated}</span>
        </div>
        <div class="coc-field">
          <span class="coc-label">Observation Window</span>
          <span class="coc-value">${cocWindowStart} – ${cocWindowEnd}</span>
        </div>
        <div class="coc-field">
          <span class="coc-label">Protocol</span>
          <span class="coc-value">${report.chainOfCustody.protocolVersion}</span>
        </div>
        <div class="coc-field">
          <span class="coc-label">Integrity Hash</span>
          <span class="coc-value coc-hash">${report.chainOfCustody.integrityHash}</span>
        </div>
      </div>
      <div class="coc-status">STATUS: ${report.chainOfCustody.status.replace('_', ' ')}</div>
    </div>

    <!-- Document Header -->
    <header class="header">
      <h1 class="title">Quarterly Capacity Report</h1>
      <h2 class="quarter">${quarterLabel}</h2>
      <p class="subtitle">Clinical Capacity Intelligence Summary</p>
      ${report.isDemoReport ? '<div class="demo-badge">DEMONSTRATION DATA</div>' : ''}
    </header>

    <!-- Observation Period -->
    <section class="section">
      <h3 class="section-title">Observation Period</h3>
      <p class="period-dates">${report.period.dateRangeLabel}</p>
      <p style="font-size: 9px; color: #666; margin-top: 4px;">
        Source: ${report.chainOfCustody.dataProvenance}
      </p>
    </section>

    <!-- What Is Capacity Index? -->
    <section class="section">
      <h3 class="section-title">What Is Capacity Index?</h3>
      <div class="definition-content">
        ${CAPACITY_INDEX_DEFINITION}
      </div>
    </section>

    <!-- Record Depth & Coverage -->
    <section class="section">
      <h3 class="section-title">Record Depth & Coverage</h3>
      <div class="metrics-grid">
        <div class="metric">
          <span class="metric-value">${report.recordDepth.totalObservations}</span>
          <span class="metric-label">Observations</span>
        </div>
        <div class="metric">
          <span class="metric-value">${report.recordDepth.uniqueDays}</span>
          <span class="metric-label">Days Recorded</span>
        </div>
        <div class="metric">
          <span class="metric-value">${report.recordDepth.coveragePercent}%</span>
          <span class="metric-label">Coverage</span>
        </div>
      </div>
      <p class="coverage-note">Record coverage: ${report.recordDepth.coverageLevel}</p>
      ${report.longitudinalContext.totalRecordDays > report.recordDepth.uniqueDays
        ? `<p class="longitudinal-note">Total record on file: ${report.longitudinalContext.totalRecordDays.toLocaleString()} days</p>`
        : ''
      }
    </section>

    <!-- DATA INTEGRITY AUDIT (Signal Fidelity - The Lab Test Section) -->
    <div class="signal-fidelity">
      <div class="sf-header">Data Integrity Audit</div>
      <div class="sf-body">
        <div class="sf-metrics">
          <div class="sf-metric">
            <span class="sf-metric-label">Compliance Rate</span>
            <span class="sf-metric-value">${report.signalFidelity.complianceRate.value}%</span>
            <span class="sf-metric-interp">${report.signalFidelity.complianceRate.level}</span>
          </div>
          <div class="sf-metric">
            <span class="sf-metric-label">Input Latency</span>
            <span class="sf-metric-value">${report.signalFidelity.inputLatency.meanSeconds}s</span>
            <span class="sf-metric-interp">${report.signalFidelity.inputLatency.interpretation}</span>
          </div>
          <div class="sf-metric">
            <span class="sf-metric-label">Pattern Consistency</span>
            <span class="sf-metric-value">${report.signalFidelity.patternConsistency.value}%</span>
            <span class="sf-metric-interp">${report.signalFidelity.patternConsistency.interpretation}</span>
          </div>
          <div class="sf-metric">
            <span class="sf-metric-label">Session Completion</span>
            <span class="sf-metric-value">${report.signalFidelity.sessionCompletionRate.value}%</span>
            <span class="sf-metric-interp">${report.signalFidelity.sessionCompletionRate.level}</span>
          </div>
        </div>
        <div class="sf-verdict">
          <span class="sf-verdict-label">Clinical Reliability Verdict</span>
          <span class="sf-verdict-value ${verdictClass}">${report.signalFidelity.verdict}</span>
        </div>
        <div class="sf-narrative">
          ${report.signalFidelity.narrativeSummary}
        </div>
      </div>
    </div>

    <!-- Weekly Mean Capacity (PRIMARY) -->
    <section class="section graphs-section">
      <h3 class="section-title">Weekly Mean Capacity</h3>
      <div class="chart-container primary-chart">
        ${generateWeeklyMeanSvg(report)}
      </div>
      <p class="chart-note">Weekly aggregation provides the operational view for trend identification and intervention timing.</p>
    </section>

    <!-- Capacity Composition & Correlations -->
    ${report.capacityComposition || report.eventCorrelation ? `
    <section class="section">
      <h3 class="section-title">Capacity Composition & Correlations</h3>

      ${report.capacityComposition ? `
      <div class="composition-section">
        <h4 class="subsection-title">Quarter-Level Composition</h4>
        <div class="composition-grid">
          <div class="composition-item ${report.capacityComposition.summary.sleep}">
            <span class="comp-label">Sleep</span>
            <span class="comp-value">${formatImpact(report.capacityComposition.sleepImpact)}</span>
            <span class="comp-status">${capitalizeFirst(report.capacityComposition.summary.sleep)}</span>
          </div>
          <div class="composition-item ${report.capacityComposition.summary.energy}">
            <span class="comp-label">Energy</span>
            <span class="comp-value">${formatImpact(report.capacityComposition.energyImpact)}</span>
            <span class="comp-status">${capitalizeFirst(report.capacityComposition.summary.energy)}</span>
          </div>
          <div class="composition-item ${report.capacityComposition.summary.brain}">
            <span class="comp-label">Brain</span>
            <span class="comp-value">${formatImpact(report.capacityComposition.brainImpact)}</span>
            <span class="comp-status">${capitalizeFirst(report.capacityComposition.summary.brain)}</span>
          </div>
          <div class="composition-item ${report.capacityComposition.summary.subjective}">
            <span class="comp-label">Subjective</span>
            <span class="comp-value">${formatImpact(report.capacityComposition.subjectiveImpact)}</span>
            <span class="comp-status">${capitalizeFirst(report.capacityComposition.summary.subjective)}</span>
          </div>
        </div>
        <p class="composition-note">Contributions calculated based on signal availability and variance. Triangulation ensures composite stability.</p>
      </div>
      ` : ''}

      ${report.eventCorrelation ? `
      <div class="correlation-callout">
        <h4 class="callout-title">Week ${report.eventCorrelation.weekNumber} Capacity Decline — Contributing Factors</h4>
        <ul class="correlation-factors">
          <li><strong>Sleep:</strong> ${report.eventCorrelation.contributingFactors.sleepDebtChange > 10 ? 'Critical' : report.eventCorrelation.contributingFactors.sleepDebtChange > 5 ? 'Moderate' : 'Minimal'} impact (${report.eventCorrelation.contributingFactors.sleepDebtChange > 0 ? '+' : ''}${report.eventCorrelation.contributingFactors.sleepDebtChange}% debt accumulation)</li>
          <li><strong>Energy:</strong> ${formatEnergyVarianceLabel(report.eventCorrelation.contributingFactors.energyVariance)}</li>
          <li><strong>Cognitive Load:</strong> ${capitalizeFirst(report.eventCorrelation.contributingFactors.cognitiveLoad)}</li>
          <li><strong>Social Demand:</strong> ${getSocialDemandLabel(report)}</li>
        </ul>
        <p class="correlation-synthesis">${generateCorrelationSynthesis(report)}</p>
      </div>
      ` : ''}
    </section>
    ` : ''}

    <!-- Daily Capacity Index (SUPPLEMENTARY — Record Density Evidence) -->
    <section class="section">
      <h3 class="section-title">Daily Capacity Index</h3>
      <div class="chart-container supplementary-chart">
        ${generateDailyCapacitySvg(report)}
      </div>
      <p class="chart-caption">Daily observations shown to demonstrate record density; primary decision signals summarized in weekly and quarterly aggregates.</p>
    </section>

    <!-- State Distribution -->
    <section class="section">
      <h3 class="section-title">State Distribution</h3>
      <div class="chart-container">
        ${generateStateDistributionSvg(report)}
      </div>
    </section>

    <!-- Pattern Metrics -->
    <section class="section">
      <h3 class="section-title">Pattern Metrics</h3>
      <div class="pattern-metrics">
        ${report.patternMetrics.map(metric => `
          <div class="pattern-metric">
            <span class="pm-label">${metric.label}</span>
            <span class="pm-score">${metric.score}${metric.id === 'recovery_lag' ? ' days' : ''}</span>
            <span class="pm-level">${metric.level}</span>
            <p class="pm-desc">${metric.description}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Week Structure -->
    <section class="section">
      <h3 class="section-title">Week Structure</h3>
      <p>Observations indicate ${report.weekStructure.hardestDay.dayName} shows elevated depletion frequency (${report.weekStructure.hardestDay.depletionRate}% of observations).</p>
      ${report.weekStructure.vulnerableTimeSlot
        ? `<p>${capitalize(report.weekStructure.vulnerableTimeSlot)} periods demonstrate lower average capacity (${report.weekStructure.timeOfDay[report.weekStructure.vulnerableTimeSlot].avgCapacity}%).</p>`
        : ''
      }
    </section>

    <!-- Driver Frequency -->
    <section class="section">
      <h3 class="section-title">Driver Frequency & Strain Correlation</h3>
      <div class="chart-container">
        ${generateDriverFrequencySvg(report)}
      </div>
    </section>

    <!-- Notable Episodes -->
    ${report.notableEpisodes.length > 0 ? `
    <section class="section">
      <h3 class="section-title">Notable Episodes</h3>
      ${report.notableEpisodes.map(episode => `
        <div class="episode">
          <span class="episode-date">${formatEpisodeDates(episode.startDate, episode.endDate)}</span>
          <span class="episode-duration">(${episode.durationDays} days)</span>
          <p class="episode-desc">${episode.description}</p>
          ${episode.associatedDrivers.length > 0
            ? `<p class="episode-drivers">Associated: ${episode.associatedDrivers.join(', ')}</p>`
            : ''
          }
        </div>
      `).join('')}
    </section>
    ` : ''}

    <!-- Clinical & Operational Insights -->
    <section class="section">
      <h3 class="section-title">Clinical & Operational Insights</h3>
      ${report.clinicalNotes.length > 0
        ? `<ul class="clinical-insights">${report.clinicalNotes.map(note => `
            <li class="insight-item">${note.text}</li>
          `).join('')}</ul>`
        : '<p class="no-notes">No additional observations for this period.</p>'
      }

      ${report.longitudinalContext.previousQuarterComparison ? `
        <div class="period-comparison">
          <p><strong>Period Comparison:</strong> Capacity trend: ${report.longitudinalContext.previousQuarterComparison.capacityTrend}${
            report.longitudinalContext.previousQuarterComparison.depletionChange !== 0
              ? ` (depletion ${report.longitudinalContext.previousQuarterComparison.depletionChange > 0 ? '+' : ''}${report.longitudinalContext.previousQuarterComparison.depletionChange}% vs prior period)`
              : ''
          }</p>
        </div>
      ` : ''}
    </section>

    <!-- Multi-Person Aggregation Statement -->
    <section class="section aggregation-statement">
      <h3 class="section-title">Multi-Person Aggregation</h3>
      <div class="aggregation-content">
        ${MULTI_PERSON_STATEMENT}
      </div>
    </section>

    <!-- Provider Shield (Liability-Safe Footer) -->
    <div class="provider-shield">
      <div class="ps-header">Provider Utility Statement</div>
      <div class="ps-body">
        <div class="ps-section">
          <span class="ps-label">Clinical Utility</span>
          <p class="ps-text">${report.providerShield.utilityStatement}</p>
        </div>
        <div class="ps-section">
          <span class="ps-label">Important Notice</span>
          <p class="ps-text"><span class="ps-important">IMPORTANT:</span> ${report.providerShield.liabilityDisclaimer.replace('IMPORTANT: ', '')}</p>
        </div>
        <div class="ps-section">
          <span class="ps-label">Data Handling</span>
          <p class="ps-text">${report.providerShield.dataHandlingNotice}</p>
        </div>
      </div>
    </div>

    <!-- IP Ownership Footer -->
    <div class="ip-footer">
      <p class="ip-text">${report.providerShield.ipOwnership}</p>
    </div>

    <!-- Document Footer -->
    <footer class="footer">
      <p class="methodology">${METHODOLOGY_STATEMENT}</p>
      <p class="generated">Generated ${generatedDate} | Report ID: ${report.id}</p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * PDF Styles (inline CSS)
 * Clinical Artifact Design System
 * Monochrome palette - medical chart aesthetic
 * Page size: US Letter (8.5 x 11 inches)
 */
function getPdfStyles(): string {
  return `    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #ffffff;
    }

    .document {
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 40px;
    }

    /* ============================================
       CHAIN OF CUSTODY HEADER (Forensic Block)
       ============================================ */
    .chain-of-custody {
      border: 2px solid #1a1a1a;
      margin-bottom: 24px;
      font-family: 'Courier New', Courier, monospace;
    }

    .coc-header {
      background: #1a1a1a;
      color: #ffffff;
      padding: 8px 12px;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .coc-body {
      display: flex;
      flex-wrap: wrap;
      border-top: 1px solid #1a1a1a;
    }

    .coc-field {
      flex: 1;
      min-width: 50%;
      padding: 8px 12px;
      border-bottom: 1px solid #ccc;
      border-right: 1px solid #ccc;
    }

    .coc-field:nth-child(2n) {
      border-right: none;
    }

    .coc-field:nth-last-child(-n+2) {
      border-bottom: none;
    }

    .coc-label {
      display: block;
      font-size: 8px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }

    .coc-value {
      font-size: 10px;
      color: #1a1a1a;
      font-weight: 500;
    }

    .coc-hash {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #444;
      letter-spacing: 0.5px;
    }

    .coc-status {
      background: #f5f5f5;
      padding: 6px 12px;
      text-align: center;
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 1px;
      color: #333;
      border-top: 1px solid #ccc;
    }

    /* ============================================
       DOCUMENT HEADER
       ============================================ */
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #333;
    }

    .title {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 18px;
      font-weight: 400;
      color: #1a1a1a;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .quarter {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 24px;
      font-weight: 300;
      color: #1a1a1a;
      letter-spacing: 4px;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .demo-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      background: #f0f0f0;
      border: 1px solid #999;
      font-size: 9px;
      font-weight: 600;
      color: #666;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* ============================================
       SIGNAL FIDELITY AUDIT (Lab Test Section)
       ============================================ */
    .signal-fidelity {
      border: 2px solid #333;
      margin: 24px 0;
      page-break-inside: avoid;
    }

    .sf-header {
      background: #333;
      color: #fff;
      padding: 8px 12px;
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .sf-body {
      padding: 16px;
      background: #fafafa;
    }

    .sf-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }

    .sf-metric {
      flex: 1;
      min-width: 45%;
      padding: 12px;
      background: #fff;
      border: 1px solid #ddd;
    }

    .sf-metric-label {
      display: block;
      font-size: 8px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .sf-metric-value {
      font-size: 18px;
      font-weight: 300;
      color: #1a1a1a;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }

    .sf-metric-interp {
      font-size: 9px;
      color: #666;
      margin-top: 4px;
      font-style: italic;
    }

    .sf-verdict {
      padding: 12px;
      background: #fff;
      border: 2px solid #1a1a1a;
      text-align: center;
    }

    .sf-verdict-label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .sf-verdict-value {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      letter-spacing: 1px;
    }

    .sf-verdict-value.reliable { color: #2a5a2a; }
    .sf-verdict-value.acceptable { color: #5a5a2a; }
    .sf-verdict-value.concerns { color: #5a2a2a; }

    .sf-narrative {
      margin-top: 12px;
      padding: 12px;
      background: #fff;
      border-left: 3px solid #333;
      font-size: 10px;
      color: #444;
      line-height: 1.6;
    }

    .section {
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
    }

    .period-dates {
      font-size: 16px;
      color: #1a1a1a;
    }

    .metrics-grid {
      display: flex;
      justify-content: space-around;
      margin-bottom: 12px;
    }

    .metric {
      text-align: center;
      flex: 1;
    }

    .metric-value {
      display: block;
      font-size: 28px;
      font-weight: 200;
      color: #1a1a1a;
    }

    .metric-label {
      display: block;
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .coverage-note {
      text-align: center;
      font-size: 11px;
      color: #888;
      text-transform: capitalize;
    }

    .longitudinal-note {
      text-align: center;
      font-size: 12px;
      color: #5c7a8a;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #eee;
    }

    .graphs-section {
      page-break-inside: avoid;
    }

    .chart-container {
      margin-bottom: 24px;
      padding: 16px;
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 8px;
    }

    .chart-title {
      font-size: 10px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .chart-svg {
      width: 100%;
      height: auto;
    }

    .pattern-metrics {
      margin-bottom: 20px;
    }

    .pattern-metric {
      padding: 12px;
      margin-bottom: 8px;
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 6px;
    }

    .pm-label {
      font-size: 10px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pm-score {
      display: block;
      font-size: 28px;
      font-weight: 200;
      color: #5c7a8a;
    }

    .pm-level {
      display: block;
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .pm-desc {
      font-size: 11px;
      color: #666;
      line-height: 1.5;
    }

    .subsection-title {
      font-size: 10px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .week-structure p,
    .period-comparison p {
      font-size: 12px;
      color: #444;
      line-height: 1.6;
      margin-bottom: 4px;
    }

    .clinical-note {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;
    }

    .note-category {
      display: block;
      font-size: 9px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .note-text {
      font-size: 12px;
      color: #444;
      line-height: 1.6;
    }

    .no-notes {
      font-size: 12px;
      color: #888;
      font-style: italic;
    }

    .notable-episodes {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }

    .episode {
      margin-bottom: 12px;
    }

    .episode-date {
      font-size: 11px;
      font-weight: 500;
      color: #666;
    }

    .episode-desc {
      font-size: 12px;
      color: #444;
      line-height: 1.5;
    }

    .episode-drivers {
      font-size: 11px;
      color: #888;
      font-style: italic;
    }

    /* ============================================
       PROVIDER SHIELD FOOTER
       ============================================ */
    .provider-shield {
      margin-top: 32px;
      border: 2px solid #333;
      page-break-inside: avoid;
    }

    .ps-header {
      background: #333;
      color: #fff;
      padding: 6px 12px;
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .ps-body {
      padding: 16px;
      background: #fafafa;
    }

    .ps-section {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ddd;
    }

    .ps-section:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .ps-label {
      display: block;
      font-size: 8px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
      font-weight: bold;
    }

    .ps-text {
      font-size: 9px;
      color: #444;
      line-height: 1.6;
    }

    .ps-important {
      font-weight: bold;
      color: #333;
    }

    /* IP Ownership Footer (appears on every page) */
    .ip-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #333;
      text-align: center;
    }

    .ip-text {
      font-size: 8px;
      color: #666;
      letter-spacing: 0.5px;
      line-height: 1.4;
    }

    .footer {
      margin-top: 16px;
      text-align: center;
    }

    .methodology {
      font-size: 9px;
      color: #666;
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .generated {
      font-size: 9px;
      color: #888;
      margin-bottom: 4px;
    }

    .disclaimer {
      font-size: 8px;
      color: #999;
      line-height: 1.5;
      max-width: 500px;
      margin: 0 auto;
    }

    /* Definition Content */
    .definition-content {
      font-size: 12px;
      color: #444;
      line-height: 1.6;
    }

    .definition-content p {
      margin-bottom: 12px;
    }

    .definition-content ol {
      margin: 12px 0;
      padding-left: 24px;
    }

    .definition-content li {
      margin-bottom: 6px;
    }

    .interpretation-box {
      margin-top: 16px;
      padding: 12px 16px;
      background: #f8f8f8;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
    }

    .interp-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .state-resourced {
      color: #333;
      font-weight: 600;
    }

    .state-stretched {
      color: #555;
      font-weight: 500;
    }

    .state-depleted {
      color: #666;
      font-weight: 500;
    }

    /* Primary/Supplementary Charts - Monochrome */
    .primary-chart {
      border: 2px solid #333;
      background: #fafafa;
    }

    .supplementary-chart {
      border: 1px solid #999;
      background: #fafafa;
    }

    .chart-note {
      font-size: 11px;
      color: #666;
      text-align: center;
      margin-top: 8px;
      font-style: italic;
    }

    .chart-caption {
      font-size: 10px;
      color: #888;
      text-align: center;
      margin-top: 8px;
      font-style: italic;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    /* Composition Section */
    .composition-section {
      margin-bottom: 24px;
    }

    .composition-grid {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .composition-item {
      flex: 1;
      padding: 12px;
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 6px;
      text-align: center;
    }

    .composition-item.depleting {
      border-color: #d9c9c9;
      background: #fdf8f8;
    }

    .composition-item.neutral {
      border-color: #ddd;
      background: #fafafa;
    }

    .composition-item.compensatory {
      border-color: #c9d9d4;
      background: #f8fdfa;
    }

    .comp-label {
      display: block;
      font-size: 10px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .comp-value {
      display: block;
      font-size: 20px;
      font-weight: 300;
      color: #333;
      margin-bottom: 4px;
    }

    .comp-status {
      display: block;
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
    }

    .composition-note {
      font-size: 10px;
      color: #888;
      font-style: italic;
      text-align: center;
    }

    /* Correlation Callout */
    .correlation-callout {
      padding: 16px;
      background: #f0f4f6;
      border: 1px solid #c0d0d8;
      border-left: 4px solid #5c7a8a;
      border-radius: 6px;
      margin-top: 16px;
    }

    .callout-title {
      font-size: 12px;
      font-weight: 600;
      color: #3a5a6a;
      margin-bottom: 12px;
    }

    .correlation-factors {
      margin: 0 0 12px 0;
      padding-left: 20px;
    }

    .correlation-factors li {
      font-size: 11px;
      color: #444;
      line-height: 1.6;
      margin-bottom: 4px;
    }

    .correlation-conclusion {
      font-size: 12px;
      color: #333;
      line-height: 1.5;
    }

    .correlation-synthesis {
      font-size: 11px;
      color: #444;
      line-height: 1.6;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #d0d8dc;
      font-style: italic;
    }

    /* Clinical Insights as bullets */
    .clinical-insights {
      margin: 0;
      padding-left: 20px;
    }

    .insight-item {
      font-size: 12px;
      color: #444;
      line-height: 1.6;
      margin-bottom: 12px;
    }

    /* Episode duration */
    .episode-duration {
      font-size: 10px;
      color: #888;
      margin-left: 8px;
    }

    /* Aggregation Statement */
    .aggregation-statement {
      background: #f8f8f8;
      padding: 16px;
      border-radius: 8px;
    }

    .aggregation-content {
      font-size: 11px;
      color: #555;
      line-height: 1.6;
    }

    .aggregation-content p {
      margin-bottom: 8px;
    }

    @media print {
      .document {
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
    }`;
}

// =============================================================================
// SVG CHART GENERATORS (inline SVG for PDF)
// =============================================================================

/**
 * Downsample daily capacity data to maxPoints using bucket averaging.
 * Reduces memory pressure for long time ranges (90d+ → 45 points max).
 */
function downsampleCapacity(
  sorted: Array<{ date: Date; capacityIndex: number }>,
  maxPoints: number,
): Array<{ date: Date; capacityIndex: number }> {
  const bucketSize = Math.ceil(sorted.length / maxPoints);
  const result: Array<{ date: Date; capacityIndex: number }> = [];

  for (let i = 0; i < sorted.length; i += bucketSize) {
    const bucket = sorted.slice(i, Math.min(i + bucketSize, sorted.length));
    const avgCapacity = bucket.reduce((sum, d) => sum + d.capacityIndex, 0) / bucket.length;
    // Use midpoint date of bucket
    const midIdx = Math.floor(bucket.length / 2);
    result.push({ date: bucket[midIdx].date, capacityIndex: Math.round(avgCapacity * 10) / 10 });
  }

  return result;
}

function generateDailyCapacitySvg(report: QuarterlyCapacityReport): string {
  const data = report.chartData.dailyCapacity;
  if (data.length === 0) return '<p class="no-data">Insufficient data</p>';

  const width = 700;
  const height = 180;
  const padding = { left: 40, right: 20, top: 20, bottom: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Downsample to max 45 points (3-day buckets for 90d, 7-day for 365d)
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const MAX_POINTS = 45;
  const downsampled = sorted.length <= MAX_POINTS ? sorted : downsampleCapacity(sorted, MAX_POINTS);

  const xMin = new Date(downsampled[0].date).getTime();
  const xMax = new Date(downsampled[downsampled.length - 1].date).getTime();
  const xRange = xMax - xMin || 1;

  const toX = (d: Date) => padding.left + ((new Date(d).getTime() - xMin) / xRange) * chartW;
  const toY = (v: number) => padding.top + chartH - (v / 100) * chartH;

  // Line path
  const linePath = downsampled.map((d, i) => {
    const x = toX(d.date);
    const y = toY(d.capacityIndex);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  // Area path
  const areaPath = `${linePath} L ${toX(downsampled[downsampled.length - 1].date).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(downsampled[0].date).toFixed(1)} ${toY(0).toFixed(1)} Z`;

  // Grid lines
  const gridLines = [0, 25, 50, 75, 100].map(v =>
    `<line x1="${padding.left}" y1="${toY(v).toFixed(1)}" x2="${width - padding.right}" y2="${toY(v).toFixed(1)}" stroke="#e0e0e0" stroke-width="1"/>`
  ).join('\n      ');

  // Y labels
  const yLabels = [0, 50, 100].map(v =>
    `<text x="${padding.left - 8}" y="${(toY(v) + 4).toFixed(1)}" font-size="9" fill="#888" text-anchor="end">${v}</text>`
  ).join('\n      ');

  return `
    <svg width="${width}" height="${height}" class="chart-svg">
      ${gridLines}
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#ccc" stroke-width="1"/>
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#ccc" stroke-width="1"/>
      ${yLabels}
      <path d="${areaPath}" fill="rgba(51, 51, 51, 0.1)"/>
      <path d="${linePath}" stroke="#333" stroke-width="1.5" fill="none"/>
    </svg>
  `;
}

function generateWeeklyMeanSvg(report: QuarterlyCapacityReport): string {
  const data = report.chartData.weeklyMeans;
  if (data.length === 0) return '<p class="no-data">Insufficient data</p>';

  const width = 700;
  const height = 160;
  const padding = { left: 40, right: 20, top: 20, bottom: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const toX = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (v: number) => padding.top + chartH - (Math.max(0, Math.min(100, v)) / 100) * chartH;

  // Variance band (upper path)
  const upperPath = data.map((d, i) => {
    const x = toX(i);
    const y = toY(d.meanCapacity + d.stdDev);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  // Variance band (lower path, reversed)
  const lowerPath = [...data].reverse().map((d, i) => {
    const x = toX(data.length - 1 - i);
    const y = toY(d.meanCapacity - d.stdDev);
    return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const bandPath = `${upperPath} ${lowerPath} Z`;

  // Mean line
  const meanPath = data.map((d, i) => {
    const x = toX(i);
    const y = toY(d.meanCapacity);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  // Points
  const points = data.map((d, i) =>
    `<circle cx="${toX(i).toFixed(1)}" cy="${toY(d.meanCapacity).toFixed(1)}" r="3" fill="#333"/>`
  ).join('\n      ');

  // Week labels
  const labels = data.map((_, i) =>
    `<text x="${toX(i).toFixed(1)}" y="${height - padding.bottom + 14}" font-size="9" fill="#888" text-anchor="middle">W${i + 1}</text>`
  ).join('\n      ');

  return `
    <svg width="${width}" height="${height}" class="chart-svg">
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#ccc" stroke-width="1"/>
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#ccc" stroke-width="1"/>
      <path d="${bandPath}" fill="rgba(51, 51, 51, 0.08)"/>
      <path d="${meanPath}" stroke="#333" stroke-width="2" fill="none"/>
      ${points}
      ${labels}
    </svg>
  `;
}

function generateStateDistributionSvg(report: QuarterlyCapacityReport): string {
  const data = report.chartData.stateDistribution;
  const width = 700;
  const height = 120;
  const padding = { left: 80, right: 120, top: 10, bottom: 10 };
  const chartW = width - padding.left - padding.right;
  const barH = 20;
  const barGap = 12;

  // Monochrome clinical palette
  const colors: Record<string, string> = {
    resourced: '#333333',
    stretched: '#666666',
    depleted: '#999999',
  };

  const labels: Record<string, string> = {
    resourced: 'Resourced',
    stretched: 'Stretched',
    depleted: 'Depleted',
  };

  const bars = data.map((d, i) => {
    const y = padding.top + i * (barH + barGap);
    const barW = (d.percentage / 100) * chartW;
    return `
      <text x="${padding.left - 8}" y="${y + barH / 2 + 4}" font-size="11" fill="#666" text-anchor="end">${labels[d.state]}</text>
      <rect x="${padding.left}" y="${y}" width="${chartW}" height="${barH}" fill="#f0f0f0" rx="4"/>
      <rect x="${padding.left}" y="${y}" width="${Math.max(barW, 4)}" height="${barH}" fill="${colors[d.state]}" rx="4"/>
      <text x="${padding.left + Math.max(barW, 4) + 8}" y="${y + barH / 2 + 4}" font-size="11" fill="#444" font-weight="500">${d.percentage}%</text>
      <text x="${padding.left + Math.max(barW, 4) + 48}" y="${y + barH / 2 + 4}" font-size="9" fill="#888">(n=${d.count})</text>
    `;
  }).join('');

  return `
    <svg width="${width}" height="${height}" class="chart-svg">
      ${bars}
    </svg>
  `;
}

function generateDriverFrequencySvg(report: QuarterlyCapacityReport): string {
  const data = report.chartData.driverFrequency;
  const width = 700;
  const height = 160;
  const padding = { left: 40, right: 20, top: 30, bottom: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barW = (chartW - 32) / 3;
  const barGap = 16;

  // Monochrome clinical palette for driver frequency
  const colors: Record<string, string> = {
    sensory: '#333333',
    demand: '#555555',
    social: '#777777',
  };

  const labels: Record<string, string> = {
    sensory: 'Sensory',
    demand: 'Demand',
    social: 'Social',
  };

  const bars = data.map((d, i) => {
    const x = padding.left + i * (barW + barGap);
    const barHeight = (d.count / maxCount) * chartH;
    const y = padding.top + chartH - barHeight;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${barHeight}" fill="${colors[d.driver]}" rx="4"/>
      <text x="${x + barW / 2}" y="${y - 6}" font-size="11" fill="#444" text-anchor="middle" font-weight="500">${d.count}</text>
      <text x="${x + barW / 2}" y="${height - padding.bottom + 14}" font-size="10" fill="#666" text-anchor="middle">${labels[d.driver]}</text>
      <text x="${x + barW / 2}" y="${height - padding.bottom + 26}" font-size="8" fill="#888" text-anchor="middle">(${d.percentage}%)</text>
    `;
  }).join('');

  // Strain rate summary
  const strainSummary = data.map((d, i) => {
    const x = padding.left + i * (barW + barGap) + barW / 2;
    return `<text x="${x}" y="${height - 4}" font-size="8" fill="#888" text-anchor="middle">Strain: ${d.strainRate}%</text>`;
  }).join('\n      ');

  return `
    <svg width="${width}" height="${height}" class="chart-svg">
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#ccc" stroke-width="1"/>
      ${bars}
      ${strainSummary}
    </svg>
  `;
}

// =============================================================================
// HELPERS
// =============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatImpact(impact: number): string {
  if (impact === 0) return 'Neutral';
  const sign = impact > 0 ? '+' : '';
  return `${sign}${impact}% impact`;
}

function formatEnergyVariance(variance: 'below_baseline' | 'within_baseline' | 'above_baseline'): string {
  switch (variance) {
    case 'below_baseline': return 'remained below baseline';
    case 'within_baseline': return 'remained within baseline';
    case 'above_baseline': return 'exceeded baseline';
    default: return 'within baseline';
  }
}

function formatEnergyVarianceLabel(variance: 'below_baseline' | 'within_baseline' | 'above_baseline'): string {
  switch (variance) {
    case 'below_baseline': return 'Moderate impact (below baseline)';
    case 'within_baseline': return 'Neutral (within baseline)';
    case 'above_baseline': return 'Compensatory (above baseline)';
    default: return 'Neutral';
  }
}

function getSocialDemandLabel(report: QuarterlyCapacityReport): string {
  const socialDriver = report.chartData.driverFrequency.find(d => d.driver === 'social');
  if (!socialDriver) return 'Not assessed';
  if (socialDriver.strainRate > 40) return 'Elevated exposure';
  if (socialDriver.strainRate > 20) return 'Moderate exposure';
  return 'Within expected range';
}

/**
 * Generate clinical synthesis paragraph from composition and correlation data.
 * Third-person clinical voice. Derived from actual data, not static copy.
 */
function generateCorrelationSynthesis(report: QuarterlyCapacityReport): string {
  if (!report.eventCorrelation || !report.capacityComposition) {
    return 'Insufficient data for correlation synthesis.';
  }

  const { capacityComposition, eventCorrelation } = report;
  const weekNum = eventCorrelation.weekNumber;

  // Determine primary and secondary contributors
  const contributors: { factor: string; impact: number; label: string }[] = [
    { factor: 'sleep', impact: Math.abs(capacityComposition.sleepImpact), label: 'accumulated sleep debt' },
    { factor: 'energy', impact: Math.abs(capacityComposition.energyImpact), label: 'sustained energy depletion' },
    { factor: 'brain', impact: Math.abs(capacityComposition.brainImpact), label: 'cognitive load elevation' },
  ].filter(c => c.impact > 0).sort((a, b) => b.impact - a.impact);

  const primary = contributors[0];
  const secondary = contributors[1];

  // Determine cognitive status
  const cognitiveStatus = eventCorrelation.contributingFactors.cognitiveLoad === 'stable'
    ? 'Cognitive load remained stable during this period.'
    : eventCorrelation.contributingFactors.cognitiveLoad === 'elevated'
    ? 'Cognitive load was elevated during this period.'
    : 'Cognitive load was reduced during this period.';

  // Build synthesis
  if (primary && secondary && secondary.impact > 10) {
    return `Observed capacity decline during Week ${weekNum} appears primarily associated with ${primary.label}, with secondary contribution from ${secondary.label}. ${cognitiveStatus}`;
  } else if (primary) {
    return `Observed capacity decline during Week ${weekNum} appears primarily associated with ${primary.label}. ${cognitiveStatus}`;
  } else {
    return `Capacity decline during Week ${weekNum} reflects combined low-magnitude contributions across multiple inputs. ${cognitiveStatus}`;
  }
}

function formatNoteCategory(category: string): string {
  switch (category) {
    case 'observation': return 'Observation';
    case 'consideration': return 'Consideration';
    case 'pattern_note': return 'Pattern Note';
    default: return 'Note';
  }
}

function formatEpisodeDates(start: number, end: number): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (startDate.toDateString() === endDate.toDateString()) {
    return startDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  }
  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}
