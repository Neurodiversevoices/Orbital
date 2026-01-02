/**
 * ORBITAL GOVERNANCE MODULE
 *
 * Central export for all governance documentation.
 * These documents define what Orbital is, what it isn't,
 * and how engineering must implement constraints.
 *
 * Classification: INTERNAL/EXTERNAL as marked per document
 * Version: 1.0.0
 */

// Core Doctrine - What capacity means
export { CAPACITY_DOCTRINE } from './CAPACITY_DOCTRINE';
export type { ProhibitedTerm, PermittedTerm } from './CAPACITY_DOCTRINE';

// Absence Handling - How missing data is (not) treated
export { ABSENCE_AS_SIGNAL } from './ABSENCE_AS_SIGNAL';
export type { AbsenceProhibitedTerm } from './ABSENCE_AS_SIGNAL';

// Phase Semantics - Longitudinal progression rules
export { PHASE_SEMANTICS, getPhase, getPhaseConfig } from './PHASE_SEMANTICS';

// First Artifact - The canonical first value moment
export { CANONICAL_FIRST_ARTIFACT } from './CANONICAL_FIRST_ARTIFACT';

// Data Trust - What we will/won't do with data
export { DATA_TRUST_POSITION } from './DATA_TRUST_POSITION';

// Market Position - Why Orbital exists now
export { WHY_ORBITAL_EXISTS_NOW } from './WHY_ORBITAL_EXISTS_NOW';

// Engineering Notes - Implementation constraints
export { ENGINEERING_IMPLEMENTATION_NOTES } from './ENGINEERING_IMPLEMENTATION_NOTES';

/**
 * GOVERNANCE SUMMARY
 * ------------------
 * Quick reference for the governance framework.
 */
export const GOVERNANCE_SUMMARY = {
  version: '1.0.0',
  effectiveDate: '2025-01-01',

  // Programmatic governance (TypeScript modules)
  codeModules: [
    {
      name: 'Capacity Doctrine',
      file: 'CAPACITY_DOCTRINE.ts',
      purpose: 'Defines what "capacity" means. Prevents clinical/diagnostic drift.',
      classification: 'INTERNAL',
    },
    {
      name: 'Absence as Signal',
      file: 'ABSENCE_AS_SIGNAL.ts',
      purpose: 'Defines how missing data is treated. Prevents engagement manipulation.',
      classification: 'INTERNAL',
    },
    {
      name: 'Phase Semantics',
      file: 'PHASE_SEMANTICS.ts',
      purpose: 'Defines longitudinal phases. Prevents premature interpretation.',
      classification: 'INTERNAL',
    },
    {
      name: 'Canonical First Artifact',
      file: 'CANONICAL_FIRST_ARTIFACT.ts',
      purpose: 'Defines the first value moment. Locked specification.',
      classification: 'INTERNAL',
      status: 'LOCKED',
    },
    {
      name: 'Data Trust Position',
      file: 'DATA_TRUST_POSITION.ts',
      purpose: 'Defines data commitments. For institutional/acquisition review.',
      classification: 'EXTERNAL',
    },
    {
      name: 'Why Orbital Exists Now',
      file: 'WHY_ORBITAL_EXISTS_NOW.ts',
      purpose: 'Market timing rationale. For positioning/sales.',
      classification: 'EXTERNAL',
    },
    {
      name: 'Engineering Implementation Notes',
      file: 'ENGINEERING_IMPLEMENTATION_NOTES.ts',
      purpose: 'Technical constraints. For engineering team.',
      classification: 'INTERNAL',
    },
  ],

  // Strategic governance documentation (Markdown - human-readable)
  documents: [
    {
      name: 'Orbital Canon',
      file: 'ORBITAL_CANON.md',
      purpose: 'Frozen internal doctrine. Definition of capacity, language rules, founder restraint.',
      classification: 'INTERNAL',
      status: 'FROZEN',
    },
    {
      name: 'Absence as Signal Specification',
      file: 'ABSENCE_AS_SIGNAL_SPEC.md',
      purpose: 'Full specification for handling missing data. No nudges, no shame.',
      classification: 'INTERNAL',
    },
    {
      name: 'Longitudinal Phases',
      file: 'LONGITUDINAL_PHASES.md',
      purpose: 'Phase 0-3 definitions. What system computes, what user sees, language rules.',
      classification: 'INTERNAL',
      status: 'LOCKED',
    },
    {
      name: 'First Artifact Specification',
      file: 'FIRST_ARTIFACT_SPEC.md',
      purpose: '90-Day Summary as canonical first artifact. Locked.',
      classification: 'INTERNAL',
      status: 'LOCKED',
    },
    {
      name: 'Data Trust Position',
      file: 'DATA_TRUST_POSITION.md',
      purpose: 'Acquisition-grade data governance. Prohibitions, controls, audit.',
      classification: 'EXTERNAL',
    },
    {
      name: 'Why Now',
      file: 'WHY_NOW.md',
      purpose: 'Market timing rationale. Pre-regulation, temporal moat.',
      classification: 'EXTERNAL',
    },
    {
      name: 'Engineering Enforcement Plan',
      file: 'ENGINEERING_ENFORCEMENT_PLAN.md',
      purpose: 'Implementation-ready technical guidance. Lint rules, data model, permissions.',
      classification: 'INTERNAL',
    },
    {
      name: 'Founder Operating System',
      file: 'FOUNDER_OPERATING_SYSTEM.md',
      purpose: '10-year sustainability. Cadence, metrics, boundaries.',
      classification: 'INTERNAL - FOUNDER ONLY',
    },
    {
      name: 'Ship-Ready Backlog',
      file: 'SHIP_READY_BACKLOG.md',
      purpose: '48 prioritized tickets. Acceptance criteria, risk, owner.',
      classification: 'INTERNAL',
    },
  ],

  principles: [
    'Non-diagnostic by construction, not disclaimer',
    'Calm by default, not configuration',
    'Governance as code, not wiki',
    'Defaults over configuration',
    'Constraints over guidelines',
    'Time is the asset',
    'Boring is the goal',
  ],

  amendmentProcess: {
    internalDocs: 'Executive approval + legal review',
    externalDocs: 'Founder approval + legal review + comms review',
    lockedDocs: 'Board resolution + legal opinion + user notification',
  },
} as const;
