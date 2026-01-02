/**
 * Executive Report Generator
 *
 * Generates quarterly and annual capacity summaries
 * suitable for board presentations, clinical reviews, or institutional reporting.
 *
 * All reports include non-diagnostic disclaimers and watermarks.
 */

import { CapacityLog, CapacityState, Category, ExportSummary } from '../../types';
import { getLogs, getLogsByDateRange, getVaultedLogs, getVaultMetadata } from '../storage';

export type ReportPeriod = 'quarterly' | 'annual' | 'custom';

export interface ExecutiveReportData {
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  periodLabel: string;
  summary: {
    totalSignals: number;
    averageCapacity: number;
    baselineEstimate: number;
    depletedPercentage: number;
    stretchedPercentage: number;
    resourcedPercentage: number;
  };
  trajectory: {
    trend: 'improving' | 'stable' | 'declining';
    weeklyAverages: { week: string; average: number }[];
    changeFromStart: number;
  };
  driverInsights: {
    category: Category;
    frequency: number;
    strainCorrelation: number;
  }[];
  notablePatterns: string[];
  watermark: {
    disclaimer: string;
    scope: string;
    generatedDate: string;
  };
}

function calculateCapacityValue(state: CapacityState): number {
  switch (state) {
    case 'resourced': return 0.8;
    case 'stretched': return 0.5;
    case 'depleted': return 0.2;
    default: return 0.5;
  }
}

function getWeekLabel(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `W${weekNumber}`;
}

function analyzeTrend(weeklyAverages: number[]): 'improving' | 'stable' | 'declining' {
  if (weeklyAverages.length < 2) return 'stable';

  const firstHalf = weeklyAverages.slice(0, Math.floor(weeklyAverages.length / 2));
  const secondHalf = weeklyAverages.slice(Math.floor(weeklyAverages.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const change = secondAvg - firstAvg;

  if (change > 0.05) return 'improving';
  if (change < -0.05) return 'declining';
  return 'stable';
}

function generateNotablePatterns(logs: CapacityLog[], driverInsights: ExecutiveReportData['driverInsights']): string[] {
  const patterns: string[] = [];

  // Day of week pattern
  const dayOfWeekStats: Record<number, { total: number; count: number }> = {};
  logs.forEach(log => {
    const day = new Date(log.timestamp).getDay();
    if (!dayOfWeekStats[day]) dayOfWeekStats[day] = { total: 0, count: 0 };
    dayOfWeekStats[day].total += calculateCapacityValue(log.state);
    dayOfWeekStats[day].count++;
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let lowestDay = 0;
  let lowestAvg = 1;
  Object.entries(dayOfWeekStats).forEach(([day, stats]) => {
    const avg = stats.total / stats.count;
    if (avg < lowestAvg && stats.count >= 3) {
      lowestAvg = avg;
      lowestDay = parseInt(day);
    }
  });

  if (lowestAvg < 0.45) {
    patterns.push(`${dayNames[lowestDay]}s show consistently lower capacity`);
  }

  // Top driver
  const topDriver = driverInsights.sort((a, b) => b.strainCorrelation - a.strainCorrelation)[0];
  if (topDriver && topDriver.strainCorrelation > 0.3) {
    patterns.push(`${topDriver.category.charAt(0).toUpperCase() + topDriver.category.slice(1)} load shows ${Math.round(topDriver.strainCorrelation * 100)}% correlation with depleted states`);
  }

  // Recovery pattern
  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  let consecutiveImprovement = 0;
  let maxImprovement = 0;
  for (let i = 1; i < sortedLogs.length; i++) {
    const prevVal = calculateCapacityValue(sortedLogs[i - 1].state);
    const currVal = calculateCapacityValue(sortedLogs[i].state);
    if (currVal > prevVal) {
      consecutiveImprovement++;
      maxImprovement = Math.max(maxImprovement, consecutiveImprovement);
    } else {
      consecutiveImprovement = 0;
    }
  }

  if (maxImprovement >= 5) {
    patterns.push(`Notable recovery period detected (${maxImprovement}+ consecutive improvements)`);
  }

  return patterns.slice(0, 4); // Max 4 patterns
}

export async function generateExecutiveReport(
  period: ReportPeriod,
  customStart?: number,
  customEnd?: number
): Promise<ExecutiveReportData> {
  const now = Date.now();
  let periodStart: number;
  let periodEnd: number;
  let periodLabel: string;

  switch (period) {
    case 'quarterly':
      periodEnd = now;
      periodStart = now - (90 * 24 * 60 * 60 * 1000);
      periodLabel = '90-Day Quarterly Report';
      break;
    case 'annual':
      periodEnd = now;
      periodStart = now - (365 * 24 * 60 * 60 * 1000);
      periodLabel = 'Annual Capacity Report';
      break;
    case 'custom':
      periodStart = customStart || now - (90 * 24 * 60 * 60 * 1000);
      periodEnd = customEnd || now;
      periodLabel = 'Custom Period Report';
      break;
  }

  // Get logs from active storage and vault
  const activeLogs = await getLogsByDateRange(periodStart, periodEnd);
  const vaultedLogs = await getVaultedLogs();
  const vaultedInRange = vaultedLogs.filter(
    log => log.timestamp >= periodStart && log.timestamp <= periodEnd
  );

  // Combine and deduplicate
  const allLogsMap = new Map<string, CapacityLog>();
  activeLogs.forEach(log => allLogsMap.set(log.id, log));
  vaultedInRange.forEach(log => {
    if (!allLogsMap.has(log.id)) {
      allLogsMap.set(log.id, {
        id: log.id,
        state: log.state,
        timestamp: log.timestamp,
        tags: log.category ? [log.category] : [],
        category: log.category,
      });
    }
  });

  const logs = Array.from(allLogsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Calculate summary stats
  const stateCount = { resourced: 0, stretched: 0, depleted: 0 };
  let totalCapacity = 0;

  logs.forEach(log => {
    stateCount[log.state]++;
    totalCapacity += calculateCapacityValue(log.state);
  });

  const totalSignals = logs.length;
  const averageCapacity = totalSignals > 0 ? totalCapacity / totalSignals : 0;

  // Calculate weekly averages
  const weeklyData: Record<string, { total: number; count: number }> = {};
  logs.forEach(log => {
    const weekLabel = getWeekLabel(new Date(log.timestamp));
    if (!weeklyData[weekLabel]) weeklyData[weekLabel] = { total: 0, count: 0 };
    weeklyData[weekLabel].total += calculateCapacityValue(log.state);
    weeklyData[weekLabel].count++;
  });

  const weeklyAverages = Object.entries(weeklyData)
    .map(([week, data]) => ({ week, average: data.total / data.count }))
    .slice(-12); // Last 12 weeks max

  const weeklyValues = weeklyAverages.map(w => w.average);
  const trend = analyzeTrend(weeklyValues);

  // Driver insights
  const categoryStats: Record<Category, { total: number; depleted: number }> = {
    sensory: { total: 0, depleted: 0 },
    demand: { total: 0, depleted: 0 },
    social: { total: 0, depleted: 0 },
  };

  logs.forEach(log => {
    if (log.category) {
      categoryStats[log.category].total++;
      if (log.state === 'depleted') {
        categoryStats[log.category].depleted++;
      }
    }
  });

  const driverInsights = (Object.entries(categoryStats) as [Category, { total: number; depleted: number }][])
    .filter(([_, stats]) => stats.total > 0)
    .map(([category, stats]) => ({
      category,
      frequency: stats.total,
      strainCorrelation: stats.total > 0 ? stats.depleted / stats.total : 0,
    }))
    .sort((a, b) => b.strainCorrelation - a.strainCorrelation);

  const notablePatterns = generateNotablePatterns(logs, driverInsights);

  // Change from start
  const firstWeekAvg = weeklyValues[0] || 0;
  const lastWeekAvg = weeklyValues[weeklyValues.length - 1] || 0;
  const changeFromStart = lastWeekAvg - firstWeekAvg;

  return {
    generatedAt: now,
    periodStart,
    periodEnd,
    periodLabel,
    summary: {
      totalSignals,
      averageCapacity: Math.round(averageCapacity * 100),
      baselineEstimate: Math.round(averageCapacity * 100),
      depletedPercentage: Math.round((stateCount.depleted / totalSignals) * 100) || 0,
      stretchedPercentage: Math.round((stateCount.stretched / totalSignals) * 100) || 0,
      resourcedPercentage: Math.round((stateCount.resourced / totalSignals) * 100) || 0,
    },
    trajectory: {
      trend,
      weeklyAverages,
      changeFromStart: Math.round(changeFromStart * 100),
    },
    driverInsights,
    notablePatterns,
    watermark: {
      disclaimer: 'Non-diagnostic. Normalized self-reported capacity data. Not for clinical decision-making.',
      scope: `${totalSignals} signals from ${new Date(periodStart).toLocaleDateString()} to ${new Date(periodEnd).toLocaleDateString()}`,
      generatedDate: new Date(now).toISOString(),
    },
  };
}

export function formatExecutiveReportAsText(report: ExecutiveReportData): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════════',
    '',
    `                    ORBITAL CAPACITY REPORT`,
    `                    ${report.periodLabel}`,
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    `Period: ${new Date(report.periodStart).toLocaleDateString()} - ${new Date(report.periodEnd).toLocaleDateString()}`,
    '',
    '───────────────────────────────────────────────────────────────────',
    '                         SUMMARY',
    '───────────────────────────────────────────────────────────────────',
    '',
    `Total Signals:        ${report.summary.totalSignals}`,
    `Average Capacity:     ${report.summary.averageCapacity}%`,
    `Baseline Estimate:    ${report.summary.baselineEstimate}%`,
    '',
    'State Distribution:',
    `  • High Capacity:    ${report.summary.resourcedPercentage}%`,
    `  • Stable:           ${report.summary.stretchedPercentage}%`,
    `  • Depleted:         ${report.summary.depletedPercentage}%`,
    '',
    '───────────────────────────────────────────────────────────────────',
    '                        TRAJECTORY',
    '───────────────────────────────────────────────────────────────────',
    '',
    `Overall Trend:        ${report.trajectory.trend.toUpperCase()}`,
    `Change from Start:    ${report.trajectory.changeFromStart > 0 ? '+' : ''}${report.trajectory.changeFromStart}%`,
    '',
  ];

  if (report.driverInsights.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('                    DRIVER ANALYSIS');
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('');

    report.driverInsights.forEach(insight => {
      const name = insight.category.charAt(0).toUpperCase() + insight.category.slice(1);
      lines.push(`${name}:`);
      lines.push(`  Signals:            ${insight.frequency}`);
      lines.push(`  Strain Correlation: ${Math.round(insight.strainCorrelation * 100)}%`);
      lines.push('');
    });
  }

  if (report.notablePatterns.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('                   NOTABLE PATTERNS');
    lines.push('───────────────────────────────────────────────────────────────────');
    lines.push('');

    report.notablePatterns.forEach(pattern => {
      lines.push(`  • ${pattern}`);
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(report.watermark.disclaimer);
  lines.push('');
  lines.push(`Scope: ${report.watermark.scope}`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
