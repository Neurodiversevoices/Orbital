/**
 * Clinical Brief PDF Generator
 *
 * Generates a professional clinical-grade PDF report from capacity data.
 * Uses expo-print for HTML-to-PDF rendering.
 *
 * Design: Infrastructure aesthetic - clean, neutral, non-diagnostic.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { CapacityLog, CapacityState, Category } from '../types';
import { getLogs } from './storage';

interface ClinicalBriefData {
  reportId: string;
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalSignals: number;
  uniqueDays: number;
  capacityDistribution: { resourced: number; stretched: number; depleted: number };
  averageCapacity: number;
  dailyCapacity: { date: string; value: number; count: number }[];
  driverDistribution: { sensory: number; social: number; demand: number };
  sustainedDepletionEpisodes: { start: string; end: string; days: number }[];
  confidenceTier: 'low' | 'growing' | 'high';
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }).toUpperCase();
}

function capacityStateToValue(state: CapacityState): number {
  switch (state) {
    case 'resourced': return 100;
    case 'stretched': return 50;
    case 'depleted': return 0;
    default: return 50;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
}

function computeBriefData(logs: CapacityLog[], days: number = 30): ClinicalBriefData {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const filteredLogs = logs.filter(l => l.timestamp >= cutoff);

  const reportId = generateUUID().slice(0, 8);
  const generatedAt = new Date().toISOString();

  const sortedLogs = [...filteredLogs].sort((a, b) => a.timestamp - b.timestamp);
  const startDate = sortedLogs.length > 0 ? formatDate(sortedLogs[0].timestamp) : formatDate(cutoff);
  const endDate = formatDate(now);

  const uniqueDates = new Set(filteredLogs.map(l => l.localDate || formatDate(l.timestamp)));

  const capacityDistribution = { resourced: 0, stretched: 0, depleted: 0 };
  filteredLogs.forEach(l => {
    capacityDistribution[l.state]++;
  });

  const totalCapacity = filteredLogs.reduce((sum, l) => sum + capacityStateToValue(l.state), 0);
  const averageCapacity = filteredLogs.length > 0 ? Math.round(totalCapacity / filteredLogs.length) : 50;

  const dailyMap = new Map<string, { total: number; count: number }>();
  filteredLogs.forEach(l => {
    const date = l.localDate || formatDate(l.timestamp);
    const existing = dailyMap.get(date) || { total: 0, count: 0 };
    existing.total += capacityStateToValue(l.state);
    existing.count++;
    dailyMap.set(date, existing);
  });

  const dailyCapacity: { date: string; value: number; count: number }[] = [];
  const allDates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    allDates.push(formatDate(d.getTime()));
  }

  allDates.forEach(date => {
    const data = dailyMap.get(date);
    if (data) {
      dailyCapacity.push({ date, value: Math.round(data.total / data.count), count: data.count });
    } else {
      dailyCapacity.push({ date, value: -1, count: 0 });
    }
  });

  const driverDistribution = { sensory: 0, social: 0, demand: 0 };
  filteredLogs.forEach(l => {
    if (l.category) {
      driverDistribution[l.category]++;
    }
    l.tags?.forEach(tag => {
      if (tag === 'sensory') driverDistribution.sensory++;
      else if (tag === 'social') driverDistribution.social++;
      else if (tag === 'demand') driverDistribution.demand++;
    });
  });

  const sustainedDepletionEpisodes: { start: string; end: string; days: number }[] = [];
  let episodeStart: string | null = null;
  let episodeDays = 0;

  allDates.forEach((date, idx) => {
    const data = dailyMap.get(date);
    const avgValue = data ? Math.round(data.total / data.count) : -1;
    const isDepleted = avgValue >= 0 && avgValue <= 25;

    if (isDepleted) {
      if (!episodeStart) {
        episodeStart = date;
        episodeDays = 1;
      } else {
        episodeDays++;
      }
    } else {
      if (episodeStart && episodeDays >= 3) {
        sustainedDepletionEpisodes.push({
          start: episodeStart,
          end: allDates[idx - 1],
          days: episodeDays,
        });
      }
      episodeStart = null;
      episodeDays = 0;
    }
  });

  if (episodeStart && episodeDays >= 3) {
    sustainedDepletionEpisodes.push({
      start: episodeStart,
      end: allDates[allDates.length - 1],
      days: episodeDays,
    });
  }

  let confidenceTier: 'low' | 'growing' | 'high' = 'low';
  if (uniqueDates.size >= 90) confidenceTier = 'high';
  else if (uniqueDates.size >= 30) confidenceTier = 'growing';

  return {
    reportId,
    generatedAt,
    dateRange: { start: startDate, end: endDate },
    totalSignals: filteredLogs.length,
    uniqueDays: uniqueDates.size,
    capacityDistribution,
    averageCapacity,
    dailyCapacity,
    driverDistribution,
    sustainedDepletionEpisodes,
    confidenceTier,
  };
}

function generateSVGChart(dailyCapacity: { date: string; value: number; count: number }[]): string {
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const validPoints = dailyCapacity.filter(d => d.value >= 0);

  let pathD = '';
  let areaD = '';
  let dots = '';

  if (validPoints.length > 0) {
    const points: { x: number; y: number }[] = [];

    dailyCapacity.forEach((d, i) => {
      if (d.value >= 0) {
        const x = padding.left + (i / (dailyCapacity.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (d.value / 100) * chartHeight;
        points.push({ x, y });
      }
    });

    if (points.length > 1) {
      pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      areaD = `M ${points[0].x} ${padding.top + chartHeight} ` +
        points.map(p => `L ${p.x} ${p.y}`).join(' ') +
        ` L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;
    }

    points.forEach(p => {
      dots += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#00E5FF" />`;
    });
  }

  const riskZoneY = padding.top + chartHeight * 0.8;
  const riskZoneHeight = chartHeight * 0.2;

  const yAxisLabels = [0, 25, 50, 75, 100].map(v => {
    const y = padding.top + chartHeight - (v / 100) * chartHeight;
    return `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#666" font-size="10">${v}</text>
            <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#333" stroke-dasharray="2,2" />`;
  }).join('');

  const xAxisLabels = [0, Math.floor(dailyCapacity.length / 2), dailyCapacity.length - 1]
    .filter(i => dailyCapacity[i])
    .map(i => {
      const x = padding.left + (i / (dailyCapacity.length - 1)) * chartWidth;
      const label = formatDateDisplay(dailyCapacity[i].date);
      return `<text x="${x}" y="${height - 10}" text-anchor="middle" fill="#666" font-size="10">${label}</text>`;
    }).join('');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${padding.left}" y="${riskZoneY}" width="${chartWidth}" height="${riskZoneHeight}" fill="rgba(244,67,54,0.1)" />
      <text x="${padding.left + 5}" y="${riskZoneY + 15}" fill="#F44336" font-size="9" opacity="0.7">RISK ZONE</text>
      ${yAxisLabels}
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#444" />
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#444" />
      ${areaD ? `<path d="${areaD}" fill="rgba(0,229,255,0.1)" />` : ''}
      ${pathD ? `<path d="${pathD}" fill="none" stroke="#00E5FF" stroke-width="2" />` : ''}
      ${dots}
      ${xAxisLabels}
      <text x="${padding.left - 35}" y="${padding.top + chartHeight / 2}" text-anchor="middle" fill="#666" font-size="10" transform="rotate(-90, ${padding.left - 35}, ${padding.top + chartHeight / 2})">CAPACITY</text>
    </svg>
  `;
}

function generateHTML(data: ClinicalBriefData): string {
  const totalDrivers = data.driverDistribution.sensory + data.driverDistribution.social + data.driverDistribution.demand;
  const sensoryPct = totalDrivers > 0 ? Math.round((data.driverDistribution.sensory / totalDrivers) * 100) : 0;
  const socialPct = totalDrivers > 0 ? Math.round((data.driverDistribution.social / totalDrivers) * 100) : 0;
  const demandPct = totalDrivers > 0 ? Math.round((data.driverDistribution.demand / totalDrivers) * 100) : 0;

  const totalSignals = data.capacityDistribution.resourced + data.capacityDistribution.stretched + data.capacityDistribution.depleted;
  const resourcedPct = totalSignals > 0 ? Math.round((data.capacityDistribution.resourced / totalSignals) * 100) : 0;
  const stretchedPct = totalSignals > 0 ? Math.round((data.capacityDistribution.stretched / totalSignals) * 100) : 0;
  const depletedPct = totalSignals > 0 ? Math.round((data.capacityDistribution.depleted / totalSignals) * 100) : 0;

  const confidenceLabel = data.confidenceTier === 'high' ? 'HIGH' : data.confidenceTier === 'growing' ? 'GROWING' : 'LOW';
  const confidenceDesc = data.confidenceTier === 'high'
    ? 'Pattern data has stabilized with 90+ unique days of signals.'
    : data.confidenceTier === 'growing'
    ? 'Patterns are emerging with 30-89 unique days of signals.'
    : 'Early data. Patterns will stabilize after more signals.';

  const chartSVG = generateSVGChart(data.dailyCapacity);

  const depletionRows = data.sustainedDepletionEpisodes.length > 0
    ? data.sustainedDepletionEpisodes.map(e =>
        `<tr><td>${formatDateDisplay(e.start)} – ${formatDateDisplay(e.end)}</td><td>${e.days} days</td></tr>`
      ).join('')
    : '<tr><td colspan="2" style="color: #666; font-style: italic;">No sustained depletion episodes detected</td></tr>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-left h1 {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 2px;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .header-left .subtitle {
      font-size: 10px;
      color: #666;
      font-style: italic;
    }
    .header-right {
      text-align: right;
      font-size: 10px;
      color: #666;
    }
    .header-right .report-id {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 11px;
      color: #1a1a1a;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
    }
    .chart-container {
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .metrics-grid {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }
    .metric-box {
      flex: 1;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 12px;
    }
    .metric-label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 300;
      color: #1a1a1a;
    }
    .metric-unit {
      font-size: 10px;
      color: #666;
    }
    .bar-chart {
      margin-top: 8px;
    }
    .bar-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .bar-label {
      width: 80px;
      font-size: 10px;
      color: #666;
    }
    .bar-container {
      flex: 1;
      height: 16px;
      background: #f0f0f0;
      border-radius: 2px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 2px;
    }
    .bar-fill.resourced { background: #00E5FF; }
    .bar-fill.stretched { background: #E8A830; }
    .bar-fill.depleted { background: #F44336; }
    .bar-fill.sensory { background: #9C27B0; }
    .bar-fill.social { background: #2196F3; }
    .bar-fill.demand { background: #FF9800; }
    .bar-pct {
      width: 40px;
      text-align: right;
      font-size: 10px;
      color: #666;
      margin-left: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
    }
    .confidence-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .confidence-low { background: #ffebee; color: #c62828; }
    .confidence-growing { background: #fff3e0; color: #e65100; }
    .confidence-high { background: #e8f5e9; color: #2e7d32; }
    .disclaimer {
      background: #f5f5f5;
      border-left: 3px solid #666;
      padding: 12px 16px;
      margin-top: 24px;
      font-size: 9px;
      color: #666;
    }
    .disclaimer strong {
      display: block;
      margin-bottom: 4px;
      color: #1a1a1a;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      font-size: 9px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>ORBITAL INFRASTRUCTURE</h1>
      <div class="subtitle">Excerpt from a longitudinal capacity signal (individual view)</div>
    </div>
    <div class="header-right">
      <div class="report-id">Report ID: ${data.reportId}</div>
      <div>${new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div>Range: ${formatDateDisplay(data.dateRange.start)} – ${formatDateDisplay(data.dateRange.end)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Capacity Baseline (30 Days)</div>
    <div class="chart-container">
      ${chartSVG}
    </div>
    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-label">Average Capacity</div>
        <div class="metric-value">${data.averageCapacity}<span class="metric-unit">%</span></div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Total Signals</div>
        <div class="metric-value">${data.totalSignals}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Unique Days</div>
        <div class="metric-value">${data.uniqueDays}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Capacity Distribution</div>
    <div class="bar-chart">
      <div class="bar-row">
        <div class="bar-label">Resourced</div>
        <div class="bar-container"><div class="bar-fill resourced" style="width: ${resourcedPct}%"></div></div>
        <div class="bar-pct">${resourcedPct}%</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">Stretched</div>
        <div class="bar-container"><div class="bar-fill stretched" style="width: ${stretchedPct}%"></div></div>
        <div class="bar-pct">${stretchedPct}%</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">Depleted</div>
        <div class="bar-container"><div class="bar-fill depleted" style="width: ${depletedPct}%"></div></div>
        <div class="bar-pct">${depletedPct}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Primary Drivers (When Capacity Decreased)</div>
    <div class="bar-chart">
      <div class="bar-row">
        <div class="bar-label">Sensory</div>
        <div class="bar-container"><div class="bar-fill sensory" style="width: ${sensoryPct}%"></div></div>
        <div class="bar-pct">${sensoryPct}%</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">Social</div>
        <div class="bar-container"><div class="bar-fill social" style="width: ${socialPct}%"></div></div>
        <div class="bar-pct">${socialPct}%</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">Demand</div>
        <div class="bar-container"><div class="bar-fill demand" style="width: ${demandPct}%"></div></div>
        <div class="bar-pct">${demandPct}%</div>
      </div>
    </div>
    <p style="font-size: 9px; color: #666; margin-top: 8px; font-style: italic;">
      Correlated contributors, not causal attributions.
    </p>
  </div>

  <div class="section">
    <div class="section-title">Sustained Depletion Episodes (≥3 consecutive days)</div>
    <table>
      <thead>
        <tr>
          <th>Date Range</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${depletionRows}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Data Confidence</div>
    <p style="margin-bottom: 8px;">
      <span class="confidence-badge confidence-${data.confidenceTier}">${confidenceLabel}</span>
    </p>
    <p style="font-size: 10px; color: #666;">
      ${confidenceDesc}<br/>
      This report reflects <strong>${data.totalSignals}</strong> self-reported capacity signals across <strong>${data.uniqueDays}</strong> unique days.
    </p>
  </div>

  <div class="disclaimer">
    <strong>Important Notice</strong>
    This document is a Patient-Reported Outcome Measure (PROM). It represents subjective self-reported data
    and is not a medical diagnosis, clinical assessment, or treatment recommendation. The patterns shown
    reflect correlations in user-reported signals and should not be interpreted as causal relationships.
    Always consult qualified healthcare providers for medical advice.
  </div>

  <div class="footer">
    Generated by Orbital Infrastructure • ${new Date(data.generatedAt).toISOString()} • Report ID: ${data.reportId}
  </div>
</body>
</html>
  `.trim();
}

export async function generateClinicalBrief(options?: { days?: number }): Promise<{ uri: string; share: () => Promise<void> }> {
  const days = options?.days || 30;
  const logs = await getLogs();
  const data = computeBriefData(logs, days);
  const html = generateHTML(data);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const share = async () => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Clinical Brief',
        UTI: 'com.adobe.pdf',
      });
    }
  };

  return { uri, share };
}

export async function printClinicalBrief(options?: { days?: number }): Promise<void> {
  const days = options?.days || 30;
  const logs = await getLogs();
  const data = computeBriefData(logs, days);
  const html = generateHTML(data);

  await Print.printAsync({ html });
}
