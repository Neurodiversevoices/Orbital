/**
 * ORBITAL ABSENCE-AS-SIGNAL FORMALIZATION
 *
 * Classification: INTERNAL - Data Handling Specification
 * Version: 1.0.0
 * Effective: 2025-01-01
 *
 * PURPOSE
 * -------
 * This document defines how Orbital treats the absence of capacity signals.
 * Absence is meaningful longitudinal data but must never create behavioral
 * pressure, guilt, or engagement manipulation.
 *
 * CORE PRINCIPLE
 * --------------
 * Absence is information. Absence is not failure.
 * The system observes. The system does not judge.
 */

export const ABSENCE_AS_SIGNAL = {
  version: '1.0.0',
  classification: 'INTERNAL',
  effectiveDate: '2025-01-01',

  /**
   * FUNDAMENTAL RULES
   * -----------------
   * Non-negotiable system behaviors regarding absent signals.
   */
  fundamentalRules: {
    rule1: {
      name: 'No Nudging',
      specification: `The system MUST NOT send notifications, reminders, or prompts
encouraging the user to log. Ever. Under any circumstances.`,
      enforcement: 'SYSTEM_LEVEL',
      exceptions: 'NONE',
    },

    rule2: {
      name: 'No Guilt Language',
      specification: `The system MUST NOT use language that frames absence as:
- Missing data ("You missed logging yesterday")
- Broken streaks ("Your streak ended")
- Incomplete records ("Your week is incomplete")
- Declining engagement ("You haven't logged in a while")`,
      enforcement: 'LANGUAGE_VALIDATION',
      exceptions: 'NONE',
    },

    rule3: {
      name: 'No Daily Surfacing',
      specification: `Absence information MUST NOT appear in daily user experience.
The home screen, logging interface, and immediate feedback loops
must never reference what was not logged.`,
      enforcement: 'UI_REVIEW',
      exceptions: 'NONE',
    },

    rule4: {
      name: 'Aggregate Only',
      specification: `Absence patterns MAY appear only in:
- 90+ day longitudinal views
- Annual summary artifacts
- Institutional aggregate reports (never individual)
When surfaced, absence is presented as "periods without signals"
not "missed days" or "gaps."`,
      enforcement: 'ARTIFACT_REVIEW',
      exceptions: 'NONE',
    },

    rule5: {
      name: 'No Behavioral Inference',
      specification: `The system MUST NOT infer meaning from absence.
Absence does not mean: the user was too depleted to log,
the user forgot, the user lost interest, or anything else.
Absence means: no signal was recorded.`,
      enforcement: 'ANALYTICS_REVIEW',
      exceptions: 'NONE',
    },
  },

  /**
   * DATA HANDLING LOGIC
   * -------------------
   * Technical specification for absence data treatment.
   */
  dataHandling: {
    storage: {
      specification: `Absence is not stored as explicit records.
Days without signals are simply days without records.
The system does not create "null" entries or "absent" flags.`,
      rationale: 'Storing absence explicitly creates a record of non-action, which is coercive by design.',
    },

    derivation: {
      specification: `Absence patterns are derived at query time, not stored.
When generating longitudinal artifacts (90d+), the system calculates
periods without signals by examining gaps between recorded timestamps.`,
      rationale: 'Derived absence cannot be used for real-time behavioral pressure.',
    },

    aggregation: {
      specification: `For institutional reporting, absence is aggregated as:
- "Signal density" (signals per time period)
- "Recording patterns" (time-of-day, day-of-week distributions)
Never: "compliance rate," "engagement rate," "active users," "churn."`,
      rationale: 'Aggregate framing prevents individual judgment.',
    },

    retention: {
      specification: `Because absence is not stored, there is no absence data to retain.
Signal density metrics derived for artifacts are computed fresh
and not persisted beyond artifact generation.`,
      rationale: 'No persistence means no surveillance.',
    },
  },

  /**
   * LANGUAGE CONSTRAINTS
   * --------------------
   * Prohibited and permitted terminology for absence contexts.
   */
  languageConstraints: {
    prohibited: [
      // Failure framing
      'missed', 'skipped', 'forgot', 'failed to', 'didn\'t',
      'incomplete', 'gap', 'break', 'lapse', 'absence' /* as negative */,

      // Streak/engagement framing
      'streak', 'consecutive', 'daily', 'chain', 'habit',
      'engagement', 'active', 'inactive', 'dormant', 'churned',
      'retention', 'comeback', 'return',

      // Guilt framing
      'last logged', 'days since', 'it\'s been', 'we noticed',
      'welcome back', 'you\'re back',

      // Prescriptive framing
      'try to log', 'remember to', 'don\'t forget', 'keep logging',
    ],

    permitted: [
      // Neutral observation
      'periods without signals', 'signal density', 'recording pattern',
      'logged [N] times in [period]', 'signals from [date] to [date]',

      // Artifact framing (90d+ only)
      'during this period, [N] signals were recorded',
      'signal frequency varied across the period',
    ],
  },

  /**
   * UX IMPLEMENTATION
   * -----------------
   * Specific UI/UX rules for handling absence.
   */
  uxImplementation: {
    homeScreen: {
      rule: 'Never reference absence. Show only the logging interface.',
      example: {
        prohibited: '"You haven\'t logged today" or "Last logged: 3 days ago"',
        permitted: 'Simply show the capacity selection interface. No context.',
      },
    },

    patternsScreen: {
      rule: 'For views under 90 days, do not visualize absence. For 90d+ views, absence periods may appear as neutral spacing, not highlighted gaps.',
      example: {
        prohibited: 'Gray bars for "no data" days',
        permitted: 'Spacing between data points without visual markers',
      },
    },

    artifacts: {
      rule: 'In executive summaries and reports, absence is mentioned only as signal density context.',
      example: {
        prohibited: '"21 days without logging detected"',
        permitted: '"147 signals recorded across 180 days (signal density: 0.82)"',
      },
    },

    institutionalDashboard: {
      rule: 'Never show individual absence. Aggregate only.',
      example: {
        prohibited: '"User X has not logged in 14 days"',
        permitted: '"Population signal density: 0.76 signals/day average"',
      },
    },
  },

  /**
   * RATIONALE
   * ---------
   * Why these rules exist.
   */
  rationale: {
    behavioral: `Surfacing absence creates behavioral pressure. Behavioral pressure
creates guilt. Guilt creates avoidance. Avoidance terminates longitudinal
value. Orbital's value depends on multi-year engagement. The only sustainable
path is zero pressure.`,

    ethical: `Users are not obligated to provide data. Data provision is a gift,
not a duty. Treating absence as failure violates this principle. Orbital
respects user autonomy unconditionally.`,

    longitudinal: `Ironically, absence itself is valuable longitudinal data.
Periods without signals may correspond to life events, capacity states,
or context changes that inform long-horizon pattern recognition.
But this value is only realized if users return. They only return if
they are never made to feel guilty for leaving.`,

    institutional: `Institutions that use Orbital must not be able to surveil
individual engagement. Aggregate signal density is the only permitted
metric. This prevents misuse of Orbital as a compliance monitoring tool.`,
  },

  /**
   * ENFORCEMENT
   * -----------
   * How these rules are enforced.
   */
  enforcement: {
    codeReview: 'All PRs touching notification, messaging, or UX copy must be reviewed against this specification.',
    languageValidation: 'Automated checks against prohibited terms in all user-facing strings.',
    designReview: 'All UI changes must demonstrate absence-neutrality before approval.',
    auditLog: 'Any system message referencing absence triggers audit flag for review.',
  },
} as const;

/**
 * TYPE EXPORTS
 */
export type AbsenceProhibitedTerm = typeof ABSENCE_AS_SIGNAL.languageConstraints.prohibited[number];
