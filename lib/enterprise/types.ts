/**
 * Enterprise Hardening - Type Definitions
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  NON-NEGOTIABLE SECURITY CONTROLS — DO NOT MODIFY WITHOUT LEGAL REVIEW      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  1. Class A/B deployment separation is STRUCTURAL, not policy              ║
 * ║  2. Class B schemas MUST NOT contain named/identifying fields              ║
 * ║  3. K_ANONYMITY_THRESHOLD (Rule of 5) is a privacy compliance floor        ║
 * ║  4. These types make surveillance architecturally impossible               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * CRITICAL: This module defines the structural separation between:
 * - Class A (Relational/Bundles) - Named individuals, consent-based
 * - Class B (Institutional/Enterprise) - Anonymous aggregates only
 *
 * These types enforce that misuse is PHYSICALLY IMPOSSIBLE, not merely discouraged.
 */

// =============================================================================
// DEPLOYMENT CLASSES - MUTUALLY EXCLUSIVE
// =============================================================================

export type DeploymentClass = 'class_a_relational' | 'class_b_institutional';

export interface ClassARelationalAccount {
  readonly deploymentClass: 'class_a_relational';
  readonly bundleSize: 5 | 10 | 20 | 50;
  readonly namedIndividuals: string[]; // Names ARE stored
  readonly consentAcknowledgmentLoggedAt: string; // ISO timestamp
  readonly termsVersion: string;
  readonly createdAt: string;
  readonly ownerId: string;
}

export interface ClassBInstitutionalAccount {
  readonly deploymentClass: 'class_b_institutional';
  readonly minimumSeats: number; // Enforced minimum
  readonly organizationalUnits: OrganizationalUnit[];
  readonly contractId: string; // Required for provisioning
  readonly termsVersion: string;
  readonly createdAt: string;
  // NO namedIndividuals field - structurally impossible
  // NO bundleSize field - bundles not available
}

export type DeploymentAccount = ClassARelationalAccount | ClassBInstitutionalAccount;

// =============================================================================
// ORGANIZATIONAL UNITS (CLASS B ONLY)
// =============================================================================

export interface OrganizationalUnit {
  readonly id: string;
  readonly name: string; // Department/team name only, never individual
  readonly parentUnitId: string | null;
  readonly activeSignalCount: number; // For K-anonymity checks
  readonly createdAt: string;
}

// =============================================================================
// AGGREGATED METRICS (CLASS B ONLY - NO INDIVIDUAL DATA)
// =============================================================================

export interface AggregatedUnitMetrics {
  readonly unitId: string;
  readonly unitName: string;

  // Triage Command Center columns
  readonly load: AggregatedValue; // % capacity
  readonly risk: AggregatedValue; // % depleted
  readonly velocity: TrendDirection; // Trend arrow
  readonly freshness: FreshnessLevel; // Signal recency

  // K-anonymity enforcement
  readonly signalCount: number;
  readonly isSuppressed: boolean; // True if < K_ANONYMITY_THRESHOLD
}

export interface AggregatedValue {
  readonly value: number | null; // null if suppressed
  readonly isSuppressed: boolean;
  readonly suppressionReason: 'insufficient_data' | null;
}

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'suppressed';
export type FreshnessLevel = 'fresh' | 'stale' | 'dormant' | 'suppressed';

// =============================================================================
// AGE COHORT (DATA MINIMIZATION)
// =============================================================================

export type AgeCohort =
  | 'under_20'
  | '20_29'
  | '30_39'
  | '40_49'
  | '50_59'
  | '60_69'
  | '70_plus'
  | 'undisclosed';

export interface AgeCohortMapping {
  readonly cohortId: AgeCohort;
  readonly minYear: number | null; // For mapping, NOT stored
  readonly maxYear: number | null; // For mapping, NOT stored
}

// =============================================================================
// RESTRICTED DOMAIN REGISTRY
// =============================================================================

export interface RestrictedDomain {
  readonly domain: string; // e.g., "megacorp.com"
  readonly organizationName: string;
  readonly enforcementLevel: 'block_all' | 'redirect_sso' | 'contact_sales';
  readonly addedAt: string;
  readonly addedBy: string; // Admin user ID
  readonly ssoEndpoint?: string; // For SSO redirect
  readonly salesContactUrl?: string;
}

export interface DomainCheckResult {
  readonly isRestricted: boolean;
  readonly domain: string;
  readonly action: 'allowed' | 'block_class_a' | 'redirect_sso' | 'contact_sales';
  readonly redirectUrl?: string;
  readonly message?: string;
}

// =============================================================================
// CONSENT & TERMS
// =============================================================================

export interface ClassAConsentRecord {
  readonly userId: string;
  readonly groupId: string;
  readonly consentType: 'explicit_acknowledgment';
  readonly acknowledgmentText: string; // What they agreed to
  readonly acknowledgedAt: string;
  readonly ipAddress?: string; // Optional audit
  readonly userAgent?: string; // Optional audit
}

export interface TermsAcceptance {
  readonly userId: string;
  readonly deploymentClass: DeploymentClass;
  readonly termsVersion: string;
  readonly acceptedAt: string;
  readonly termsDocumentHash: string; // SHA256 of terms content
}

// =============================================================================
// ANTI-SCOPE CREEP SCHEMA CONSTRAINTS — NON-NEGOTIABLE
// =============================================================================

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  NON-NEGOTIABLE: NO NAMED/IDENTIFYING FIELDS IN CLASS B (INSTITUTIONAL)     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  The following fields are STRUCTURALLY PROHIBITED in Class B schemas:       ║
 * ║  • individualNotes      - Creates paper trail to individuals                ║
 * ║  • performanceScore     - Enables performance management misuse             ║
 * ║  • freeTextCommentary   - Risk of identifying language                      ║
 * ║  • individualTimeline   - Enables behavioral surveillance                   ║
 * ║  • userName / userAvatar / userEmail - Direct identifiers                   ║
 * ║                                                                              ║
 * ║  ANY addition of these fields requires LEGAL AND ETHICS REVIEW              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * STRUCTURAL PROHIBITION: These fields MUST NEVER exist in Class B schemas.
 * This type exists to document what is forbidden, not to be used.
 */
export interface ProhibitedClassBFields {
  // NEVER include these in institutional schemas:
  // individualNotes: string;
  // performanceScore: number;
  // freeTextCommentary: string;
  // individualTimeline: any[];
  // userName: string;
  // userAvatar: string;
  // userEmail: string;
  readonly _phantom: never; // Makes this type unusable
}

// =============================================================================
// ENFORCEMENT RESULT TYPES
// =============================================================================

export interface EnforcementResult {
  readonly allowed: boolean;
  readonly reason: string;
  readonly failClosed: boolean; // If true, this was a fail-closed denial
  readonly enforcementPoint: EnforcementPoint;
  readonly timestamp: string;
}

export type EnforcementPoint =
  | 'signup_flow'
  | 'checkout_flow'
  | 'api_validation'
  | 'backend_provisioning'
  | 'dashboard_query'
  | 'export_request';

// =============================================================================
// CONSTANTS — NON-NEGOTIABLE SECURITY THRESHOLDS
// =============================================================================

/**
 * NON-NEGOTIABLE: K-anonymity threshold (Rule of 5)
 * Any view with fewer than 5 signals MUST return "Insufficient Data"
 * This is a GDPR/privacy compliance floor, NOT a tunable parameter
 */
export const K_ANONYMITY_THRESHOLD = 5 as const;

/**
 * NON-NEGOTIABLE: Signal delay to break temporal inference attacks
 * Signals are NOT visible in aggregate views until this delay has passed
 */
export const SIGNAL_DELAY_SECONDS = 300 as const; // 5 minutes to break temporal inference

/**
 * Freshness window for signal recency indicators
 */
export const FRESHNESS_WINDOW_HOURS = 24 as const; // Cached freshness window

export const CLASS_A_BUNDLE_SIZES = [5, 10, 20, 50] as const;
export const CLASS_B_MINIMUM_SEATS = 25 as const; // Minimum for institutional

export const TERMS_VERSION_CLASS_A = '1.0-relational' as const;
export const TERMS_VERSION_CLASS_B = '1.0-institutional' as const;
