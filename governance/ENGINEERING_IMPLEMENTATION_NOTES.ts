/**
 * ORBITAL ENGINEERING IMPLEMENTATION NOTES
 *
 * Classification: INTERNAL - Engineering Specification
 * Version: 1.0.0
 * Effective: 2025-01-01
 *
 * PURPOSE
 * -------
 * Implementation-ready constraints for the engineering team.
 * These notes encode governance requirements as technical specifications.
 *
 * AUDIENCE: Senior engineers, tech leads, code reviewers.
 *
 * PRINCIPLE: Defaults over configuration. Constraints over guidelines.
 * If something must not happen, make it impossible, not discouraged.
 */

export const ENGINEERING_IMPLEMENTATION_NOTES = {
  version: '1.0.0',
  classification: 'INTERNAL',
  effectiveDate: '2025-01-01',

  /**
   * SECTION 1: LANGUAGE ENFORCEMENT
   * -------------------------------
   * Preventing mental health drift through string validation.
   */
  languageEnforcement: {
    overview: `All user-facing strings must pass through language validation.
This is not a linting suggestion. This is a build-blocking requirement.`,

    implementation: {
      approach: 'Static analysis + runtime validation',

      staticAnalysis: {
        tool: 'Custom ESLint rule or pre-commit hook',
        scope: 'All files in /app, /components, /locales',
        action: 'Block commit if prohibited terms detected in string literals',
        codeExample: `
// eslint-orbital/no-prohibited-terms
// This rule scans all string literals and template literals
// against CAPACITY_DOCTRINE.prohibitedLanguage

// BLOCKED:
const message = "Your mood seems low today"; // Contains 'mood'

// ALLOWED:
const message = "Signal recorded.";
`,
      },

      runtimeValidation: {
        when: 'DEBUG and TEST builds only (performance)',
        action: 'Console warning if prohibited term reaches render',
        purpose: 'Catch dynamic strings that escape static analysis',
      },

      prohibitedTermsList: `Import from /governance/CAPACITY_DOCTRINE.ts:
- All clinical terms (diagnosis, symptom, treatment, etc.)
- All mental health terms (depression, anxiety, mood, etc.)
- All wellness terms (wellbeing, self-care, mindfulness, etc.)
- All engagement terms (streak, missed, forgot, etc.)`,
    },

    localization: {
      requirement: 'Prohibited terms must be checked in ALL supported languages',
      approach: 'Maintain translated prohibited term lists per locale',
      review: 'Native speaker review of prohibited term lists annually',
    },

    exceptions: {
      policy: 'Legal/policy documents may contain prohibited terms in disclaimers',
      handling: 'Use /* orbital-language-exception */ comment to bypass check',
      audit: 'All exceptions logged and reviewed quarterly',
    },
  },

  /**
   * SECTION 2: NOTIFICATION PROHIBITION
   * -----------------------------------
   * There is no notification system. This is intentional.
   */
  notificationProhibition: {
    overview: `Orbital does not send notifications. Ever. This is not a feature
we haven't built yet. This is a feature we have explicitly prohibited.`,

    implementation: {
      pushNotifications: {
        status: 'PROHIBITED',
        enforcement: 'Do not install push notification libraries',
        codeReview: 'Reject any PR that adds expo-notifications or similar',
      },

      localNotifications: {
        status: 'PROHIBITED',
        enforcement: 'No scheduling of local notifications',
        codeReview: 'Reject any PR that schedules local alerts',
      },

      inAppReminders: {
        status: 'PROHIBITED',
        enforcement: 'No "time since last log" displays',
        codeReview: 'Reject any PR that references logging frequency',
      },

      email: {
        status: 'PROHIBITED for engagement',
        allowedUses: [
          'Password reset (if auth implemented)',
          'Legal notices (policy changes)',
          'Security alerts (account compromise)',
        ],
        explicitlyProhibited: [
          'We miss you emails',
          'Weekly summary emails',
          'Engagement reminder emails',
        ],
      },
    },

    rationale: `The notification prohibition is not about user preference.
Users cannot opt into notifications because notifications do not exist.
This prevents well-intentioned PMs from "just adding an opt-in reminder."
If the infrastructure doesn't exist, it can't be misused.`,
  },

  /**
   * SECTION 3: ABSENCE HANDLING
   * ---------------------------
   * How to (not) represent missing data.
   */
  absenceHandling: {
    overview: `Days without signals are not stored. They are not represented.
They are not counted. They are not surfaced.`,

    implementation: {
      storage: {
        rule: 'No null/empty records for days without signals',
        incorrect: `{ date: '2025-01-15', signal: null, status: 'MISSED' }`,
        correct: 'Simply no record exists for that date',
      },

      queries: {
        rule: 'Never query for "missing" days',
        incorrect: `SELECT dates WHERE date NOT IN (SELECT date FROM signals)`,
        correct: `SELECT * FROM signals WHERE date BETWEEN ? AND ?`,
      },

      visualization: {
        rule: 'No visual markers for absent data',
        incorrect: 'Gray bars or "no data" indicators on timeline',
        correct: 'Spacing between data points without markers',
      },

      aggregation: {
        rule: 'Calculate density, not gaps',
        incorrect: `{ missedDays: 5, complianceRate: 0.83 }`,
        correct: `{ signalCount: 25, periodDays: 30, density: 0.83 }`,
      },

      uiCopy: {
        rule: 'Never reference what was not logged',
        incorrect: `"You haven't logged in 3 days"`,
        correct: 'Show only the logging interface, no context',
      },
    },
  },

  /**
   * SECTION 4: PHASE GATING
   * -----------------------
   * What's available when.
   */
  phaseGating: {
    overview: `Features unlock based on signal count, not time.
Phase transitions are silent. No celebrations. No notifications.`,

    implementation: {
      phaseCalculation: {
        input: 'signalCount: number',
        output: 'phase: 0 | 1 | 2 | 3 | 4',
        logic: `
function getPhase(signalCount: number): number {
  if (signalCount >= 365) return 4;
  if (signalCount >= 90) return 3;
  if (signalCount >= 30) return 2;
  if (signalCount >= 7) return 1;
  return 0;
}`,
      },

      featureGating: {
        phase0: {
          available: ['Home logging interface', 'Settings'],
          locked: ['Patterns screen', 'Export', 'Sharing', 'Artifacts'],
        },
        phase1: {
          available: ['7-day history view'],
          locked: ['Statistics', 'Trends', 'Artifacts'],
        },
        phase2: {
          available: ['30-day view', 'State distribution'],
          locked: ['Trend language', 'Artifacts'],
        },
        phase3: {
          available: ['90-day view', 'Trends', 'Quarterly artifact'],
          locked: ['Annual artifact'],
        },
        phase4: {
          available: ['Full features', 'Annual artifact'],
          locked: [],
        },
      },

      transitionBehavior: {
        notification: 'NONE',
        uiChange: 'Feature silently appears in navigation',
        celebration: 'PROHIBITED',
        messaging: 'No "Congratulations" or "Unlocked" language',
      },
    },
  },

  /**
   * SECTION 5: ACCESSIBILITY
   * ------------------------
   * Non-optional accessibility requirements.
   */
  accessibility: {
    overview: `Accessibility is not a feature flag. Accessibility is a requirement.
All features ship with full accessibility support or do not ship.`,

    requirements: {
      screenReader: {
        requirement: 'All interactive elements have accessible labels',
        testing: 'VoiceOver (iOS) and TalkBack (Android) testing required',
        acceptance: 'Feature cannot merge without screen reader verification',
      },

      colorContrast: {
        requirement: 'WCAG 2.1 AA minimum (4.5:1 for text)',
        testing: 'Automated contrast checking in CI',
        acceptance: 'Contrast failures block merge',
      },

      touchTargets: {
        requirement: 'Minimum 44x44 points for all interactive elements',
        implementation: 'bigButtonMode multiplies this further',
        testing: 'Automated layout testing',
      },

      textScaling: {
        requirement: 'All text respects system font size settings',
        implementation: 'Use relative sizing, not fixed pixels',
        testing: 'Test at 200% system font size',
      },

      motionReduction: {
        requirement: 'Respect prefers-reduced-motion',
        implementation: 'Check reduceMotion setting before animations',
        testing: 'Verify all animations disabled when setting is on',
      },

      colorBlindness: {
        requirement: 'Information not conveyed by color alone',
        implementation: 'Icons/patterns accompany color coding',
        testing: 'Verify with color blindness simulators',
      },
    },

    simpleMode: {
      description: 'One-tap maximum accessibility preset',
      enables: [
        'High contrast',
        'Extra-large text',
        'Extra-large buttons',
        'Simplified text',
        'Reduced motion',
        'Strong haptics',
        'Confirmation dialogs',
      ],
      implementation: 'Single boolean toggle applies all settings',
    },
  },

  /**
   * SECTION 6: DATA DELETION
   * ------------------------
   * True deletion. Not soft delete. Not archival.
   */
  dataDeletion: {
    overview: `When users delete data, it is deleted. Not hidden. Not archived.
Not retained for analytics. Deleted.`,

    implementation: {
      userDeletion: {
        scope: 'All user data including signals, metadata, preferences',
        method: 'Hard DELETE, not soft delete flag',
        cascade: 'Foreign key cascades delete related records',
        verification: 'Query returns zero records post-deletion',
      },

      certificate: {
        requirement: 'Generate deletion certificate on completion',
        contains: [
          'Unique certificate ID',
          'Deletion timestamp',
          'Record count deleted',
          'Categories deleted',
        ],
        purpose: 'User proof of deletion for compliance',
      },

      auditRetention: {
        exception: 'Audit log entries may be retained (anonymized)',
        rationale: 'Compliance requirement for institutional contexts',
        implementation: 'Audit entries stripped of user identifiers',
      },

      backupHandling: {
        requirement: 'Deleted data purged from backups within rotation period',
        rotation: 'Define maximum backup retention (e.g., 30 days)',
        verification: 'Document backup purge process',
      },
    },
  },

  /**
   * SECTION 7: INSTITUTIONAL AGGREGATION
   * ------------------------------------
   * Aggregate only. No individual records.
   */
  institutionalAggregation: {
    overview: `Institutional dashboards show aggregate data only.
Individual records are never exposed to institutional contexts.`,

    implementation: {
      queryRestriction: {
        rule: 'Institutional queries enforce minimum group size',
        threshold: 'k >= 10 (minimum 10 individuals in any aggregate)',
        implementation: 'Query layer rejects results with < k records',
      },

      noIndividualAccess: {
        rule: 'Institutional roles cannot access individual signals',
        enforcement: 'Role-based access control at API layer',
        testing: 'Penetration test institutional role boundaries',
      },

      permittedMetrics: [
        'Population signal density',
        'Aggregate state distribution',
        'Period-over-period trend (aggregate)',
        'Category driver correlation (aggregate)',
      ],

      prohibitedMetrics: [
        'Individual compliance rates',
        'Named user activity',
        'Individual last-logged dates',
        'Individual trend lines',
      ],
    },
  },

  /**
   * SECTION 8: DEFAULT BEHAVIORS
   * ----------------------------
   * Defaults are not configurable. They are the product.
   */
  defaults: {
    overview: `Orbital's defaults are its features. Configuration is complexity.
Complexity enables misuse. Defaults prevent misuse.`,

    nonConfigurable: {
      notifications: 'Off. Not configurable. Infrastructure does not exist.',
      streaks: 'Disabled. Not configurable. Concept does not exist.',
      socialFeatures: 'None. Not configurable. Infrastructure does not exist.',
      gamification: 'None. Not configurable. No points, badges, or achievements.',
      dataSharing: 'Off by default. Requires explicit user action to enable.',
      analytics: 'Minimal. No third-party analytics SDKs.',
    },

    userConfigurable: {
      language: 'User selects from supported locales',
      accessibility: 'User adjusts visual/motor/cognitive preferences',
      sharing: 'User explicitly creates time-bounded shares',
      deletion: 'User can delete any/all data at any time',
    },

    rationale: `Every configuration option is a decision pushed to the user.
Orbital makes decisions so users don't have to. The right defaults are
the product. Configuration is a confession of indecision.`,
  },

  /**
   * SECTION 9: ACQUISITION READINESS
   * --------------------------------
   * Code quality for diligence.
   */
  acquisitionReadiness: {
    overview: `Code should be reviewable by acquiring company's engineering team.
Clean, documented, boring. No clever hacks. No technical debt hiding.`,

    requirements: {
      documentation: {
        requirement: 'All public functions documented',
        format: 'JSDoc with parameter and return types',
        governance: 'Link to governance docs where relevant',
      },

      typeScript: {
        requirement: 'Strict TypeScript throughout',
        config: 'strict: true, no any types except explicit escape hatches',
        rationale: 'Type safety demonstrates engineering discipline',
      },

      testing: {
        requirement: 'Critical paths have test coverage',
        focus: 'Phase gating, data deletion, language validation',
        rationale: 'Tests document expected behavior for diligence',
      },

      dependencies: {
        requirement: 'Minimize dependencies. Prefer standard library.',
        audit: 'npm audit clean. No high/critical vulnerabilities.',
        licensing: 'All dependencies MIT, Apache 2.0, or similar permissive',
      },

      security: {
        requirement: 'No hardcoded secrets. No debug backdoors.',
        audit: 'Secrets scanning in CI',
        encryption: 'Data encrypted at rest and in transit',
      },

      governance: {
        requirement: 'Governance docs are code, not external wikis',
        location: '/governance directory in main repo',
        rationale: 'Governance travels with code. Diligence reviews one repo.',
      },
    },
  },

  /**
   * SECTION 10: CODE REVIEW CHECKLIST
   * ---------------------------------
   * For every PR involving user-facing changes.
   */
  codeReviewChecklist: {
    language: [
      '[ ] No prohibited terms in user-facing strings',
      '[ ] No causal/prescriptive language',
      '[ ] No engagement/streak language',
      '[ ] No celebration/achievement language',
    ],

    absence: [
      '[ ] No references to "missed" or "skipped" days',
      '[ ] No null/empty records for absent data',
      '[ ] No visual markers for absent data',
    ],

    phase: [
      '[ ] Features respect phase gating',
      '[ ] No premature trend/pattern language',
      '[ ] Phase transitions are silent',
    ],

    accessibility: [
      '[ ] Accessible labels on interactive elements',
      '[ ] Color contrast meets WCAG 2.1 AA',
      '[ ] Touch targets >= 44x44 points',
      '[ ] Respects text scaling and motion preferences',
    ],

    data: [
      '[ ] Deletion is hard delete, not soft delete',
      '[ ] No individual data in institutional contexts',
      '[ ] Aggregate queries enforce k-anonymity',
    ],

    general: [
      '[ ] No notification infrastructure added',
      '[ ] No analytics SDKs added',
      '[ ] No social/sharing infrastructure added',
      '[ ] Dependencies are permissively licensed',
    ],
  },
} as const;
