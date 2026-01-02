import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrajectoryWindow,
  TrajectoryReport,
  InterventionCategory,
} from '../../types';
import { hasActiveConsent } from './researchConsent';

const TRAJECTORY_REPORTS_KEY = '@orbital:trajectory_reports';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// STATISTICAL HELPERS
// ============================================

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStandardDeviation(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  // Simple linear regression slope
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = calculateMean(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;

  // Calculate average absolute change between consecutive values
  let totalChange = 0;
  for (let i = 1; i < values.length; i++) {
    totalChange += Math.abs(values[i] - values[i - 1]);
  }

  return totalChange / (values.length - 1);
}

// ============================================
// TRAJECTORY WINDOW GENERATION
// ============================================

export function generateTrajectoryWindow(
  type: 'pre' | 'post',
  referenceEventId: string,
  referenceTimestamp: number,
  windowDays: number,
  dataPoints: { timestamp: number; normalizedCapacity: number; drivers?: string[] }[]
): TrajectoryWindow {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  let startAt: number;
  let endAt: number;

  if (type === 'pre') {
    startAt = referenceTimestamp - windowMs;
    endAt = referenceTimestamp;
  } else {
    startAt = referenceTimestamp;
    endAt = referenceTimestamp + windowMs;
  }

  // Filter data points to window
  const windowPoints = dataPoints.filter(
    (dp) => dp.timestamp >= startAt && dp.timestamp <= endAt
  );

  // Sort by timestamp
  windowPoints.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate statistics
  const capacityValues = windowPoints.map((dp) => dp.normalizedCapacity);
  const mean = calculateMean(capacityValues);
  const standardDeviation = calculateStandardDeviation(capacityValues, mean);
  const trend = calculateTrend(capacityValues);
  const volatility = calculateVolatility(capacityValues);

  return {
    windowId: generateId('win'),
    type,
    referenceEventId,
    startAt,
    endAt,
    signalCount: windowPoints.length,
    dataPoints: windowPoints,
    statistics: {
      mean: Math.round(mean * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      trend: Math.round(trend * 1000) / 1000,
      volatility: Math.round(volatility * 100) / 100,
    },
  };
}

// ============================================
// TRAJECTORY REPORT GENERATION
// ============================================

export async function generateTrajectoryReport(
  cohortParticipantId: string,
  referenceEventId: string,
  referenceEventCategory: InterventionCategory,
  referenceTimestamp: number,
  windowDays: number,
  dataPoints: { timestamp: number; normalizedCapacity: number; drivers?: string[] }[]
): Promise<TrajectoryReport> {
  const preWindow = generateTrajectoryWindow(
    'pre',
    referenceEventId,
    referenceTimestamp,
    windowDays,
    dataPoints
  );

  const postWindow = generateTrajectoryWindow(
    'post',
    referenceEventId,
    referenceTimestamp,
    windowDays,
    dataPoints
  );

  // Calculate quality score based on data availability
  const expectedSignals = windowDays * 2; // Expecting ~2 signals per day
  const actualSignals = preWindow.signalCount + postWindow.signalCount;
  const qualityScore = Math.min(100, Math.round((actualSignals / expectedSignals) * 100));

  const report: TrajectoryReport = {
    id: generateId('trj'),
    cohortParticipantId,
    referenceEventId,
    referenceEventCategory,
    preWindow,
    postWindow,
    windowDays,
    generatedAt: Date.now(),
    qualityScore,
  };

  // Store the report
  const data = await AsyncStorage.getItem(TRAJECTORY_REPORTS_KEY);
  const reports: TrajectoryReport[] = data ? JSON.parse(data) : [];
  reports.push(report);
  await AsyncStorage.setItem(TRAJECTORY_REPORTS_KEY, JSON.stringify(reports));

  return report;
}

// ============================================
// TRAJECTORY REPORT RETRIEVAL
// ============================================

export async function getTrajectoryReports(
  cohortParticipantId?: string
): Promise<TrajectoryReport[]> {
  const data = await AsyncStorage.getItem(TRAJECTORY_REPORTS_KEY);
  if (!data) return [];
  const reports: TrajectoryReport[] = JSON.parse(data);

  if (cohortParticipantId) {
    return reports.filter((r) => r.cohortParticipantId === cohortParticipantId);
  }

  return reports;
}

export async function getTrajectoryReport(reportId: string): Promise<TrajectoryReport | null> {
  const reports = await getTrajectoryReports();
  return reports.find((r) => r.id === reportId) || null;
}

export async function getReportsByCategory(
  category: InterventionCategory
): Promise<TrajectoryReport[]> {
  const reports = await getTrajectoryReports();
  return reports.filter((r) => r.referenceEventCategory === category);
}

// ============================================
// OUTCOME-NEUTRAL ANALYSIS
// ============================================

export interface TrajectoryComparison {
  prePostDifference: {
    meanChange: number;
    volatilityChange: number;
    trendChange: number;
  };
  interpretation: {
    // Neutral language - no claims about "improvement" or "worsening"
    meanShift: 'higher' | 'lower' | 'stable';
    volatilityShift: 'increased' | 'decreased' | 'stable';
    trendShift: 'more_positive' | 'more_negative' | 'stable';
  };
}

export function comparePrePostWindows(report: TrajectoryReport): TrajectoryComparison {
  const { preWindow, postWindow } = report;

  const meanChange = postWindow.statistics.mean - preWindow.statistics.mean;
  const volatilityChange = postWindow.statistics.volatility - preWindow.statistics.volatility;
  const trendChange = postWindow.statistics.trend - preWindow.statistics.trend;

  // Use 5% threshold for determining "stable"
  const meanThreshold = preWindow.statistics.mean * 0.05;
  const volatilityThreshold = preWindow.statistics.volatility * 0.1;
  const trendThreshold = 0.01;

  return {
    prePostDifference: {
      meanChange: Math.round(meanChange * 100) / 100,
      volatilityChange: Math.round(volatilityChange * 100) / 100,
      trendChange: Math.round(trendChange * 1000) / 1000,
    },
    interpretation: {
      meanShift: Math.abs(meanChange) < meanThreshold
        ? 'stable'
        : meanChange > 0
        ? 'higher'
        : 'lower',
      volatilityShift: Math.abs(volatilityChange) < volatilityThreshold
        ? 'stable'
        : volatilityChange > 0
        ? 'increased'
        : 'decreased',
      trendShift: Math.abs(trendChange) < trendThreshold
        ? 'stable'
        : trendChange > 0
        ? 'more_positive'
        : 'more_negative',
    },
  };
}

// ============================================
// AGGREGATE TRAJECTORY ANALYSIS
// ============================================

export async function aggregateTrajectories(
  reports: TrajectoryReport[]
): Promise<{
  count: number;
  averageQualityScore: number;
  aggregatePreStats: {
    meanOfMeans: number;
    meanVolatility: number;
    meanTrend: number;
  };
  aggregatePostStats: {
    meanOfMeans: number;
    meanVolatility: number;
    meanTrend: number;
  };
  shiftDistribution: {
    meanHigher: number;
    meanLower: number;
    meanStable: number;
    volatilityIncreased: number;
    volatilityDecreased: number;
    volatilityStable: number;
  };
}> {
  if (reports.length === 0) {
    return {
      count: 0,
      averageQualityScore: 0,
      aggregatePreStats: { meanOfMeans: 0, meanVolatility: 0, meanTrend: 0 },
      aggregatePostStats: { meanOfMeans: 0, meanVolatility: 0, meanTrend: 0 },
      shiftDistribution: {
        meanHigher: 0, meanLower: 0, meanStable: 0,
        volatilityIncreased: 0, volatilityDecreased: 0, volatilityStable: 0,
      },
    };
  }

  let totalQuality = 0;
  const preMeans: number[] = [];
  const preVolatilities: number[] = [];
  const preTrends: number[] = [];
  const postMeans: number[] = [];
  const postVolatilities: number[] = [];
  const postTrends: number[] = [];

  const shiftDistribution = {
    meanHigher: 0, meanLower: 0, meanStable: 0,
    volatilityIncreased: 0, volatilityDecreased: 0, volatilityStable: 0,
  };

  for (const report of reports) {
    totalQuality += report.qualityScore;
    preMeans.push(report.preWindow.statistics.mean);
    preVolatilities.push(report.preWindow.statistics.volatility);
    preTrends.push(report.preWindow.statistics.trend);
    postMeans.push(report.postWindow.statistics.mean);
    postVolatilities.push(report.postWindow.statistics.volatility);
    postTrends.push(report.postWindow.statistics.trend);

    const comparison = comparePrePostWindows(report);
    if (comparison.interpretation.meanShift === 'higher') shiftDistribution.meanHigher++;
    else if (comparison.interpretation.meanShift === 'lower') shiftDistribution.meanLower++;
    else shiftDistribution.meanStable++;

    if (comparison.interpretation.volatilityShift === 'increased') shiftDistribution.volatilityIncreased++;
    else if (comparison.interpretation.volatilityShift === 'decreased') shiftDistribution.volatilityDecreased++;
    else shiftDistribution.volatilityStable++;
  }

  return {
    count: reports.length,
    averageQualityScore: Math.round(totalQuality / reports.length),
    aggregatePreStats: {
      meanOfMeans: Math.round(calculateMean(preMeans) * 100) / 100,
      meanVolatility: Math.round(calculateMean(preVolatilities) * 100) / 100,
      meanTrend: Math.round(calculateMean(preTrends) * 1000) / 1000,
    },
    aggregatePostStats: {
      meanOfMeans: Math.round(calculateMean(postMeans) * 100) / 100,
      meanVolatility: Math.round(calculateMean(postVolatilities) * 100) / 100,
      meanTrend: Math.round(calculateMean(postTrends) * 1000) / 1000,
    },
    shiftDistribution,
  };
}

// ============================================
// TRAJECTORY CURVE EXPORT
// ============================================

export function exportTrajectoryCurve(report: TrajectoryReport): {
  preWindowCurve: { dayOffset: number; normalizedCapacity: number }[];
  postWindowCurve: { dayOffset: number; normalizedCapacity: number }[];
} {
  const referenceTime = report.preWindow.endAt;

  const preWindowCurve = report.preWindow.dataPoints.map((dp) => ({
    dayOffset: (dp.timestamp - referenceTime) / (24 * 60 * 60 * 1000),
    normalizedCapacity: dp.normalizedCapacity,
  }));

  const postWindowCurve = report.postWindow.dataPoints.map((dp) => ({
    dayOffset: (dp.timestamp - referenceTime) / (24 * 60 * 60 * 1000),
    normalizedCapacity: dp.normalizedCapacity,
  }));

  return { preWindowCurve, postWindowCurve };
}
