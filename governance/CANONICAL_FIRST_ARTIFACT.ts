/**
 * ORBITAL CANONICAL FIRST ARTIFACT
 *
 * Classification: INTERNAL - Product Specification
 * Version: 1.0.0
 * Effective: 2025-01-01
 * Status: LOCKED
 *
 * PURPOSE
 * -------
 * This document defines THE singular first-value artifact that Orbital
 * produces. This is the moment where accumulated signals transform into
 * tangible, exportable, shareable value.
 *
 * This specification is LOCKED. Changes require founder + legal approval.
 */

export const CANONICAL_FIRST_ARTIFACT = {
  version: '1.0.0',
  classification: 'INTERNAL',
  status: 'LOCKED',
  effectiveDate: '2025-01-01',

  /**
   * ARTIFACT DEFINITION
   * -------------------
   */
  artifact: {
    name: 'Quarterly Signal Summary',
    internalId: 'QSS',

    description: `A single-page executive summary of 90 days of capacity signals,
suitable for personal review, clinical sharing, or institutional archival.`,

    format: {
      primary: 'Structured text document',
      exportFormats: ['Plain text', 'PDF (future)'],
    },
  },

  /**
   * UNLOCK CONDITIONS
   * -----------------
   * When the artifact becomes available.
   */
  unlockConditions: {
    signalCount: 90,
    timeSpan: 'At least 90 days from first signal',
    condition: 'Both criteria must be met',

    rationale: `90 signals over 90+ days ensures:
1. Sufficient data density for statistical validity
2. True longitudinal span (not burst logging)
3. Baseline establishment with variance observation
4. User commitment demonstration`,
  },

  /**
   * ARTIFACT CONTENTS
   * -----------------
   * Precisely what the artifact contains.
   */
  contents: {
    header: {
      title: 'ORBITAL QUARTERLY SIGNAL SUMMARY',
      period: '[Start Date] - [End Date]',
      generatedDate: '[Generation Timestamp]',
    },

    sections: [
      {
        name: 'Signal Overview',
        contains: [
          'Total signals recorded: [N]',
          'Period covered: [N] days',
          'Signal density: [N] signals/day average',
        ],
        excludes: [
          'Compliance rate', 'Engagement score', 'Missed days',
        ],
      },
      {
        name: 'Capacity Distribution',
        contains: [
          'High capacity: [N]%',
          'Moderate capacity: [N]%',
          'Low capacity: [N]%',
        ],
        excludes: [
          'Good/bad framing', 'Comparison to population', 'Normative judgment',
        ],
      },
      {
        name: 'Baseline Estimate',
        contains: [
          'Estimated baseline: [N]% (weighted average)',
          'Variance from baseline: [+/-N]%',
        ],
        excludes: [
          'Goal language', 'Target language', 'Should-be language',
        ],
      },
      {
        name: 'Trend Observation',
        contains: [
          'Trend direction: [Stable / Shifting higher / Shifting lower]',
          'Period-over-period change: [+/-N]%',
        ],
        excludes: [
          'Improving/declining', 'Better/worse', 'Causal attribution',
        ],
      },
      {
        name: 'Driver Analysis',
        contains: [
          'Category breakdown (if tagged):',
          '  Sensory: [N] signals, [N]% correlation with low capacity',
          '  Demand: [N] signals, [N]% correlation with low capacity',
          '  Social: [N] signals, [N]% correlation with low capacity',
        ],
        excludes: [
          'Causal claims', 'Recommendations', '"Sensory is your problem"',
        ],
      },
      {
        name: 'Pattern Notes',
        contains: [
          'Observable patterns (if statistically significant):',
          '  - Day-of-week patterns',
          '  - Time-of-day patterns (if time data available)',
          '  - Notable shift periods',
        ],
        excludes: [
          'Interpretation', 'Meaning', 'What you should do',
        ],
      },
    ],

    footer: {
      disclaimer: `This summary reflects self-reported capacity signals.
It is not a diagnostic instrument. It does not constitute medical advice.
It does not indicate, suggest, or screen for any condition.

Orbital is a longitudinal observation tool.
Interpretation remains the domain of the reader.`,

      watermark: 'Non-diagnostic. Self-reported capacity data.',
      version: 'Orbital v1.0.0',
    },
  },

  /**
   * WHY THIS ARTIFACT
   * -----------------
   * Strategic rationale for this being the first value moment.
   */
  rationale: {
    whyArtifact: `An artifact is superior to a dashboard because:
1. Artifacts are exportable—they leave the app
2. Artifacts are shareable—they enable communication
3. Artifacts are archivable—they become records
4. Artifacts are complete—they don't require context
5. Artifacts are serious—they signal institutional readiness`,

    whyQuarterly: `90 days is the minimum credible longitudinal span:
1. Shorter periods lack statistical validity
2. Shorter periods don't demonstrate commitment
3. Quarterly cadence aligns with institutional rhythms
4. Quarterly is familiar (fiscal quarters, academic terms)
5. Quarterly is achievable (not annual, not weekly)`,

    whySignalSummary: `"Signal Summary" language is deliberate:
1. "Signal" reinforces non-diagnostic framing
2. "Summary" indicates synthesis, not raw data
3. Avoids "report" (too clinical), "analysis" (too interpretive),
   "assessment" (too diagnostic), "tracker" (too wellness)`,

    whyFirst: `This artifact is the first moment of value because:
1. It requires genuine longitudinal commitment (90 signals)
2. It transforms data into something tangible
3. It can be shared with a clinician, family member, or institution
4. It demonstrates what Orbital becomes over time
5. It is the seed of multi-year value accumulation`,
  },

  /**
   * USER EXPERIENCE
   * ---------------
   * How the artifact appears to the user.
   */
  userExperience: {
    discovery: {
      where: 'Settings > Export Options (at 90 signals)',
      presentation: 'Available as additional export format',
      prominence: 'Not highlighted or celebrated—simply available',
    },

    generation: {
      trigger: 'User-initiated export action',
      processing: 'Generated on-demand, not pre-computed',
      output: 'Text document shared via system share sheet',
    },

    messaging: {
      beforeUnlock: '"Executive artifacts unlock at 90 signals."',
      atUnlock: 'Simply appears in export options. No notification.',
      afterGeneration: 'No follow-up. No "share with friends" prompt.',
    },
  },

  /**
   * INSTITUTIONAL USE
   * -----------------
   * How the artifact serves institutional contexts.
   */
  institutionalUse: {
    clinicalSharing: `Clinicians may receive this artifact from clients.
It provides structured longitudinal context without diagnostic claims.
Clinicians interpret; Orbital observes.`,

    employerPrograms: `Employers in wellness programs may request artifacts
from participating employees (with consent). Artifacts are individual
records, not compliance metrics.`,

    researchContext: `Researchers may collect artifacts as longitudinal
self-report data. Artifacts are standardized for aggregation.`,

    legalContext: `In custody, disability, or accommodation contexts,
artifacts provide documented longitudinal capacity observation
without diagnostic claims that could be challenged.`,
  },

  /**
   * FUTURE ARTIFACTS
   * ----------------
   * What comes after the first artifact.
   */
  futureArtifacts: {
    annual: {
      name: 'Annual Capacity Report',
      unlockAt: '365 signals over 365+ days',
      purpose: 'Year-over-year longitudinal view',
    },

    multiyear: {
      name: 'Longitudinal Capacity Archive',
      unlockAt: '730+ signals over 2+ years',
      purpose: 'Multi-year pattern documentation',
    },

    note: `Future artifacts extend value. They do not replace
the Quarterly Signal Summary, which remains the canonical
first-value moment regardless of how long a user has logged.`,
  },

  /**
   * LOCK NOTICE
   * -----------
   * This specification is locked.
   */
  lockNotice: {
    status: 'LOCKED',
    lockedDate: '2025-01-01',
    amendmentRequires: ['Founder approval', 'Legal review'],
    rationale: `The first artifact defines what Orbital is. Changing it
changes the product's value proposition. This requires strategic review.`,
  },
} as const;
