/**
 * ORBITAL INTERNAL CAPACITY DOCTRINE
 *
 * Classification: INTERNAL - Governance Anchor
 * Version: 1.0.0
 * Effective: 2025-01-01
 * Review Cycle: Annual
 *
 * PURPOSE
 * -------
 * This document defines "Capacity" as used throughout Orbital.
 * It serves as the canonical reference for legal review, engineering
 * decisions, institutional conversations, and acquisition diligence.
 *
 * This doctrine prevents scope drift into clinical, diagnostic,
 * or mental health domains.
 */

export const CAPACITY_DOCTRINE = {
  version: '1.0.0',
  classification: 'INTERNAL',
  effectiveDate: '2025-01-01',

  /**
   * DEFINITION
   * ----------
   * Capacity is the self-reported availability of personal resources
   * to meet anticipated demands at a given moment.
   *
   * Capacity is:
   * - Subjective (reported by the individual)
   * - Momentary (captured at a point in time)
   * - Relative (meaningful only in longitudinal context)
   * - Non-specific (not tied to any domain, condition, or activity)
   */
  definition: {
    formal: `Capacity is the self-reported availability of personal resources
to meet anticipated demands at a given moment in time.`,

    characteristics: [
      'Subjective: Reported by the individual, not inferred or measured',
      'Momentary: Captured at discrete points in time',
      'Relative: Meaningful only when compared to the individual\'s own history',
      'Non-specific: Not tied to any domain, condition, task, or activity',
      'Non-causal: Does not explain why capacity is at a given level',
    ],
  },

  /**
   * WHAT CAPACITY IS NOT
   * --------------------
   * These exclusions are non-negotiable and must be enforced
   * at all system levels.
   */
  exclusions: {
    notMood: 'Capacity is not a mood state. Moods are emotional experiences. Capacity is resource availability.',
    notEmotion: 'Capacity is not an emotion. Emotions are affective responses. Capacity is a functional signal.',
    notSymptom: 'Capacity is not a symptom. Symptoms suggest underlying conditions. Capacity suggests nothing.',
    notDiagnosis: 'Capacity is not diagnostic. It does not indicate, suggest, or screen for any condition.',
    notEnergy: 'Capacity is not "energy" in the colloquial wellness sense. It is not vitality or enthusiasm.',
    notProductivity: 'Capacity is not productivity. It does not measure output, performance, or achievement.',
    notWellbeing: 'Capacity is not wellbeing. It makes no claim about quality of life or flourishing.',
    notStress: 'Capacity is not stress. Stress is a response to demands. Capacity is resource availability.',
    notFatigue: 'Capacity is not fatigue. Fatigue is a sensation. Capacity is a self-assessment.',
  },

  /**
   * OPERATIONAL FRAMING
   * -------------------
   * How capacity should be understood operationally.
   */
  operationalFraming: {
    analogy: `Capacity is analogous to a fuel gauge. The gauge shows current level
relative to full. It does not explain why fuel was consumed. It does not
predict where you will drive. It does not diagnose engine problems.
It simply shows level, and over time, reveals patterns of consumption
and replenishment.`,

    measurementModel: 'Ordinal self-report on a 3-point scale: High, Moderate, Low',

    valueProposition: `The value of capacity data emerges from longitudinal accumulation.
A single reading has minimal meaning. Patterns across weeks, months,
and years reveal individual baselines, variance, and shifts that may
be relevant to decisions the individual chooses to make.`,
  },

  /**
   * LANGUAGE CONSTRAINTS
   * --------------------
   * Terminology that MUST NOT appear in Orbital systems, copy, or communications
   * when referring to the capacity signal or its derivatives.
   */
  prohibitedLanguage: [
    // Clinical terms
    'diagnosis', 'diagnose', 'diagnostic', 'clinical', 'treatment', 'therapy',
    'symptom', 'condition', 'disorder', 'syndrome', 'disease', 'illness',
    'patient', 'screening', 'assessment' /* when implying clinical */,

    // Mental health terms
    'mental health', 'psychological', 'psychiatric', 'depression', 'anxiety',
    'bipolar', 'ADHD', 'autism', 'trauma', 'PTSD', 'OCD', 'mood disorder',
    'emotional regulation', 'coping', 'resilience' /* when clinical */,

    // Wellness/productivity terms
    'wellness', 'wellbeing', 'self-care', 'mindfulness', 'meditation',
    'productivity', 'performance', 'optimization', 'biohacking', 'peak',
    'burnout' /* as diagnosis */, 'stress management',

    // Causal/prescriptive terms
    'because', 'due to', 'caused by', 'indicates', 'suggests', 'means',
    'you should', 'try to', 'improve', 'optimize', 'fix', 'heal',
  ],

  /**
   * PERMITTED LANGUAGE
   * ------------------
   * Terminology that IS permitted and encouraged.
   */
  permittedLanguage: [
    'capacity', 'signal', 'pattern', 'trend', 'baseline', 'variance',
    'observation', 'record', 'log', 'entry', 'history', 'longitudinal',
    'self-reported', 'over time', 'across [time period]',
    'high capacity', 'moderate capacity', 'low capacity',
    'resourced', 'stretched', 'depleted' /* as state labels only */,
    'shift', 'change', 'stability', 'consistency',
  ],

  /**
   * GOVERNANCE APPLICATION
   * ----------------------
   * How this doctrine applies to different functions.
   */
  governance: {
    engineering: `All UI copy, system messages, and generated text must pass
through language validation against prohibited terms. No exceptions.`,

    product: `Feature proposals that introduce causal, diagnostic, or prescriptive
elements must be rejected at design review. No exceptions.`,

    legal: `This doctrine serves as the primary reference for regulatory
positioning. Orbital does not meet the definition of a medical device,
clinical decision support tool, or mental health application under
any current regulatory framework because capacity, as defined here,
is non-clinical by construction.`,

    sales: `Institutional conversations must anchor on this definition.
Orbital provides longitudinal capacity data. It does not provide
diagnoses, risk scores, or clinical recommendations. This is a feature,
not a limitation.`,

    acquisition: `This doctrine demonstrates intentional scope constraint.
Orbital's value is in what it captures (longitudinal signal) and what
it deliberately does not do (diagnose, prescribe, label). This reduces
regulatory risk and positions the asset for multiple market applications.`,
  },

  /**
   * REVIEW AND AMENDMENT
   * --------------------
   * This doctrine may only be amended by:
   * 1. Founder approval
   * 2. Legal review
   * 3. Documentation in version history
   *
   * Amendments that expand scope into clinical, diagnostic, or
   * mental health domains require board-level approval and
   * regulatory impact assessment.
   */
  amendment: {
    authority: ['Founder', 'Legal'],
    scopeExpansionRequires: ['Board approval', 'Regulatory impact assessment'],
    versionHistory: [
      { version: '1.0.0', date: '2025-01-01', note: 'Initial doctrine established' },
    ],
  },
} as const;

/**
 * TYPE EXPORTS
 * ------------
 * For engineering use in type-safe language validation.
 */
export type ProhibitedTerm = typeof CAPACITY_DOCTRINE.prohibitedLanguage[number];
export type PermittedTerm = typeof CAPACITY_DOCTRINE.permittedLanguage[number];
