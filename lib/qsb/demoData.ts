/**
 * QSB Demo Data Generator
 *
 * Generates realistic 90-day demo datasets for all QSB features.
 * All demo data is clearly labeled and never confused with real data.
 */

import {
  QSIData,
  LoadFrictionData,
  RecoveryElasticityData,
  EarlyDriftData,
  InterventionSensitivityData,
  QSBScope,
  DayOfWeek,
  TimeBlock,
  HeatmapCell,
  DriftSignal,
  InterventionEffect,
  Intervention,
} from './types';

// Seed for reproducible demo data
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Generate sparkline with realistic patterns
function generateSparkline(
  baseValue: number,
  volatility: number,
  trend: 'up' | 'down' | 'stable',
  days: number = 90
): number[] {
  const data: number[] = [];
  let value = baseValue;
  const trendFactor = trend === 'up' ? 0.15 : trend === 'down' ? -0.15 : 0;

  for (let i = 0; i < days; i++) {
    // Add daily variation
    const dailyChange = (seededRandom(i * 7 + baseValue) - 0.5) * volatility;
    // Add trend
    const trendChange = trendFactor * (i / days);
    // Add weekly pattern (lower on Mon, higher mid-week)
    const dayOfWeek = i % 7;
    const weeklyPattern = dayOfWeek === 0 ? -5 : dayOfWeek === 3 ? 5 : 0;

    value = baseValue + dailyChange * 20 + trendChange * 15 + weeklyPattern;
    value = Math.max(10, Math.min(95, value));
    data.push(Math.round(value));
  }

  return data;
}

// ============================================
// QSI DEMO DATA
// ============================================

export function generateQSIDemo(scope: QSBScope): QSIData {
  const baseScores = {
    personal: { headline: 67, capacity: 72, volatility: 58, recovery: 71 },
    org: { headline: 61, capacity: 65, volatility: 52, recovery: 66 },
    global: { headline: 64, capacity: 68, volatility: 55, recovery: 69 },
  };

  const scores = baseScores[scope];

  return {
    headline: scores.headline,
    headlineTrend: scope === 'personal' ? 'up' : 'stable',
    subIndices: {
      capacityLevel: {
        label: 'Capacity Level',
        value: scores.capacity,
        trend: 'up',
        description: 'Average reported capacity across the period',
      },
      volatility: {
        label: 'Volatility',
        value: scores.volatility,
        trend: scope === 'org' ? 'down' : 'stable',
        description: 'Lower is better. Measures day-to-day consistency.',
      },
      recoveryVelocity: {
        label: 'Recovery Velocity',
        value: scores.recovery,
        trend: 'stable',
        description: 'Speed of bounce-back after low-capacity periods',
      },
    },
    sparkline: generateSparkline(
      scores.headline,
      scope === 'personal' ? 0.8 : 0.4,
      scope === 'personal' ? 'up' : 'stable'
    ),
    scope,
    cohortSize: scope === 'personal' ? undefined : scope === 'org' ? 47 : 1284,
    lastUpdated: new Date().toISOString(),
    isDemo: true,
  };
}

// ============================================
// LOAD FRICTION MAP DEMO DATA
// ============================================

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES: TimeBlock[] = ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'];

function generateHeatmap(scope: QSBScope): HeatmapCell[] {
  const cells: HeatmapCell[] = [];

  // Patterns: Monday morning low, Wednesday afternoon low, Friday evening high
  const patterns: Record<string, number> = {
    'Mon-Morning': 35,
    'Mon-Midday': 48,
    'Tue-Morning': 55,
    'Tue-Afternoon': 62,
    'Wed-Afternoon': 38,
    'Wed-Evening': 52,
    'Thu-Midday': 70,
    'Thu-Afternoon': 68,
    'Fri-Morning': 58,
    'Fri-Evening': 78,
    'Sat-Morning': 72,
    'Sat-Midday': 75,
    'Sun-Evening': 45,
    'Sun-Night': 40,
  };

  DAYS.forEach((day, dayIdx) => {
    TIMES.forEach((time, timeIdx) => {
      const key = `${day}-${time}`;
      const baseValue = patterns[key] || 60;
      const scopeAdjust = scope === 'personal' ? 5 : scope === 'org' ? -3 : 0;
      const noise = seededRandom(dayIdx * 10 + timeIdx) * 10 - 5;

      cells.push({
        day,
        time,
        value: Math.round(Math.max(20, Math.min(90, baseValue + scopeAdjust + noise))),
        sampleCount: scope === 'personal' ? 12 : scope === 'org' ? 423 : 11847,
      });
    });
  });

  return cells;
}

export function generateLoadFrictionDemo(scope: QSBScope): LoadFrictionData {
  const heatmap = generateHeatmap(scope);

  // Find peak friction (lowest values) and low friction (highest values)
  const sorted = [...heatmap].sort((a, b) => a.value - b.value);

  return {
    heatmap,
    peakFrictionTimes: sorted.slice(0, 3).map(cell => ({
      day: cell.day,
      time: cell.time,
      severity: 100 - cell.value,
    })),
    lowFrictionTimes: sorted.slice(-3).reverse().map(cell => ({
      day: cell.day,
      time: cell.time,
      score: cell.value,
    })),
    weekdayAvg: Math.round(
      heatmap
        .filter(c => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(c.day))
        .reduce((sum, c) => sum + c.value, 0) / 25
    ),
    weekendAvg: Math.round(
      heatmap
        .filter(c => ['Sat', 'Sun'].includes(c.day))
        .reduce((sum, c) => sum + c.value, 0) / 10
    ),
    scope,
    cohortSize: scope === 'personal' ? undefined : scope === 'org' ? 47 : 1284,
    lastUpdated: new Date().toISOString(),
    isDemo: true,
  };
}

// ============================================
// RECOVERY ELASTICITY DEMO DATA
// ============================================

export function generateRecoveryElasticityDemo(scope: QSBScope): RecoveryElasticityData {
  const baseScore = scope === 'personal' ? 72 : scope === 'org' ? 64 : 68;

  return {
    score: baseScore,
    trend: scope === 'personal' ? 'improving' : 'stable',
    avgRecoveryHours: scope === 'personal' ? 18.5 : scope === 'org' ? 24.2 : 21.3,
    avgRecoveryCompleteness: scope === 'personal' ? 87 : scope === 'org' ? 79 : 83,
    recentEvents: [
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dipDepth: 28,
        recoveryTime: 14,
        recoveryCompleteness: 92,
      },
      {
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        dipDepth: 35,
        recoveryTime: 22,
        recoveryCompleteness: 85,
      },
      {
        date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        dipDepth: 42,
        recoveryTime: 28,
        recoveryCompleteness: 78,
      },
    ],
    historicalComparison: {
      last30Days: baseScore,
      previous30Days: baseScore - (scope === 'personal' ? 8 : 2),
      changePercent: scope === 'personal' ? 12.5 : 3.2,
    },
    scope,
    cohortSize: scope === 'personal' ? undefined : scope === 'org' ? 47 : 1284,
    lastUpdated: new Date().toISOString(),
    isDemo: true,
  };
}

// ============================================
// EARLY DRIFT DETECTOR DEMO DATA
// ============================================

export function generateEarlyDriftDemo(scope: QSBScope): EarlyDriftData {
  const signals: DriftSignal[] = [];

  if (scope === 'org') {
    signals.push({
      type: 'volatility_increase',
      label: 'Increased Volatility',
      description: 'Day-to-day capacity variation has increased 23% over the past 2 weeks.',
      confidence: 'medium',
      severity: 45,
      detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      dataPoints: 14,
    });
    signals.push({
      type: 'recovery_lag',
      label: 'Slower Recovery',
      description: 'Average recovery time after dips has increased from 18h to 26h.',
      confidence: 'high',
      severity: 58,
      detectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      dataPoints: 23,
    });
  } else if (scope === 'personal') {
    signals.push({
      type: 'pattern_break',
      label: 'Pattern Change',
      description: 'Your typical Wednesday dip hasn\'t occurred in 3 weeks—positive shift.',
      confidence: 'medium',
      severity: 20,
      detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      dataPoints: 21,
    });
  } else {
    signals.push({
      type: 'downward_slope',
      label: 'Gradual Decline',
      description: 'Aggregate capacity trending down 0.8% per week over past month.',
      confidence: 'low',
      severity: 32,
      detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      dataPoints: 30,
    });
  }

  return {
    overallRisk: scope === 'org' ? 'moderate' : 'low',
    signals,
    trendDirection: scope === 'personal' ? 'improving' : scope === 'org' ? 'declining' : 'stable',
    daysUntilPotentialIssue: scope === 'org' ? 12 : undefined,
    recommendations: scope === 'org'
      ? [
          'Consider reviewing workload distribution',
          'Monitor recovery patterns closely over next 2 weeks',
          'Evaluate recent schedule changes for impact',
        ]
      : [
          'Current trajectory looks healthy',
          'Continue current patterns',
        ],
    scope,
    cohortSize: scope === 'personal' ? undefined : scope === 'org' ? 47 : 1284,
    lastUpdated: new Date().toISOString(),
    isDemo: true,
  };
}

// ============================================
// INTERVENTION SENSITIVITY DEMO DATA
// ============================================

export function generateInterventionSensitivityDemo(scope: QSBScope): InterventionSensitivityData {
  const activeInterventions: Intervention[] = [
    {
      id: 'int-1',
      type: 'meeting_reduction',
      label: 'Reduced meeting load (Fridays)',
      startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      isOngoing: true,
    },
  ];

  if (scope === 'org') {
    activeInterventions.push({
      id: 'int-2',
      type: 'schedule_change',
      label: 'Flexible start times pilot',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      isOngoing: true,
    });
  }

  const historicalEffects: InterventionEffect[] = [
    {
      intervention: {
        id: 'hist-1',
        type: 'break_added',
        label: 'Added 15-min afternoon break',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        isOngoing: false,
      },
      preCapacityAvg: 58,
      postCapacityAvg: 67,
      changePercent: 15.5,
      confidence: 'high',
      sampleSizePre: scope === 'personal' ? 30 : 1410,
      sampleSizePost: scope === 'personal' ? 30 : 1410,
      isStatisticallySignificant: true,
    },
    {
      intervention: {
        id: 'hist-2',
        type: 'workload_adjustment',
        label: 'Deadline extension (Q3)',
        startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        isOngoing: false,
      },
      preCapacityAvg: 52,
      postCapacityAvg: 61,
      changePercent: 17.3,
      confidence: 'medium',
      sampleSizePre: scope === 'personal' ? 14 : 658,
      sampleSizePost: scope === 'personal' ? 10 : 470,
      isStatisticallySignificant: scope !== 'personal',
    },
  ];

  return {
    activeInterventions,
    historicalEffects,
    mostEffective: historicalEffects[1],
    leastEffective: undefined,
    suggestedInterventions: [
      {
        type: 'environment_change',
        label: 'Quiet focus hours (morning)',
        expectedImpact: 12,
        confidence: 'medium',
      },
      {
        type: 'break_added',
        label: 'Movement breaks every 90 min',
        expectedImpact: 8,
        confidence: 'high',
      },
    ],
    scope,
    cohortSize: scope === 'personal' ? undefined : scope === 'org' ? 47 : 1284,
    lastUpdated: new Date().toISOString(),
    isDemo: true,
  };
}
