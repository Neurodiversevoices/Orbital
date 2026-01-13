/**
 * Sentinel Demo Data — Deterministic Synthetic Data
 *
 * GOVERNANCE: This module provides DEMO-ONLY data for Sentinel views.
 * All data is synthetic and deterministic — no real user data.
 *
 * Phase 2 scaffolding: PNG is golden master, but age cohort selector is active.
 *
 * DEMO CONSTRAINTS:
 * - 3,000 synthetic records
 * - School cohorts: 5-7, 8-10, 11-13, 14-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
 * - 21 days of volatility data (-14 to NOW style)
 * - Deterministic seeded RNG for stable refreshes
 * - NO export, NO tuning, NO activation
 */

import {
  SentinelData,
  SentinelScope,
  VolatilityDataPoint,
  AssessmentItem,
  DEFAULT_SENTINEL_CONFIG,
} from './types';
import { AgeCohort } from '../legal/ageVerification';

// =============================================================================
// SCHOOL-SPECIFIC AGE COHORTS (K-12 + Staff, DEMO ONLY)
// =============================================================================

/**
 * School age cohort type — DEMO ONLY
 * Distinct from AgeCohort (legal/user verification, 13+).
 * Starts at 5 to cover K-12 students.
 */
export type SchoolAgeCohort =
  | '5-7'
  | '8-10'
  | '11-13'
  | '14-17'
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55+';

/**
 * School age cohort list (LOCKED for School District Sentinel)
 */
export const SCHOOL_AGE_COHORTS: SchoolAgeCohort[] = [
  '5-7',
  '8-10',
  '11-13',
  '14-17',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+',
];

/**
 * Human-readable labels for School age cohorts
 */
export const SCHOOL_AGE_COHORT_LABELS: Record<SchoolAgeCohort, string> = {
  '5-7': '5–7 (K-2)',
  '8-10': '8–10 (3-5)',
  '11-13': '11–13 (6-8)',
  '14-17': '14–17 (9-12)',
  '18-24': '18–24 (Staff/Transition)',
  '25-34': '25–34',
  '35-44': '35–44',
  '45-54': '45–54',
  '55+': '55+',
};

/**
 * School cohort-specific seeds for deterministic but varied data
 */
const SCHOOL_COHORT_SEEDS: Record<SchoolAgeCohort, number> = {
  '5-7': 5070,
  '8-10': 8100,
  '11-13': 11130,
  '14-17': 14170,
  '18-24': 18240,
  '25-34': 25340,
  '35-44': 35440,
  '45-54': 45540,
  '55+': 55000,
};

/**
 * School cohort-specific volatility characteristics
 * (Different cohorts show different patterns for demo variety)
 */
const SCHOOL_COHORT_VOLATILITY_PROFILES: Record<SchoolAgeCohort, { baseOffset: number; variance: number; triggerDay: number }> = {
  '5-7': { baseOffset: 20, variance: 30, triggerDay: 4 },   // Youngest: highest volatility
  '8-10': { baseOffset: 18, variance: 28, triggerDay: 4 },
  '11-13': { baseOffset: 15, variance: 25, triggerDay: 5 },
  '14-17': { baseOffset: 12, variance: 22, triggerDay: 5 }, // High schoolers
  '18-24': { baseOffset: 10, variance: 20, triggerDay: 4 }, // Staff/transition
  '25-34': { baseOffset: 5, variance: 18, triggerDay: 5 },
  '35-44': { baseOffset: 0, variance: 15, triggerDay: 6 },
  '45-54': { baseOffset: -5, variance: 12, triggerDay: 7 },
  '55+': { baseOffset: -8, variance: 9, triggerDay: 8 },    // Senior staff
};

/**
 * School cohort sample sizes (distributes 3,000 across K-12 + staff)
 */
const SCHOOL_COHORT_SAMPLE_SIZES: Record<SchoolAgeCohort, number> = {
  '5-7': 420,    // ~14% - K-2 students
  '8-10': 450,   // ~15% - 3-5 students
  '11-13': 480,  // ~16% - 6-8 students
  '14-17': 510,  // ~17% - 9-12 students
  '18-24': 180,  // ~6% - young staff, paras
  '25-34': 300,  // ~10% - staff
  '35-44': 270,  // ~9% - staff
  '45-54': 210,  // ~7% - staff
  '55+': 180,    // ~6% - senior staff
};

// =============================================================================
// SCHOOL DISTRICT SENTINEL — AGE COHORT SUPPORT
// =============================================================================

/**
 * Age cohort buckets (locked, matches lib/legal/ageVerification.ts)
 */
export const SENTINEL_AGE_COHORTS: AgeCohort[] = [
  '13-17',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
];

/**
 * Human-readable labels for age cohorts
 */
export const AGE_COHORT_LABELS: Record<AgeCohort, string> = {
  '13-17': '13–17 (Students)',
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45-54': '45–54',
  '55-64': '55–64',
  '65+': '65+',
};

/**
 * Cohort-specific seeds for deterministic but varied data
 */
const COHORT_SEEDS: Record<AgeCohort, number> = {
  '13-17': 13170,
  '18-24': 18240,
  '25-34': 25340,
  '35-44': 35440,
  '45-54': 45540,
  '55-64': 55640,
  '65+': 65000,
};

/**
 * Cohort-specific volatility characteristics
 * (Different cohorts show different patterns for demo variety)
 */
const COHORT_VOLATILITY_PROFILES: Record<AgeCohort, { baseOffset: number; variance: number; triggerDay: number }> = {
  '13-17': { baseOffset: 15, variance: 25, triggerDay: 5 },  // Students: higher volatility
  '18-24': { baseOffset: 10, variance: 20, triggerDay: 4 },
  '25-34': { baseOffset: 5, variance: 18, triggerDay: 5 },   // Default (matches PNG)
  '35-44': { baseOffset: 0, variance: 15, triggerDay: 6 },
  '45-54': { baseOffset: -5, variance: 12, triggerDay: 7 },
  '55-64': { baseOffset: -8, variance: 10, triggerDay: 8 },
  '65+': { baseOffset: -10, variance: 8, triggerDay: 9 },
};

/**
 * Deterministic pseudo-random generator
 * Uses a seed for reproducible "random" values
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate deterministic volatility trend data
 */
function generateVolatilityTrend(
  seed: number,
  config = DEFAULT_SENTINEL_CONFIG
): VolatilityDataPoint[] {
  const random = seededRandom(seed);
  const points: VolatilityDataPoint[] = [];

  // Generate data that matches the PNG pattern:
  // - Low initial values
  // - Gradual increase
  // - Sustained high values near "now"
  for (let i = -config.historyDays; i <= 0; i++) {
    // Create the characteristic "hockey stick" pattern
    let baseValue: number;
    if (i < -10) {
      baseValue = 20 + random() * 15; // Low baseline
    } else if (i < -5) {
      baseValue = 30 + random() * 20; // Rising
    } else {
      baseValue = 60 + random() * 25; // Sustained high
    }

    const value = Math.min(100, Math.max(0, baseValue));

    points.push({
      dayOffset: i,
      value,
      exceedsBaseline: value > config.baselineThreshold,
    });
  }

  return points;
}

/**
 * Generate assessments for Organization scope (matches PNG)
 */
function getOrganizationAssessments(): AssessmentItem[] {
  return [
    {
      text: 'Sustained deviation from historical baseline',
      severity: 'warning',
    },
    {
      text: 'Increased probability of downstream disruption',
      severity: 'warning',
    },
    {
      text: 'Signal is aggregate and non-identifying',
      severity: 'info',
    },
  ];
}

/**
 * Generate assessments for Global scope
 */
function getGlobalAssessments(): AssessmentItem[] {
  return [
    {
      text: 'Synthetic cohort demonstrates typical volatility patterns',
      severity: 'info',
    },
    {
      text: 'Based on aggregate modeling — not individual data',
      severity: 'info',
    },
    {
      text: 'Signal is aggregate and non-identifying',
      severity: 'info',
    },
  ];
}

/**
 * Get demo Sentinel data for a given scope
 *
 * @param scope - The sentinel scope
 * @returns Deterministic demo data matching the PNG
 */
export function getDemoSentinelData(scope: SentinelScope): SentinelData {
  // Use scope-specific seeds for deterministic but varied data
  const seeds: Record<SentinelScope, number> = {
    personal: 12345,
    organization: 54321,
    global: 98765,
  };

  const seed = seeds[scope];
  const config = DEFAULT_SENTINEL_CONFIG;

  // Scope-specific cohort labels
  const cohortLabels: Record<SentinelScope, string> = {
    personal: 'Personal Capacity',
    organization: 'Grade 8 - District A',
    global: 'Global (Synthetic)',
  };

  // Generate trend data
  const volatilityTrend = generateVolatilityTrend(seed, config);

  // Calculate consecutive days above baseline (matches PNG: 5 days)
  let consecutiveDays = 0;
  for (let i = volatilityTrend.length - 1; i >= 0; i--) {
    if (volatilityTrend[i].exceedsBaseline) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  // For demo, always show "5 consecutive days" to match PNG
  consecutiveDays = 5;

  return {
    scope,
    cohortLabel: cohortLabels[scope],
    systemState: 'sustained_volatility',
    consecutiveDaysAboveBaseline: consecutiveDays,
    volatilityTrend,
    baselineValue: config.baselineThreshold,
    currentTrigger: {
      triggeredAt: new Date(),
      daysAboveBaseline: consecutiveDays,
      peakValue: Math.max(...volatilityTrend.map((p) => p.value)),
    },
    assessments:
      scope === 'global'
        ? getGlobalAssessments()
        : getOrganizationAssessments(),
    isDemo: true,
    sampleSize: scope === 'global' ? 3000 : undefined,
    ageCohort: scope === 'global' ? '25-34' : undefined,
  };
}

/**
 * Demo data labels and copy
 */
export const SENTINEL_DEMO_LABELS = {
  organization: {
    cohort: 'Cohort: Grade 8 - District A',
    banner: 'DEMO / SAMPLE',
  },
  global: {
    cohort: 'Cohort: Global (Synthetic)',
    banner: 'DEMO / SAMPLE',
    sampleSize: 'Based on 3,000 synthetic inputs',
    ageCohort: 'Age Cohort: 25-34',
  },
} as const;

// =============================================================================
// SCHOOL DISTRICT SENTINEL — AGE COHORT DATA GENERATION
// =============================================================================

/**
 * Generate volatility trend for a specific School age cohort
 * Uses cohort-specific seed and volatility profile for varied but deterministic data
 */
function generateSchoolCohortVolatilityTrend(
  ageCohort: SchoolAgeCohort,
  historyDays: number = 21
): VolatilityDataPoint[] {
  const seed = SCHOOL_COHORT_SEEDS[ageCohort];
  const profile = SCHOOL_COHORT_VOLATILITY_PROFILES[ageCohort];
  const random = seededRandom(seed);
  const points: VolatilityDataPoint[] = [];
  const baselineThreshold = 50;

  // Generate -14 to NOW (matching PNG style)
  for (let i = -14; i <= 0; i++) {
    let baseValue: number;

    // Create the characteristic pattern with cohort-specific characteristics
    if (i < -10) {
      // Early period: low baseline
      baseValue = 20 + profile.baseOffset + random() * profile.variance * 0.5;
    } else if (i < -profile.triggerDay) {
      // Rising period
      const riseProgress = (i + 10) / (10 - profile.triggerDay);
      baseValue = 25 + profile.baseOffset + riseProgress * 30 + random() * profile.variance;
    } else {
      // Sustained high period (trigger zone)
      baseValue = 55 + profile.baseOffset + random() * profile.variance;
    }

    const value = Math.min(100, Math.max(0, baseValue));

    points.push({
      dayOffset: i,
      value,
      exceedsBaseline: value > baselineThreshold,
    });
  }

  return points;
}

/**
 * Get demo Sentinel data for School District with age cohort breakdown
 *
 * @param ageCohort - The selected School age cohort
 * @returns Deterministic demo data for the cohort
 */
export function getSchoolDistrictSentinelData(ageCohort: SchoolAgeCohort): SentinelData {
  const profile = SCHOOL_COHORT_VOLATILITY_PROFILES[ageCohort];
  const volatilityTrend = generateSchoolCohortVolatilityTrend(ageCohort);

  // Calculate consecutive days above baseline
  let consecutiveDays = 0;
  for (let i = volatilityTrend.length - 1; i >= 0; i--) {
    if (volatilityTrend[i].exceedsBaseline) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  // Determine system state based on consecutive days
  const systemState = consecutiveDays >= 5
    ? 'sustained_volatility'
    : consecutiveDays >= 3
    ? 'elevated'
    : 'baseline';

  // Determine cohort label based on age range
  const isStudent = ['5-7', '8-10', '11-13', '14-17'].includes(ageCohort);
  const cohortLabel = isStudent
    ? `Students · Age ${ageCohort}`
    : `Staff · Age ${ageCohort}`;

  return {
    scope: 'organization',
    cohortLabel,
    systemState,
    consecutiveDaysAboveBaseline: consecutiveDays,
    volatilityTrend,
    baselineValue: 50,
    currentTrigger: consecutiveDays >= 5 ? {
      triggeredAt: new Date(),
      daysAboveBaseline: consecutiveDays,
      peakValue: Math.max(...volatilityTrend.map((p) => p.value)),
    } : null,
    assessments: getOrganizationAssessments(),
    isDemo: true,
    sampleSize: 3000,
    ageCohort,
  };
}

/**
 * Get sample size per School cohort (for display purposes)
 * Distributes 3,000 synthetic records across K-12 + staff
 */
export function getSchoolCohortSampleSize(ageCohort: SchoolAgeCohort): number {
  return SCHOOL_COHORT_SAMPLE_SIZES[ageCohort];
}

/**
 * School District Sentinel demo constants
 * CANONICAL: K–12 Education Sentinel Demo v1
 */
export const SCHOOL_DISTRICT_SENTINEL = {
  title: 'K–12 Education Sentinel — DEMO',
  subtitle: 'Simulated aggregate data · Education baseline · Non-operational demo',
  districtLabel: 'District A',
  demoBanner: 'DEMO · K–12 EDUCATION BASELINE',
  totalSampleSize: 3000,
  vertical: 'K-12 Education',
} as const;

// =============================================================================
// UNIVERSITY SENTINEL — DERIVED DEMO (Year of Birth → Cohort)
// =============================================================================

/**
 * University age cohort type — DEMO ONLY
 * Derived from Year of Birth, NOT manual selection.
 * Cohort bands: 18-22 (Undergrad), 23-29 (Grad), 30-44 (Faculty/Staff),
 * 45-64 (Senior Faculty/Admin), 65+ (Emeritus)
 */
export type UniversityAgeCohort =
  | '18-22'
  | '23-29'
  | '30-44'
  | '45-64'
  | '65+';

/**
 * University age cohort list (LOCKED for University Sentinel Demo)
 */
export const UNIVERSITY_AGE_COHORTS: UniversityAgeCohort[] = [
  '18-22',
  '23-29',
  '30-44',
  '45-64',
  '65+',
];

/**
 * Human-readable labels for University age cohorts
 */
export const UNIVERSITY_AGE_COHORT_LABELS: Record<UniversityAgeCohort, string> = {
  '18-22': '18–22 (Undergraduate)',
  '23-29': '23–29 (Graduate / Early Career)',
  '30-44': '30–44 (Faculty / Staff)',
  '45-64': '45–64 (Senior Faculty / Admin)',
  '65+': '65+ (Emeritus)',
};

/**
 * University cohort-specific seeds for deterministic but varied data
 */
const UNIVERSITY_COHORT_SEEDS: Record<UniversityAgeCohort, number> = {
  '18-22': 18220,
  '23-29': 23290,
  '30-44': 30440,
  '45-64': 45640,
  '65+': 65100,
};

/**
 * University cohort-specific volatility characteristics
 * Reflects academic pressure patterns (exam periods, term deadlines)
 */
const UNIVERSITY_COHORT_VOLATILITY_PROFILES: Record<UniversityAgeCohort, { baseOffset: number; variance: number; triggerDay: number }> = {
  '18-22': { baseOffset: 18, variance: 28, triggerDay: 4 },  // Undergrads: highest volatility
  '23-29': { baseOffset: 12, variance: 22, triggerDay: 5 },  // Grad students: high pressure
  '30-44': { baseOffset: 5, variance: 16, triggerDay: 6 },   // Faculty/Staff
  '45-64': { baseOffset: 0, variance: 12, triggerDay: 7 },   // Senior Faculty/Admin
  '65+': { baseOffset: -5, variance: 8, triggerDay: 8 },     // Emeritus
};

/**
 * University cohort sample sizes (distributes 3,000 across university population)
 */
const UNIVERSITY_COHORT_SAMPLE_SIZES: Record<UniversityAgeCohort, number> = {
  '18-22': 1200,   // ~40% - Undergraduate students
  '23-29': 750,    // ~25% - Graduate students / Early career
  '30-44': 600,    // ~20% - Faculty / Staff
  '45-64': 350,    // ~12% - Senior Faculty / Admin
  '65+': 100,      // ~3%  - Emeritus
};

/**
 * Generate volatility trend for a specific University age cohort
 * Uses cohort-specific seed and volatility profile for varied but deterministic data
 */
function generateUniversityCohortVolatilityTrend(
  ageCohort: UniversityAgeCohort
): VolatilityDataPoint[] {
  const seed = UNIVERSITY_COHORT_SEEDS[ageCohort];
  const profile = UNIVERSITY_COHORT_VOLATILITY_PROFILES[ageCohort];
  const random = seededRandom(seed);
  const points: VolatilityDataPoint[] = [];
  const baselineThreshold = 50;

  // Generate -14 to NOW (matching PNG style)
  for (let i = -14; i <= 0; i++) {
    let baseValue: number;

    // Create the characteristic pattern with cohort-specific characteristics
    if (i < -10) {
      // Early period: low baseline
      baseValue = 20 + profile.baseOffset + random() * profile.variance * 0.5;
    } else if (i < -profile.triggerDay) {
      // Rising period (exam/term pressure building)
      const riseProgress = (i + 10) / (10 - profile.triggerDay);
      baseValue = 25 + profile.baseOffset + riseProgress * 30 + random() * profile.variance;
    } else {
      // Sustained high period (trigger zone)
      baseValue = 55 + profile.baseOffset + random() * profile.variance;
    }

    const value = Math.min(100, Math.max(0, baseValue));

    points.push({
      dayOffset: i,
      value,
      exceedsBaseline: value > baselineThreshold,
    });
  }

  return points;
}

/**
 * Get demo Sentinel data for University with age cohort breakdown
 *
 * @param ageCohort - The selected University age cohort
 * @returns Deterministic demo data for the cohort
 */
export function getUniversitySentinelData(ageCohort: UniversityAgeCohort): SentinelData {
  const volatilityTrend = generateUniversityCohortVolatilityTrend(ageCohort);

  // Calculate consecutive days above baseline
  let consecutiveDays = 0;
  for (let i = volatilityTrend.length - 1; i >= 0; i--) {
    if (volatilityTrend[i].exceedsBaseline) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  // Determine system state based on consecutive days
  const systemState = consecutiveDays >= 5
    ? 'sustained_volatility'
    : consecutiveDays >= 3
    ? 'elevated'
    : 'baseline';

  // Determine cohort label based on age range
  const isStudent = ['18-22', '23-29'].includes(ageCohort);
  const cohortLabel = isStudent
    ? `Students · Age ${ageCohort}`
    : `Faculty/Staff · Age ${ageCohort}`;

  return {
    scope: 'organization',
    cohortLabel,
    systemState,
    consecutiveDaysAboveBaseline: consecutiveDays,
    volatilityTrend,
    baselineValue: 50,
    currentTrigger: consecutiveDays >= 5 ? {
      triggeredAt: new Date(),
      daysAboveBaseline: consecutiveDays,
      peakValue: Math.max(...volatilityTrend.map((p) => p.value)),
    } : null,
    assessments: getUniversityAssessments(),
    isDemo: true,
    sampleSize: 3000,
    ageCohort,
  };
}

/**
 * Get sample size per University cohort (for display purposes)
 * Distributes 3,000 synthetic records across university population
 */
export function getUniversityCohortSampleSize(ageCohort: UniversityAgeCohort): number {
  return UNIVERSITY_COHORT_SAMPLE_SIZES[ageCohort];
}

/**
 * Generate assessments for University scope
 * Uses academic/system risk framing — NOT wellness or mental health language
 */
function getUniversityAssessments(): AssessmentItem[] {
  return [
    {
      text: 'Sustained capacity volatility during exam or term pressure',
      severity: 'warning',
    },
    {
      text: 'Increased probability of academic continuity disruption',
      severity: 'warning',
    },
    {
      text: 'Aggregate, non-identifying cohort signal',
      severity: 'info',
    },
  ];
}

/**
 * University Sentinel demo constants
 * CANONICAL: University Sentinel Demo v1
 */
export const UNIVERSITY_SENTINEL = {
  title: 'University Sentinel (DEMO)',
  subtitle: 'Aggregate, non-identifying cohort signal · Academic continuity risk',
  institutionLabel: 'University A',
  demoBanner: 'DEMO · UNIVERSITY SENTINEL',
  totalSampleSize: 3000,
  vertical: 'Higher Education',
  footerText: 'Based on synthetic, aggregate inputs. No individual student or staff data is tracked or identified.',
} as const;
