/**
 * ORBITAL DATA TRUST POSITION
 *
 * Classification: EXTERNAL - Governance Statement
 * Version: 1.0.0
 * Effective: 2025-01-01
 *
 * PURPOSE
 * -------
 * This document articulates Orbital's commitments, constraints, and governance
 * posture regarding user data. It is designed for:
 * - Enterprise pilot due diligence
 * - Payer and pharmaceutical partner evaluation
 * - Acquisition review by strategic acquirers
 * - Regulatory inquiry response
 *
 * TONE: Calm, precise, confident, boring.
 */

export const DATA_TRUST_POSITION = {
  version: '1.0.0',
  classification: 'EXTERNAL',
  effectiveDate: '2025-01-01',

  /**
   * EXECUTIVE SUMMARY
   * -----------------
   */
  executiveSummary: `Orbital is a longitudinal capacity tracking platform that captures
self-reported signals over time. User data ownership is absolute. Data is
never sold. Access to data exists only through the product. Orbital's
value is in the product experience and institutional-grade governance,
not in data monetization.

This document defines what Orbital will never do, what requires governance
approval, and how this posture reduces risk for institutional partners
and potential acquirers.`,

  /**
   * SECTION 1: WHAT ORBITAL WILL NEVER DO
   * -------------------------------------
   * Absolute prohibitions. No exceptions. No governance override.
   */
  neverDo: {
    sectionTitle: 'Absolute Prohibitions',

    prohibitions: [
      {
        id: 'NEVER-01',
        statement: 'Orbital will NEVER sell individual user data.',
        scope: 'All user data including signals, metadata, and derived analytics.',
        rationale: 'Data sale destroys user trust and creates regulatory exposure.',
        exceptions: 'NONE',
      },
      {
        id: 'NEVER-02',
        statement: 'Orbital will NEVER share individual data with third parties without explicit user consent.',
        scope: 'Any transmission of identifiable data outside Orbital systems.',
        rationale: 'Unauthorized sharing violates user autonomy and privacy law.',
        exceptions: 'NONE (legal compulsion addressed separately)',
      },
      {
        id: 'NEVER-03',
        statement: 'Orbital will NEVER use data for advertising targeting.',
        scope: 'No advertising. No ad-supported tier. No partner ad integration.',
        rationale: 'Advertising creates misaligned incentives and user exploitation.',
        exceptions: 'NONE',
      },
      {
        id: 'NEVER-04',
        statement: 'Orbital will NEVER provide diagnostic output.',
        scope: 'System will never output diagnosis, risk scores, or clinical labels.',
        rationale: 'Diagnostic claims create regulatory classification as medical device.',
        exceptions: 'NONE',
      },
      {
        id: 'NEVER-05',
        statement: 'Orbital will NEVER implement engagement manipulation.',
        scope: 'No notifications, nudges, streaks, gamification, or behavioral pressure.',
        rationale: 'Engagement manipulation conflicts with calm, longitudinal value proposition.',
        exceptions: 'NONE',
      },
      {
        id: 'NEVER-06',
        statement: 'Orbital will NEVER enable individual surveillance in institutional contexts.',
        scope: 'Institutional dashboards show aggregate only. Never individual identification.',
        rationale: 'Individual surveillance would make Orbital a compliance tool, not a capacity tool.',
        exceptions: 'NONE',
      },
      {
        id: 'NEVER-07',
        statement: 'Orbital will NEVER retain data beyond user-controlled or legally-required periods.',
        scope: 'User deletion is permanent. No shadow retention. No analytics holdback.',
        rationale: 'True deletion is the only credible data ownership claim.',
        exceptions: 'Legally mandated retention with documentation.',
      },
    ],
  },

  /**
   * SECTION 2: GOVERNANCE-CONTROLLED OPERATIONS
   * -------------------------------------------
   * Permitted only with explicit governance framework.
   */
  governanceControlled: {
    sectionTitle: 'Governance-Controlled Operations',

    operations: [
      {
        id: 'GOV-01',
        operation: 'Aggregate data research',
        description: 'Use of de-identified, aggregated data for population-level research.',
        requirements: [
          'IRB approval or equivalent ethical review',
          'k-anonymity threshold (minimum group size)',
          'No re-identification pathway',
          'User consent at account creation (opt-out available)',
        ],
        rationale: 'Aggregate research creates scientific value without individual exposure.',
      },
      {
        id: 'GOV-02',
        operation: 'Institutional data access',
        description: 'Organizations accessing aggregate capacity data for their populations.',
        requirements: [
          'Written data processing agreement',
          'Aggregate-only access (no individual records)',
          'User awareness of institutional context',
          'Audit logging of all access',
        ],
        rationale: 'Institutions may legitimately need population-level insight for program design.',
      },
      {
        id: 'GOV-03',
        operation: 'User-initiated sharing',
        description: 'Users sharing their data with designated recipients (clinicians, family, etc.).',
        requirements: [
          'Explicit user action (not default)',
          'Time-bounded sharing (automatic expiration)',
          'Revocable at any time',
          'Audit trail of all sharing events',
        ],
        rationale: 'User-controlled sharing enables clinical utility without platform-mediated disclosure.',
      },
      {
        id: 'GOV-04',
        operation: 'Legal compulsion response',
        description: 'Response to valid legal process (subpoenas, court orders).',
        requirements: [
          'Legal review of validity',
          'Minimum necessary disclosure',
          'User notification where legally permitted',
          'Documentation in audit log',
        ],
        rationale: 'Legal compliance is required but bounded by minimum-disclosure principle.',
      },
      {
        id: 'GOV-05',
        operation: 'Acquisition data transfer',
        description: 'Transfer of user data as part of corporate acquisition.',
        requirements: [
          'Successor bound by same data trust commitments',
          'User notification of acquisition',
          'Opt-out data deletion window',
          'Contractual enforcement of governance continuation',
        ],
        rationale: 'Acquisition cannot be used to circumvent user data protections.',
      },
    ],
  },

  /**
   * SECTION 3: RISK REDUCTION
   * -------------------------
   * How this posture reduces risk for stakeholders.
   */
  riskReduction: {
    sectionTitle: 'Risk Mitigation',

    institutional: {
      category: 'Institutional Partners (Employers, Payers, Health Systems)',
      risks: [
        {
          risk: 'HIPAA exposure',
          mitigation: 'Orbital is non-diagnostic. Data is self-reported capacity, not PHI. No covered entity relationship created.',
        },
        {
          risk: 'Employee surveillance liability',
          mitigation: 'Aggregate-only institutional access. No individual identification possible.',
        },
        {
          risk: 'ADA/accommodation complexity',
          mitigation: 'Non-diagnostic framing means Orbital data cannot be used to determine disability status.',
        },
        {
          risk: 'Union/labor relations concerns',
          mitigation: 'No productivity measurement. No performance correlation. No individual monitoring.',
        },
      ],
    },

    regulatory: {
      category: 'Regulatory Bodies (FDA, FTC, State AGs)',
      risks: [
        {
          risk: 'Medical device classification',
          mitigation: 'Capacity doctrine ensures non-diagnostic operation. No clinical claims.',
        },
        {
          risk: 'Deceptive practices',
          mitigation: 'Clear non-diagnostic disclaimers. No efficacy claims. No health outcome promises.',
        },
        {
          risk: 'Data protection violations',
          mitigation: 'GDPR-aligned rights (access, export, deletion). No data sale. Transparent processing.',
        },
        {
          risk: 'Child privacy (COPPA)',
          mitigation: 'Institutional deployments with minors require parental consent. Age gating enforced.',
        },
      ],
    },

    acquisition: {
      category: 'Potential Acquirers',
      risks: [
        {
          risk: 'Inherited liability',
          mitigation: 'Clean data practices from inception. Full audit trail. No historical violations.',
        },
        {
          risk: 'Regulatory scrutiny of data assets',
          mitigation: 'Data is not the asset. Product experience is the asset. No data monetization to unwind.',
        },
        {
          risk: 'User trust erosion post-acquisition',
          mitigation: 'Contractual governance continuation. User notification and opt-out rights.',
        },
        {
          risk: 'Integration complexity',
          mitigation: 'Standard data formats. Export functionality. No lock-in mechanics.',
        },
      ],
    },
  },

  /**
   * SECTION 4: TECHNICAL ENFORCEMENT
   * --------------------------------
   * How commitments are technically enforced.
   */
  technicalEnforcement: {
    sectionTitle: 'Technical Enforcement Mechanisms',

    mechanisms: [
      {
        commitment: 'No individual institutional access',
        enforcement: 'Database queries for institutional contexts enforce minimum aggregation thresholds at query layer.',
      },
      {
        commitment: 'True deletion',
        enforcement: 'Deletion operations are hard deletes with cascade. No soft delete. Backup rotation ensures deletion propagation.',
      },
      {
        commitment: 'Audit trail',
        enforcement: 'Immutable append-only audit log. Cryptographic integrity verification. Third-party audit capability.',
      },
      {
        commitment: 'Consent management',
        enforcement: 'Consent state stored with data. Processing blocked absent valid consent. Consent withdrawal triggers access revocation.',
      },
      {
        commitment: 'No engagement manipulation',
        enforcement: 'Notification infrastructure does not exist. No push notification capability in codebase.',
      },
    ],
  },

  /**
   * SECTION 5: GOVERNANCE STRUCTURE
   * -------------------------------
   * Who decides, and how.
   */
  governanceStructure: {
    sectionTitle: 'Governance Authority',

    authorities: {
      absoluteProhibitions: {
        modificationRequires: 'Board resolution + legal opinion + user notification',
        rationale: 'Absolute prohibitions are constitutional. Changing them changes the company.',
      },
      governanceControlledOps: {
        modificationRequires: 'Executive approval + legal review',
        rationale: 'Operational governance can evolve within established principles.',
      },
      technicalEnforcement: {
        modificationRequires: 'Engineering leadership + security review',
        rationale: 'Technical implementation can be improved without changing commitments.',
      },
    },

    auditSchedule: {
      internal: 'Quarterly governance review',
      external: 'Annual third-party data practices audit',
      adHoc: 'On significant product changes or incidents',
    },
  },

  /**
   * SECTION 6: COMMITMENT TO BORING
   * -------------------------------
   * Why this matters.
   */
  commitmentToBoring: {
    statement: `The goal of this data trust position is to be boring.

Boring means predictable. Boring means unsurprising. Boring means that
when a regulator, acquirer, or journalist examines Orbital's data practices,
they find exactly what they expected: clear commitments, technical enforcement,
and governance structure.

Boring is the opposite of "move fast and break things." Boring is what
institutions require. Boring is what acquirers pay premium for. Boring is
what users deserve.

Orbital's data trust position is designed to remain boring for decades.`,
  },
} as const;
