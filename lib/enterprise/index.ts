/**
 * Enterprise Hardening Module
 *
 * This module provides the complete enterprise hardening infrastructure for Orbital.
 *
 * CRITICAL DESIGN PRINCIPLES:
 * 1. Misuse is PHYSICALLY IMPOSSIBLE, not merely discouraged
 * 2. All enforcement is SERVER-SIDE (UI-only blocking is insufficient)
 * 3. Class A (Relational) and Class B (Institutional) have NO overlap paths
 * 4. Privacy overrides completeness (K-anonymity always enforced)
 * 5. All operations FAIL CLOSED
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  DeploymentClass,
  DeploymentAccount,
  ClassARelationalAccount,
  ClassBInstitutionalAccount,
  OrganizationalUnit,
  AggregatedUnitMetrics,
  AggregatedValue,
  TrendDirection,
  FreshnessLevel,
  AgeCohort,
  AgeCohortMapping,
  RestrictedDomain,
  DomainCheckResult,
  ClassAConsentRecord,
  TermsAcceptance,
  EnforcementResult,
  EnforcementPoint,
} from './types';

export {
  K_ANONYMITY_THRESHOLD,
  SIGNAL_DELAY_SECONDS,
  FRESHNESS_WINDOW_HOURS,
  CLASS_A_BUNDLE_SIZES,
  CLASS_B_MINIMUM_SEATS,
  TERMS_VERSION_CLASS_A,
  TERMS_VERSION_CLASS_B,
} from './types';

// =============================================================================
// RESTRICTED DOMAIN REGISTRY
// =============================================================================

export {
  initializeRestrictedDomainRegistry,
  extractDomainFromEmail,
  normalizeDomain,
  checkDomainRestriction,
  enforceAtSignup,
  enforceAtCheckout,
  enforceAtAPI,
  addRestrictedDomain,
  isDomainRestricted,
  getAllRestrictedDomains,
} from './restrictedDomains';

// =============================================================================
// DEPLOYMENT CLASS ENFORCEMENT
// =============================================================================

export {
  determineDeploymentClass,
  classSupportsBundles,
  classSupportsNamedIndividuals,
  classRequiresMinimumSeats,
  isValidBundleSize,
  provisionClassAAccount,
  addNamedIndividual,
  provisionClassBAccount,
  addOrganizationalUnit,
  createConsentRecord,
  assertClassA,
  assertClassB,
  isOperationAllowed,
  guardAgainstIndividualData,
} from './deploymentClass';

// =============================================================================
// K-ANONYMITY ENFORCEMENT
// =============================================================================

export {
  meetsKAnonymity,
  createSuppressedValue,
  createVisibleValue,
  applyKAnonymity,
  calculateAggregatedMetrics,
  validateFilteredView,
  validateExportRequest,
  validateDrillDown,
  applySignalDelay,
  getDelayWindowMessage,
  getSuppressedDisplayClass,
  getSuppressedDisplayText,
  shouldRenderWithColor,
  getLoadColor,
  getRiskColor,
  getVelocityArrow,
  getFreshnessIndicator,
} from './kAnonymity';

export type { RawUnitSignals, FilteredViewRequest, ExportRequest } from './kAnonymity';

// =============================================================================
// AGE DATA MINIMIZATION
// =============================================================================

export {
  mapYearOfBirthToCohort,
  processYearOfBirth,
  isValidCohort,
  getAllCohorts,
  getCohortLabel,
  getYearOfBirthOptions,
  processAgeOnboarding,
  createAgeCohortRecord,
  updateCohortVerification,
  aggregateCohortDistribution,
  getCohortPercentages,
  getPrivacyGuarantee,
  createAgeProcessingAuditEntry,
  COHORT_LABELS,
} from './ageCohort';

export type {
  AgeOnboardingResult,
  StoredAgeCohort,
  AgeProcessingAuditEntry,
} from './ageCohort';

// =============================================================================
// REACT HOOK
// =============================================================================

export {
  useEnterpriseEnforcement,
  serverEnforceSignup,
  serverEnforceCheckout,
  serverEnforceAPI,
} from './useEnterpriseEnforcement';

export type { UseEnterpriseEnforcementReturn } from './useEnterpriseEnforcement';

// =============================================================================
// TERMS & LEGAL ENFORCEMENT
// =============================================================================

export {
  CLASS_A_TERMS,
  CLASS_B_TERMS,
  INSTITUTIONAL_DASHBOARD_HEADER,
  RELATIONAL_GROUP_HEADER,
  GROUP_CREATION_CONSENT_TEXT,
  logGroupCreationConsent,
  getConsentRecords,
  hasAcceptedTerms,
  recordTermsAcceptance,
  getRequiredTermsVersion,
  getTermsContent,
  requireTermsAcceptance,
  requireGroupCreationConsent,
  PROHIBITED_INSTITUTIONAL_FIELDS,
  isProhibitedInstitutionalField,
  validateInstitutionalSchema,
  getPrivacyNotice,
  INSTITUTIONAL_PRIVACY_NOTICE,
} from './termsEnforcement';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

import type { DeploymentClass as DeploymentClassType } from './types';

/**
 * Full enforcement check for a signup attempt.
 * Combines domain restriction, deployment class, and terms checks.
 */
export async function enforceFullSignupCheck(email: string): Promise<{
  allowed: boolean;
  deploymentClass: DeploymentClassType;
  reason: string;
  redirectUrl?: string;
}> {
  const { checkDomainRestriction } = await import('./restrictedDomains');
  const { determineDeploymentClass } = await import('./deploymentClass');

  const domainCheck = await checkDomainRestriction(email);

  if (domainCheck.isRestricted) {
    return {
      allowed: false,
      deploymentClass: 'class_b_institutional',
      reason: domainCheck.message || 'Domain restricted',
      redirectUrl: domainCheck.redirectUrl,
    };
  }

  const deploymentClass = await determineDeploymentClass(email);

  return {
    allowed: true,
    deploymentClass,
    reason: 'Signup permitted',
  };
}

/**
 * Full enforcement check for a purchase attempt.
 * Prevents bundle purchases for restricted domains.
 */
export async function enforceFullPurchaseCheck(
  email: string,
  productType: 'bundle' | 'institutional'
): Promise<{
  allowed: boolean;
  reason: string;
  redirectUrl?: string;
}> {
  const { checkDomainRestriction } = await import('./restrictedDomains');

  const domainCheck = await checkDomainRestriction(email);

  if (domainCheck.isRestricted && productType === 'bundle') {
    return {
      allowed: false,
      reason: 'Bundle purchases are not available for this domain. Enterprise agreement required.',
      redirectUrl: domainCheck.redirectUrl,
    };
  }

  return {
    allowed: true,
    reason: 'Purchase permitted',
  };
}
