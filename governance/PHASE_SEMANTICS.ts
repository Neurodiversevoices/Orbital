/**
 * ORBITAL COLD-START & PHASE SEMANTICS
 *
 * Classification: INTERNAL - Product Specification
 * Version: 1.0.0
 * Effective: 2025-01-01
 *
 * PURPOSE
 * -------
 * This document defines Orbital's longitudinal phases and the precise
 * system behavior, user experience, and language constraints at each phase.
 *
 * The goal is to prevent premature interpretation. Patterns are earned
 * through time. The system reveals nothing before the data supports it.
 *
 * CORE PRINCIPLE
 * --------------
 * Time is the input. Patience is the requirement. Premature insight
 * is worse than no insight—it creates false confidence and erodes trust.
 */

export const PHASE_SEMANTICS = {
  version: '1.0.0',
  classification: 'INTERNAL',
  effectiveDate: '2025-01-01',

  /**
   * PHASE 0: CAPTURE-ONLY
   * ---------------------
   * Duration: Signals 1-6 (approximately first week)
   *
   * The system is silent. It captures. It shows nothing.
   */
  phase0: {
    name: 'Capture-Only',
    signalRange: { min: 1, max: 6 },
    approximateDuration: '1 week',

    systemBehavior: {
      captures: true,
      analyzes: false,
      displaysPatterns: false,
      generatesArtifacts: false,
    },

    userExperience: {
      homeScreen: 'Logging interface only. No feedback beyond confirmation of capture.',
      patternsScreen: 'Locked. Message: "Patterns emerge with time. Keep recording."',
      artifacts: 'None available.',
      notifications: 'None. Ever.',
    },

    permittedLanguage: [
      'Recorded.',
      'Signal captured.',
      'Patterns emerge with time.',
      'Longitudinal value builds over weeks and months.',
    ],

    prohibitedLanguage: [
      'Good job', 'Great', 'Keep it up', 'You\'re doing well',
      'Insight', 'Pattern', 'Trend', 'Analysis', 'Result',
      'Your capacity is...', 'This means...',
    ],

    rationale: `With fewer than 7 signals, any visualization or interpretation
would be noise presented as signal. The system's credibility depends on
never showing users something meaningless. Silence builds trust.`,
  },

  /**
   * PHASE 1: BASELINE FORMATION
   * ---------------------------
   * Duration: Signals 7-29 (approximately weeks 2-4)
   *
   * The system begins to show raw history. No interpretation.
   */
  phase1: {
    name: 'Baseline Formation',
    signalRange: { min: 7, max: 29 },
    approximateDuration: '3 weeks',

    systemBehavior: {
      captures: true,
      analyzes: false,
      displaysPatterns: 'Raw history only, no derived metrics',
      generatesArtifacts: false,
    },

    userExperience: {
      homeScreen: 'Logging interface. Subtle indicator of total signal count.',
      patternsScreen: `Unlocked. Shows 7-day history as simple timeline.
No averages. No trends. No comparisons. Just the recorded states.`,
      artifacts: 'None available.',
      notifications: 'None.',
    },

    permittedLanguage: [
      'Your 7-day history.',
      '[N] signals recorded.',
      'Recording continues.',
      'Baseline forms with continued observation.',
    ],

    prohibitedLanguage: [
      'Average', 'Trend', 'Pattern', 'Insight', 'Improvement',
      'Decline', 'Stable', 'Compared to...', 'Better', 'Worse',
      'You tend to...', 'Your pattern shows...',
    ],

    rationale: `The user now has enough data to see a week of history.
Showing raw history respects their contribution without premature
interpretation. The system is a mirror, not an oracle.`,
  },

  /**
   * PHASE 2: PATTERN EMERGENCE
   * --------------------------
   * Duration: Signals 30-89 (approximately months 2-3)
   *
   * The system begins to surface simple derived metrics.
   * Language remains observational, never prescriptive.
   */
  phase2: {
    name: 'Pattern Emergence',
    signalRange: { min: 30, max: 89 },
    approximateDuration: '2 months',

    systemBehavior: {
      captures: true,
      analyzes: 'Basic statistics (distribution, mode)',
      displaysPatterns: '30-day view with state distribution',
      generatesArtifacts: false,
    },

    userExperience: {
      homeScreen: 'Logging interface.',
      patternsScreen: `30-day view. Shows:
- State distribution (% high, moderate, low)
- Timeline visualization
- Category attribution (if logged)
No trend language. No comparison language.`,
      artifacts: 'None available yet. Message: "Executive artifacts unlock at 90 signals."',
      notifications: 'None.',
    },

    permittedLanguage: [
      'Your 30-day distribution.',
      'Across 30 signals, [N]% were high capacity.',
      'State distribution for this period.',
      'Category breakdown.',
    ],

    prohibitedLanguage: [
      'Trend', 'Improving', 'Declining', 'Stable',
      'Above/below baseline', 'Compared to last month',
      'You should...', 'Try to...', 'Consider...',
      'This suggests...', 'This indicates...',
    ],

    rationale: `30 signals provide enough data for distribution analysis
but not enough for trend detection. The system shows what is without
claiming to know what it means or where it's going.`,
  },

  /**
   * PHASE 3: LONGITUDINAL STABILITY
   * -------------------------------
   * Duration: Signals 90+ (month 4 onwards)
   *
   * The system may now surface patterns, baselines, and variance.
   * The first artifact becomes available.
   * Language remains observational and non-prescriptive.
   */
  phase3: {
    name: 'Longitudinal Stability',
    signalRange: { min: 90, max: Infinity },
    approximateDuration: 'Ongoing',

    systemBehavior: {
      captures: true,
      analyzes: 'Full pattern analysis (trends, variance, correlations)',
      displaysPatterns: '90-day view with trends and driver analysis',
      generatesArtifacts: true,
    },

    userExperience: {
      homeScreen: 'Logging interface.',
      patternsScreen: `Full pattern view. Shows:
- 90-day trend direction (observational language only)
- Baseline estimate
- Variance from baseline
- Category driver analysis
- Day-of-week patterns`,
      artifacts: 'Quarterly Signal Summary unlocked.',
      notifications: 'None.',
    },

    permittedLanguage: [
      'Your 90-day pattern.',
      'Baseline estimate: [N]%.',
      'Current variance: [+/-N]% from baseline.',
      'Trend direction: [stable/shifting higher/shifting lower].',
      'Sensory load shows [N]% correlation with low-capacity states.',
      'Tuesdays show lower average capacity than other days.',
    ],

    prohibitedLanguage: [
      'You are improving', 'You are declining', 'You should...',
      'This means...', 'This indicates...', 'Consider...',
      'Good', 'Bad', 'Healthy', 'Unhealthy', 'Normal', 'Abnormal',
      'Diagnosis', 'Treatment', 'Intervention', 'Recommendation',
    ],

    rationale: `90 signals across 90+ days provides a genuine longitudinal
foundation. Patterns observed here are statistically meaningful.
But the system still does not prescribe. It observes and reports.
Interpretation remains the user's domain.`,
  },

  /**
   * PHASE 4: ANNUAL HORIZON
   * -----------------------
   * Duration: 365+ signals over 365+ days
   *
   * Rare. Valuable. The system surfaces year-over-year patterns.
   * This is Orbital's terminal value state for individuals.
   */
  phase4: {
    name: 'Annual Horizon',
    signalRange: { min: 365, max: Infinity },
    approximateDuration: '1+ years',

    systemBehavior: {
      captures: true,
      analyzes: 'Full longitudinal analysis including seasonal patterns',
      displaysPatterns: 'Annual view with seasonal analysis',
      generatesArtifacts: true,
    },

    userExperience: {
      homeScreen: 'Logging interface.',
      patternsScreen: `Full annual view. Shows:
- Year-over-year trend
- Seasonal patterns
- Long-term baseline stability
- Significant shift periods`,
      artifacts: 'Annual Capacity Report unlocked.',
      notifications: 'None.',
    },

    permittedLanguage: [
      'Your annual capacity pattern.',
      'Year-over-year, your baseline has [remained stable/shifted].',
      '[Season/period] shows characteristic patterns.',
      'Significant shift period observed: [date range].',
    ],

    prohibitedLanguage: [
      // Same as Phase 3—no prescriptive or causal language ever.
    ],

    rationale: `One year of data is genuinely rare. Users who reach this
phase have contributed something valuable—to themselves and potentially
to aggregate understanding. The system honors this with the richest
available pattern view, but never crosses into prescription.`,
  },

  /**
   * PHASE TRANSITION RULES
   * ----------------------
   * How the system handles phase transitions.
   */
  transitions: {
    automatic: true,
    reversible: false,
    celebration: 'PROHIBITED',

    onTransition: {
      uiChange: 'Subtle. New capabilities simply become available.',
      notification: 'NONE',
      messaging: 'No congratulatory language. No "unlocked" fanfare.',
    },

    rationale: `Phase transitions are not achievements. They are natural
consequences of time passing. Celebrating them creates gamification
pressure, which violates the calm ethos.`,
  },

  /**
   * COLD-START EXPERIENCE
   * ---------------------
   * The first-time user experience.
   */
  coldStart: {
    onboarding: {
      screens: [
        {
          content: 'Orbital records your capacity over time.',
          action: 'Continue',
        },
        {
          content: 'One signal. Any moment. No pressure.',
          action: 'Continue',
        },
        {
          content: 'Patterns emerge with time. There is no rush.',
          action: 'Begin',
        },
      ],
      duration: '<30 seconds',
      skipable: false,
    },

    firstLogExperience: {
      preLog: 'Simple interface. Three states. One tap.',
      postLog: '"Recorded." Nothing more.',
      subsequentLogs: 'Same experience. No escalation. No elaboration.',
    },

    prohibitedOnboarding: [
      'Welcome!', 'Excited to have you', 'Let\'s get started',
      'Set your goals', 'What do you want to track',
      'Enable notifications', 'Daily reminder',
      'Connect with friends', 'Share your progress',
    ],
  },
} as const;

/**
 * PHASE UTILITY FUNCTIONS
 */
export function getPhase(signalCount: number): keyof typeof PHASE_SEMANTICS {
  if (signalCount >= 365) return 'phase4';
  if (signalCount >= 90) return 'phase3';
  if (signalCount >= 30) return 'phase2';
  if (signalCount >= 7) return 'phase1';
  return 'phase0';
}

export function getPhaseConfig(signalCount: number) {
  const phase = getPhase(signalCount);
  return PHASE_SEMANTICS[phase];
}
