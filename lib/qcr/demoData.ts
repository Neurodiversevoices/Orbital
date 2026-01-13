/**
 * QCR Demo Data (Canonical 10-Year Snapshot)
 *
 * Used when FOUNDER_DEMO_ENABLED && isDemoMode is true.
 * Provides a fully populated institutional-grade QCR example.
 */

import {
  QuarterlyCapacityReport,
  QCRCapacityComposition,
  QCREventCorrelation,
  QCRChainOfCustody,
  QCRSignalFidelity,
  QCRProviderShield,
} from './types';

/**
 * Canonical demo snapshot representing 10 years of record history.
 * Q4 2025 quarter window with 3,652 days total record on file.
 */
export const QCR_DEMO_SNAPSHOT: QuarterlyCapacityReport = {
  id: 'qcr_demo_2025q4_001',
  version: '1.0',
  generatedAt: Date.now(),
  isDemoReport: true,

  period: {
    quarterId: '2025-Q4',
    startDate: new Date('2025-10-01T00:00:00.000Z').getTime(),
    endDate: new Date('2025-12-31T23:59:59.999Z').getTime(),
    dateRangeLabel: 'Oct 1, 2025 – Dec 31, 2025',
  },

  recordDepth: {
    totalObservations: 247,
    uniqueDays: 78,
    periodDays: 92,
    coveragePercent: 85,
    coverageLevel: 'consistent',
  },

  distribution: {
    resourcedPercent: 43,
    stretchedPercent: 37,
    depletedPercent: 20,
    counts: {
      resourced: 106,
      stretched: 91,
      depleted: 50,
    },
  },

  patternMetrics: [
    {
      id: 'stability',
      label: 'Stability',
      score: 72,
      level: 'moderate',
      description: 'Capacity levels showed moderate day-to-day consistency with periodic fluctuations.',
    },
    {
      id: 'volatility',
      label: 'Volatility',
      score: 38,
      level: 'low',
      description: 'State transitions occurred at expected frequency without significant rapid shifts.',
    },
    {
      id: 'recovery_lag',
      label: 'Recovery Lag',
      score: 2.4,
      level: 'moderate',
      description: 'Average recovery period from depleted state was 2.4 days.',
    },
  ],

  drivers: {
    all: [],
    topOverall: [],
    topDepleters: [],
  },

  weekStructure: {
    hardestDay: {
      dayOfWeek: 3,
      dayName: 'Wednesday',
      depletionRate: 31,
    },
    dayOfWeekVariance: 12.5,
    timeOfDay: {
      morning: { avgCapacity: 68, observations: 82 },
      afternoon: { avgCapacity: 52, observations: 95 },
      evening: { avgCapacity: 61, observations: 70 },
    },
    vulnerableTimeSlot: 'afternoon',
  },

  notableEpisodes: [
    {
      id: 'ep_001',
      startDate: new Date('2025-11-12T00:00:00.000Z').getTime(),
      endDate: new Date('2025-11-15T23:59:59.999Z').getTime(),
      durationDays: 4,
      type: 'depletion_cluster',
      description: 'Four-day consecutive depletion period with sustained low capacity readings.',
      associatedDrivers: ['demand', 'social'],
    },
    {
      id: 'ep_002',
      startDate: new Date('2025-12-02T00:00:00.000Z').getTime(),
      endDate: new Date('2025-12-08T23:59:59.999Z').getTime(),
      durationDays: 7,
      type: 'stability_window',
      description: 'Seven-day stability window with consistent resourced state maintenance.',
      associatedDrivers: [],
    },
  ],

  clinicalNotes: [
    {
      category: 'observation',
      text: 'Record demonstrates sustained engagement over a 10-year observation window. Current quarter coverage (85%) indicates consistent self-monitoring behavior.',
      priority: 1,
    },
    {
      category: 'pattern_note',
      text: 'Sensory factors appear as the most frequent driver category (36% of tagged observations), with a lower strain correlation (28%) compared to demand-related factors (42% strain rate).',
      priority: 2,
    },
    {
      category: 'consideration',
      text: 'Mid-week depletion clustering (Wednesday peak) may warrant environmental or scheduling review for institutional planning purposes.',
      priority: 3,
    },
  ],

  chartData: {
    dailyCapacity: [
      { date: new Date('2025-10-01'), capacityIndex: 60, observationCount: 3 },
      { date: new Date('2025-10-02'), capacityIndex: 63, observationCount: 3 },
      { date: new Date('2025-10-03'), capacityIndex: 58, observationCount: 2 },
      { date: new Date('2025-10-04'), capacityIndex: 61, observationCount: 3 },
      { date: new Date('2025-10-05'), capacityIndex: 67, observationCount: 3 },
      { date: new Date('2025-10-06'), capacityIndex: 62, observationCount: 2 },
      { date: new Date('2025-10-07'), capacityIndex: 55, observationCount: 3 },
      { date: new Date('2025-10-08'), capacityIndex: 70, observationCount: 3 },
      { date: new Date('2025-10-09'), capacityIndex: 73, observationCount: 3 },
      { date: new Date('2025-10-10'), capacityIndex: 68, observationCount: 2 },
      { date: new Date('2025-10-11'), capacityIndex: 65, observationCount: 3 },
      { date: new Date('2025-10-12'), capacityIndex: 71, observationCount: 3 },
      { date: new Date('2025-10-13'), capacityIndex: 75, observationCount: 3 },
      { date: new Date('2025-10-14'), capacityIndex: 58, observationCount: 2 },
      { date: new Date('2025-10-15'), capacityIndex: 52, observationCount: 3 },
      { date: new Date('2025-10-18'), capacityIndex: 68, observationCount: 3 },
      { date: new Date('2025-10-20'), capacityIndex: 72, observationCount: 3 },
      { date: new Date('2025-10-22'), capacityIndex: 55, observationCount: 3 },
      { date: new Date('2025-10-25'), capacityIndex: 78, observationCount: 3 },
      { date: new Date('2025-10-27'), capacityIndex: 62, observationCount: 2 },
      { date: new Date('2025-10-30'), capacityIndex: 75, observationCount: 3 },
      { date: new Date('2025-11-02'), capacityIndex: 68, observationCount: 3 },
      { date: new Date('2025-11-05'), capacityIndex: 58, observationCount: 2 },
      { date: new Date('2025-11-08'), capacityIndex: 65, observationCount: 3 },
      { date: new Date('2025-11-10'), capacityIndex: 52, observationCount: 3 },
      { date: new Date('2025-11-12'), capacityIndex: 38, observationCount: 3 },
      { date: new Date('2025-11-13'), capacityIndex: 35, observationCount: 2 },
      { date: new Date('2025-11-14'), capacityIndex: 32, observationCount: 3 },
      { date: new Date('2025-11-15'), capacityIndex: 40, observationCount: 3 },
      { date: new Date('2025-11-18'), capacityIndex: 55, observationCount: 3 },
      { date: new Date('2025-11-20'), capacityIndex: 62, observationCount: 3 },
      { date: new Date('2025-11-22'), capacityIndex: 68, observationCount: 2 },
      { date: new Date('2025-11-25'), capacityIndex: 72, observationCount: 3 },
      { date: new Date('2025-11-28'), capacityIndex: 65, observationCount: 3 },
      { date: new Date('2025-12-01'), capacityIndex: 78, observationCount: 3 },
      { date: new Date('2025-12-02'), capacityIndex: 82, observationCount: 3 },
      { date: new Date('2025-12-03'), capacityIndex: 85, observationCount: 3 },
      { date: new Date('2025-12-04'), capacityIndex: 80, observationCount: 3 },
      { date: new Date('2025-12-05'), capacityIndex: 78, observationCount: 3 },
      { date: new Date('2025-12-06'), capacityIndex: 82, observationCount: 2 },
      { date: new Date('2025-12-07'), capacityIndex: 75, observationCount: 3 },
      { date: new Date('2025-12-08'), capacityIndex: 72, observationCount: 3 },
      { date: new Date('2025-12-10'), capacityIndex: 68, observationCount: 3 },
      { date: new Date('2025-12-12'), capacityIndex: 55, observationCount: 2 },
      { date: new Date('2025-12-15'), capacityIndex: 62, observationCount: 3 },
      { date: new Date('2025-12-18'), capacityIndex: 58, observationCount: 3 },
      { date: new Date('2025-12-20'), capacityIndex: 52, observationCount: 2 },
      { date: new Date('2025-12-22'), capacityIndex: 65, observationCount: 3 },
      { date: new Date('2025-12-25'), capacityIndex: 72, observationCount: 3 },
      { date: new Date('2025-12-28'), capacityIndex: 68, observationCount: 3 },
      { date: new Date('2025-12-31'), capacityIndex: 70, observationCount: 3 },
    ],
    weeklyMeans: [
      { weekStart: new Date('2025-10-01'), weekEnd: new Date('2025-10-07'), meanCapacity: 66, stdDev: 11, observationCount: 19 },
      { weekStart: new Date('2025-10-08'), weekEnd: new Date('2025-10-14'), meanCapacity: 69, stdDev: 12, observationCount: 21 },
      { weekStart: new Date('2025-10-15'), weekEnd: new Date('2025-10-21'), meanCapacity: 62, stdDev: 13, observationCount: 18 },
      { weekStart: new Date('2025-10-22'), weekEnd: new Date('2025-10-28'), meanCapacity: 65, stdDev: 12, observationCount: 20 },
      { weekStart: new Date('2025-10-29'), weekEnd: new Date('2025-11-04'), meanCapacity: 71, stdDev: 10, observationCount: 22 },
      { weekStart: new Date('2025-11-05'), weekEnd: new Date('2025-11-11'), meanCapacity: 63, stdDev: 14, observationCount: 17 },
      { weekStart: new Date('2025-11-12'), weekEnd: new Date('2025-11-18'), meanCapacity: 56, stdDev: 15, observationCount: 16 },
      { weekStart: new Date('2025-11-19'), weekEnd: new Date('2025-11-25'), meanCapacity: 62, stdDev: 13, observationCount: 19 },
      { weekStart: new Date('2025-11-26'), weekEnd: new Date('2025-12-02'), meanCapacity: 69, stdDev: 11, observationCount: 21 },
      { weekStart: new Date('2025-12-03'), weekEnd: new Date('2025-12-09'), meanCapacity: 73, stdDev: 9, observationCount: 23 },
      { weekStart: new Date('2025-12-10'), weekEnd: new Date('2025-12-16'), meanCapacity: 65, stdDev: 12, observationCount: 18 },
      { weekStart: new Date('2025-12-17'), weekEnd: new Date('2025-12-23'), meanCapacity: 61, stdDev: 14, observationCount: 17 },
      { weekStart: new Date('2025-12-24'), weekEnd: new Date('2025-12-31'), meanCapacity: 69, stdDev: 11, observationCount: 16 },
    ],
    driverFrequency: [
      { driver: 'sensory', count: 89, percentage: 36, strainRate: 28 },
      { driver: 'demand', count: 76, percentage: 31, strainRate: 42 },
      { driver: 'social', count: 82, percentage: 33, strainRate: 35 },
    ],
    stateDistribution: [
      { state: 'resourced', count: 106, percentage: 43 },
      { state: 'stretched', count: 91, percentage: 37 },
      { state: 'depleted', count: 50, percentage: 20 },
    ],
  },

  // Capacity Composition (Pro Intelligence)
  capacityComposition: {
    sleepImpact: -40,
    energyImpact: -20,
    brainImpact: 0,
    subjectiveImpact: 15,
    summary: {
      sleep: 'depleting',
      energy: 'depleting',
      brain: 'neutral',
      subjective: 'compensatory',
    },
  } as QCRCapacityComposition,

  // Event-Level Correlation (Pro Intelligence)
  eventCorrelation: {
    weekNumber: 7,
    weekStart: new Date('2025-11-12T00:00:00.000Z').getTime(),
    weekEnd: new Date('2025-11-18T23:59:59.999Z').getTime(),
    meanCapacity: 56,
    contributingFactors: {
      sleepDebtChange: 15,
      energyVariance: 'within_baseline',
      cognitiveLoad: 'stable',
      primaryDriver: 'sleep',
    },
    conclusion: 'Decline primarily sleep-driven, not workload-driven.',
  } as QCREventCorrelation,

  longitudinalContext: {
    totalRecordDays: 3652, // 10 years
    isFirstQuarter: false,
    previousQuarterComparison: {
      capacityTrend: 'stable',
      depletionChange: -2,
    },
  },

  // Forensic Infrastructure: Chain of Custody
  chainOfCustody: {
    integrityHash: 'SHA256:A1B2C3D4D4C3B2A1',
    protocolVersion: 'QCR-1.0-CLINICAL',
    generatedTimestamp: new Date().toISOString(),
    observationWindowStart: '2025-10-01T00:00:00.000Z',
    observationWindowEnd: '2025-12-31T23:59:59.999Z',
    status: 'IMMUTABLE_SNAPSHOT',
    sourceSystem: 'Orbital Capacity Intelligence Platform',
    dataProvenance: 'Client-reported capacity observations',
  } as QCRChainOfCustody,

  // Forensic Infrastructure: Signal Fidelity Audit
  signalFidelity: {
    complianceRate: {
      value: 85,
      level: 'High Reliability',
    },
    inputLatency: {
      meanSeconds: 4.2,
      interpretation: 'Consistent with thoughtful reporting',
    },
    patternConsistency: {
      value: 78,
      interpretation: 'Low probability of random entry',
    },
    sessionCompletionRate: {
      value: 85,
      level: 'Complete',
    },
    verdict: 'CLINICALLY RELIABLE SIGNAL',
    narrativeSummary: 'This report reflects 85% observation compliance with consistent input patterns (mean latency 4.2s). Pattern coherence of 78% indicates low probability of random or reflexive entry. Data quality supports clinical utility.',
  } as QCRSignalFidelity,

  // Forensic Infrastructure: Provider Shield
  providerShield: {
    utilityStatement:
      'This report is provided as a supplementary resource to support clinical dialogue. ' +
      'It reflects client-reported observations and computed pattern metrics. ' +
      'This document does not constitute a diagnosis, treatment recommendation, or clinical assessment.',
    liabilityDisclaimer:
      'IMPORTANT: This report is generated from self-reported data and algorithmic analysis. ' +
      'It is not a substitute for professional clinical judgment. Healthcare providers should ' +
      'integrate this information with their own assessments, clinical interviews, and professional expertise. ' +
      'Orbital Health Intelligence, Inc. makes no warranties regarding the accuracy, completeness, ' +
      'or clinical applicability of this report for any individual case.',
    dataHandlingNotice:
      'Data Processing: All observations are processed locally on the client device. ' +
      'This report was generated from encrypted local storage. ' +
      'No personally identifiable health information was transmitted to external servers during report generation.',
    ipOwnership:
      '© Orbital Health Intelligence, Inc. All rights reserved. ' +
      'This document and its contents are proprietary. Unauthorized reproduction, ' +
      'distribution, or modification is prohibited. ' +
      'Orbital Capacity Intelligence Platform™ is a trademark of Orbital Health Intelligence, Inc.',
  } as QCRProviderShield,
};

/**
 * Get demo QCR for a specific quarter (uses canonical data with adjusted period)
 */
export function getDemoQCR(quarterId?: string): QuarterlyCapacityReport {
  const now = new Date();
  const report: QuarterlyCapacityReport = {
    ...QCR_DEMO_SNAPSHOT,
    generatedAt: Date.now(),
    // Update chain of custody timestamp
    chainOfCustody: {
      ...QCR_DEMO_SNAPSHOT.chainOfCustody,
      generatedTimestamp: now.toISOString(),
    },
  };

  if (quarterId && quarterId !== '2025-Q4') {
    // Adjust period label for different quarters while keeping canonical data
    const [year, q] = quarterId.split('-');
    const quarterNum = parseInt(q.replace('Q', ''), 10);
    const startMonth = (quarterNum - 1) * 3;
    const endMonth = startMonth + 3;

    const startDate = new Date(parseInt(year, 10), startMonth, 1);
    const endDate = new Date(parseInt(year, 10), endMonth, 0, 23, 59, 59, 999);

    report.period = {
      quarterId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      dateRangeLabel: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };

    // Update chain of custody observation window
    report.chainOfCustody = {
      ...report.chainOfCustody,
      observationWindowStart: startDate.toISOString(),
      observationWindowEnd: endDate.toISOString(),
    };
  }

  // Always show 10-year record depth in demo mode
  report.longitudinalContext = {
    ...report.longitudinalContext,
    totalRecordDays: 3652,
  };

  return report;
}
