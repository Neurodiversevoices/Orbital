import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataProvenanceRecord, DataQualityScore } from '../../types';

const PROVENANCE_KEY = '@orbital:data_provenance';
const QUALITY_SCORES_KEY = '@orbital:data_quality_scores';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// DATA PROVENANCE TRACKING
// ============================================

async function getAllProvenance(): Promise<DataProvenanceRecord[]> {
  const data = await AsyncStorage.getItem(PROVENANCE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function saveProvenance(records: DataProvenanceRecord[]): Promise<void> {
  await AsyncStorage.setItem(PROVENANCE_KEY, JSON.stringify(records));
}

export async function recordDataProvenance(
  dataPointId: string,
  cohortParticipantId: string,
  params: {
    sourceType: DataProvenanceRecord['sourceType'];
    deviceType?: string;
    appVersion: string;
    timezoneOffset: number;
  }
): Promise<DataProvenanceRecord> {
  const record: DataProvenanceRecord = {
    dataPointId,
    cohortParticipantId,
    sourceType: params.sourceType,
    capturedAt: Date.now(),
    deviceType: params.deviceType,
    appVersion: params.appVersion,
    timezoneOffset: params.timezoneOffset,
    modificationHistory: [
      { modifiedAt: Date.now(), modificationType: 'create' },
    ],
  };

  const records = await getAllProvenance();
  records.push(record);
  await saveProvenance(records);

  return record;
}

export async function recordDataModification(
  dataPointId: string,
  modificationType: 'update' | 'delete'
): Promise<DataProvenanceRecord | null> {
  const records = await getAllProvenance();
  const index = records.findIndex((r) => r.dataPointId === dataPointId);
  if (index === -1) return null;

  records[index].modificationHistory.push({
    modifiedAt: Date.now(),
    modificationType,
  });

  await saveProvenance(records);
  return records[index];
}

export async function getProvenanceRecord(
  dataPointId: string
): Promise<DataProvenanceRecord | null> {
  const records = await getAllProvenance();
  return records.find((r) => r.dataPointId === dataPointId) || null;
}

export async function getParticipantProvenance(
  cohortParticipantId: string
): Promise<DataProvenanceRecord[]> {
  const records = await getAllProvenance();
  return records.filter((r) => r.cohortParticipantId === cohortParticipantId);
}

// ============================================
// DATA QUALITY SCORING
// ============================================

export async function calculateDataQualityScore(
  cohortParticipantId: string,
  dataPoints: { timestamp: number; value: number }[],
  expectedDailySignals: number = 2
): Promise<DataQualityScore> {
  if (dataPoints.length === 0) {
    const emptyScore: DataQualityScore = {
      cohortParticipantId,
      overallScore: 0,
      dimensions: {
        completeness: 0,
        consistency: 0,
        timeliness: 0,
        continuity: 0,
        stability: 0,
      },
      metrics: {
        totalSignals: 0,
        expectedSignals: 0,
        missingDays: 0,
        duplicateCount: 0,
        outlierCount: 0,
        averageGapHours: 0,
        longestGapHours: 0,
        signalFrequency: 'low',
      },
      calculatedAt: Date.now(),
    };
    await saveQualityScore(emptyScore);
    return emptyScore;
  }

  // Sort by timestamp
  const sorted = [...dataPoints].sort((a, b) => a.timestamp - b.timestamp);
  const firstTimestamp = sorted[0].timestamp;
  const lastTimestamp = sorted[sorted.length - 1].timestamp;

  // Calculate expected signals
  const daysBetween = Math.max(1, (lastTimestamp - firstTimestamp) / (24 * 60 * 60 * 1000));
  const expectedSignals = Math.round(daysBetween * expectedDailySignals);

  // Calculate missing days
  const daysWithData = new Set(
    sorted.map((dp) => Math.floor(dp.timestamp / (24 * 60 * 60 * 1000)))
  );
  const totalDays = Math.ceil(daysBetween);
  const missingDays = totalDays - daysWithData.size;

  // Calculate gaps
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].timestamp - sorted[i - 1].timestamp) / (60 * 60 * 1000)); // hours
  }
  const averageGapHours = gaps.length > 0
    ? gaps.reduce((sum, g) => sum + g, 0) / gaps.length
    : 0;
  const longestGapHours = gaps.length > 0 ? Math.max(...gaps) : 0;

  // Detect duplicates (same timestamp within 1 minute)
  let duplicateCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timestamp - sorted[i - 1].timestamp < 60000) {
      duplicateCount++;
    }
  }

  // Detect outliers (values > 3 standard deviations from mean)
  const values = sorted.map((dp) => dp.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const outlierCount = values.filter((v) => Math.abs(v - mean) > 3 * stdDev).length;

  // Calculate dimension scores (0-100)

  // Completeness: How much of expected data exists
  const completeness = Math.min(100, Math.round((sorted.length / expectedSignals) * 100));

  // Consistency: Low duplicates and outliers
  const anomalyRate = (duplicateCount + outlierCount) / sorted.length;
  const consistency = Math.round((1 - Math.min(1, anomalyRate * 5)) * 100);

  // Timeliness: Recent data is more valuable
  const daysSinceLast = (Date.now() - lastTimestamp) / (24 * 60 * 60 * 1000);
  const timeliness = daysSinceLast < 1 ? 100 :
                     daysSinceLast < 7 ? 80 :
                     daysSinceLast < 30 ? 50 :
                     daysSinceLast < 90 ? 30 : 10;

  // Continuity: Low gaps
  const gapPenalty = Math.min(1, longestGapHours / (7 * 24)); // Max penalty at 7 days
  const continuity = Math.round((1 - gapPenalty) * 100);

  // Stability: Consistent signal frequency
  const expectedGapHours = 24 / expectedDailySignals;
  const gapVariance = gaps.reduce((sum, g) => sum + Math.pow(g - expectedGapHours, 2), 0) / Math.max(1, gaps.length);
  const stability = Math.round(Math.max(0, 100 - Math.sqrt(gapVariance) * 2));

  // Overall score (weighted average)
  const overallScore = Math.round(
    completeness * 0.25 +
    consistency * 0.20 +
    timeliness * 0.20 +
    continuity * 0.20 +
    stability * 0.15
  );

  // Determine signal frequency
  const signalsPerDay = sorted.length / daysBetween;
  const signalFrequency: DataQualityScore['metrics']['signalFrequency'] =
    signalsPerDay >= 1.5 ? 'high' :
    signalsPerDay >= 0.5 ? 'medium' : 'low';

  const score: DataQualityScore = {
    cohortParticipantId,
    overallScore,
    dimensions: {
      completeness,
      consistency,
      timeliness,
      continuity,
      stability,
    },
    metrics: {
      totalSignals: sorted.length,
      expectedSignals,
      missingDays,
      duplicateCount,
      outlierCount,
      averageGapHours: Math.round(averageGapHours * 10) / 10,
      longestGapHours: Math.round(longestGapHours * 10) / 10,
      signalFrequency,
    },
    calculatedAt: Date.now(),
  };

  await saveQualityScore(score);
  return score;
}

// ============================================
// QUALITY SCORE STORAGE
// ============================================

async function getAllQualityScores(): Promise<DataQualityScore[]> {
  const data = await AsyncStorage.getItem(QUALITY_SCORES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function saveQualityScore(score: DataQualityScore): Promise<void> {
  const scores = await getAllQualityScores();
  const index = scores.findIndex((s) => s.cohortParticipantId === score.cohortParticipantId);

  if (index >= 0) {
    scores[index] = score;
  } else {
    scores.push(score);
  }

  await AsyncStorage.setItem(QUALITY_SCORES_KEY, JSON.stringify(scores));
}

export async function getQualityScore(
  cohortParticipantId: string
): Promise<DataQualityScore | null> {
  const scores = await getAllQualityScores();
  return scores.find((s) => s.cohortParticipantId === cohortParticipantId) || null;
}

// ============================================
// AGGREGATE QUALITY METRICS
// ============================================

export async function getAggregateQualityMetrics(
  scores: DataQualityScore[]
): Promise<{
  count: number;
  averageOverallScore: number;
  scoreDistribution: {
    high: number; // >= 80
    medium: number; // 50-79
    low: number; // < 50
  };
  averageDimensions: {
    completeness: number;
    consistency: number;
    timeliness: number;
    continuity: number;
    stability: number;
  };
  frequencyDistribution: Record<DataQualityScore['metrics']['signalFrequency'], number>;
}> {
  if (scores.length === 0) {
    return {
      count: 0,
      averageOverallScore: 0,
      scoreDistribution: { high: 0, medium: 0, low: 0 },
      averageDimensions: { completeness: 0, consistency: 0, timeliness: 0, continuity: 0, stability: 0 },
      frequencyDistribution: { high: 0, medium: 0, low: 0 },
    };
  }

  let totalOverall = 0;
  const totals = { completeness: 0, consistency: 0, timeliness: 0, continuity: 0, stability: 0 };
  const scoreDistribution = { high: 0, medium: 0, low: 0 };
  const frequencyDistribution = { high: 0, medium: 0, low: 0 };

  for (const score of scores) {
    totalOverall += score.overallScore;
    totals.completeness += score.dimensions.completeness;
    totals.consistency += score.dimensions.consistency;
    totals.timeliness += score.dimensions.timeliness;
    totals.continuity += score.dimensions.continuity;
    totals.stability += score.dimensions.stability;

    if (score.overallScore >= 80) scoreDistribution.high++;
    else if (score.overallScore >= 50) scoreDistribution.medium++;
    else scoreDistribution.low++;

    frequencyDistribution[score.metrics.signalFrequency]++;
  }

  return {
    count: scores.length,
    averageOverallScore: Math.round(totalOverall / scores.length),
    scoreDistribution,
    averageDimensions: {
      completeness: Math.round(totals.completeness / scores.length),
      consistency: Math.round(totals.consistency / scores.length),
      timeliness: Math.round(totals.timeliness / scores.length),
      continuity: Math.round(totals.continuity / scores.length),
      stability: Math.round(totals.stability / scores.length),
    },
    frequencyDistribution,
  };
}

// ============================================
// QUALITY THRESHOLDS FOR RESEARCH ELIGIBILITY
// ============================================

export const QUALITY_THRESHOLDS = {
  minimum: {
    overallScore: 30,
    completeness: 20,
    continuity: 20,
    minSignals: 7,
  },
  recommended: {
    overallScore: 60,
    completeness: 50,
    continuity: 50,
    minSignals: 30,
  },
  high: {
    overallScore: 80,
    completeness: 70,
    continuity: 70,
    minSignals: 90,
  },
};

export function meetsQualityThreshold(
  score: DataQualityScore,
  threshold: 'minimum' | 'recommended' | 'high'
): boolean {
  const thresholds = QUALITY_THRESHOLDS[threshold];

  return (
    score.overallScore >= thresholds.overallScore &&
    score.dimensions.completeness >= thresholds.completeness &&
    score.dimensions.continuity >= thresholds.continuity &&
    score.metrics.totalSignals >= thresholds.minSignals
  );
}
