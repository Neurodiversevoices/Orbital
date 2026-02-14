/**
 * Deployment Class Enforcement
 *
 * CRITICAL: Hard separation between Class A (Relational) and Class B (Institutional).
 * There must be NO overlap paths.
 *
 * Class A (Relational):
 * - Bundles: 5 / 10 / 20 / 50
 * - Named individuals allowed
 * - People-first UI
 * - Explicit consent acknowledgment logged
 * - Terms forbid employment-contingent monitoring
 *
 * Class B (Institutional):
 * - Minimum seat requirement enforced
 * - No bundles available
 * - No names anywhere
 * - No individual identifiers in schemas
 * - Contracted deployment only
 * - MUST NEVER render individual-level data
 */

import {
  DeploymentClass,
  DeploymentAccount,
  ClassARelationalAccount,
  ClassBInstitutionalAccount,
  OrganizationalUnit,
  ClassAConsentRecord,
  EnforcementResult,
  CLASS_A_BUNDLE_SIZES,
  CLASS_B_MINIMUM_SEATS,
  TERMS_VERSION_CLASS_A,
  TERMS_VERSION_CLASS_B,
} from './types';
import { checkDomainRestriction } from './restrictedDomains';

// =============================================================================
// DEPLOYMENT CLASS DETECTION
// =============================================================================

/**
 * Determine deployment class for an email.
 * Restricted domains MUST use Class B.
 */
export async function determineDeploymentClass(email: string): Promise<DeploymentClass> {
  const domainCheck = await checkDomainRestriction(email);

  if (domainCheck.isRestricted) {
    return 'class_b_institutional';
  }

  return 'class_a_relational';
}

/**
 * Check if a deployment class allows bundles.
 */
export function classSupportsBundles(deploymentClass: DeploymentClass): boolean {
  return deploymentClass === 'class_a_relational';
}

/**
 * Check if a deployment class allows named individuals.
 */
export function classSupportsNamedIndividuals(deploymentClass: DeploymentClass): boolean {
  return deploymentClass === 'class_a_relational';
}

/**
 * Check if a deployment class requires minimum seats.
 */
export function classRequiresMinimumSeats(deploymentClass: DeploymentClass): boolean {
  return deploymentClass === 'class_b_institutional';
}

// =============================================================================
// CLASS A (RELATIONAL) PROVISIONING
// =============================================================================

/**
 * Validate bundle size for Class A.
 */
export function isValidBundleSize(size: number): size is 5 | 10 | 20 | 50 {
  return (CLASS_A_BUNDLE_SIZES as readonly number[]).includes(size);
}

/**
 * Create a Class A (Relational) account.
 * Requires explicit consent acknowledgment.
 */
export async function provisionClassAAccount(params: {
  ownerId: string;
  bundleSize: 5 | 10 | 20 | 50;
  consentAcknowledged: boolean;
  email: string;
}): Promise<EnforcementResult & { account?: ClassARelationalAccount }> {
  // GATE 1: Check domain restriction
  const domainCheck = await checkDomainRestriction(params.email);
  if (domainCheck.isRestricted) {
    return {
      allowed: false,
      reason: `Class A accounts are not available for ${domainCheck.domain}. Enterprise deployment required.`,
      failClosed: true,
      enforcementPoint: 'backend_provisioning',
      timestamp: new Date().toISOString(),
    };
  }

  // GATE 2: Validate bundle size
  if (!isValidBundleSize(params.bundleSize)) {
    return {
      allowed: false,
      reason: `Invalid bundle size: ${params.bundleSize}. Valid sizes: ${CLASS_A_BUNDLE_SIZES.join(', ')}`,
      failClosed: true,
      enforcementPoint: 'backend_provisioning',
      timestamp: new Date().toISOString(),
    };
  }

  // GATE 3: Consent acknowledgment required
  if (!params.consentAcknowledged) {
    return {
      allowed: false,
      reason: 'Explicit consent acknowledgment is required for Class A accounts.',
      failClosed: true,
      enforcementPoint: 'backend_provisioning',
      timestamp: new Date().toISOString(),
    };
  }

  // Create the account
  const account: ClassARelationalAccount = {
    deploymentClass: 'class_a_relational',
    bundleSize: params.bundleSize,
    namedIndividuals: [],
    consentAcknowledgmentLoggedAt: new Date().toISOString(),
    termsVersion: TERMS_VERSION_CLASS_A,
    createdAt: new Date().toISOString(),
    ownerId: params.ownerId,
  };

  return {
    allowed: true,
    reason: 'Class A account provisioned',
    failClosed: false,
    enforcementPoint: 'backend_provisioning',
    timestamp: new Date().toISOString(),
    account,
  };
}

/**
 * Add a named individual to a Class A account.
 * Enforces bundle size limit.
 */
export function addNamedIndividual(
  account: ClassARelationalAccount,
  name: string
): EnforcementResult & { updatedAccount?: ClassARelationalAccount } {
  // GATE: Check bundle capacity
  if (account.namedIndividuals.length >= account.bundleSize) {
    return {
      allowed: false,
      reason: `Bundle capacity reached (${account.bundleSize}). Upgrade to add more individuals.`,
      failClosed: true,
      enforcementPoint: 'backend_provisioning',
      timestamp: new Date().toISOString(),
    };
  }

  // Add the individual
  const updatedAccount: ClassARelationalAccount = {
    ...account,
    namedIndividuals: [...account.namedIndividuals, name],
  };

  return {
    allowed: true,
    reason: 'Individual added',
    failClosed: false,
    enforcementPoint: 'backend_provisioning',
    timestamp: new Date().toISOString(),
    updatedAccount,
  };
}

// =============================================================================
// CLASS B (INSTITUTIONAL) PROVISIONING
// =============================================================================

/**
 * Create a Class B (Institutional) account.
 * Requires contract ID and minimum seats.
 */
export async function provisionClassBAccount(params: {
  contractId: string;
  requestedSeats: number;
  organizationalUnits?: OrganizationalUnit[];
}): Promise<EnforcementResult & { account?: ClassBInstitutionalAccount }> {
  // GATE 1: Contract ID required
  if (!params.contractId || params.contractId.trim() === '') {
    return {
      allowed: false,
      reason: 'Contract ID is required for Class B institutional accounts.',
      failClosed: true,
      enforcementPoint: 'backend_provisioning',
      timestamp: new Date().toISOString(),
    };
  }

  // GATE 2: Minimum seats enforcement
  if (params.requestedSeats < CLASS_B_MINIMUM_SEATS) {
    return {
      allowed: false,
      reason: `Minimum ${CLASS_B_MINIMUM_SEATS} seats required for institutional deployment. Requested: ${params.requestedSeats}`,
      failClosed: true,
      enforcementPoint: 'backend_provisioning',
      timestamp: new Date().toISOString(),
    };
  }

  // Create the account (NO namedIndividuals field - structurally impossible)
  const account: ClassBInstitutionalAccount = {
    deploymentClass: 'class_b_institutional',
    minimumSeats: params.requestedSeats,
    organizationalUnits: params.organizationalUnits || [],
    contractId: params.contractId,
    termsVersion: TERMS_VERSION_CLASS_B,
    createdAt: new Date().toISOString(),
    // NOTICE: No namedIndividuals, no bundleSize - these do not exist
  };

  return {
    allowed: true,
    reason: 'Class B institutional account provisioned',
    failClosed: false,
    enforcementPoint: 'backend_provisioning',
    timestamp: new Date().toISOString(),
    account,
  };
}

/**
 * Add an organizational unit to a Class B account.
 */
export function addOrganizationalUnit(
  account: ClassBInstitutionalAccount,
  unit: Omit<OrganizationalUnit, 'activeSignalCount' | 'createdAt'>
): ClassBInstitutionalAccount {
  const newUnit: OrganizationalUnit = {
    ...unit,
    activeSignalCount: 0,
    createdAt: new Date().toISOString(),
  };

  return {
    ...account,
    organizationalUnits: [...account.organizationalUnits, newUnit],
  };
}

// =============================================================================
// CONSENT LOGGING (CLASS A ONLY)
// =============================================================================

/**
 * Log consent acknowledgment for Class A group creation.
 * This is a legal requirement.
 */
export function createConsentRecord(params: {
  userId: string;
  groupId: string;
  ipAddress?: string;
  userAgent?: string;
}): ClassAConsentRecord {
  return {
    userId: params.userId,
    groupId: params.groupId,
    consentType: 'explicit_acknowledgment',
    acknowledgmentText:
      'I understand that this group is for voluntary capacity sharing among trusted individuals. ' +
      'Participation is not contingent on employment or any other obligation. ' +
      'All members can leave at any time without consequence.',
    acknowledgedAt: new Date().toISOString(),
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };
}

// =============================================================================
// CROSS-CLASS VALIDATION
// =============================================================================

/**
 * Validate that an account is Class A before allowing relational features.
 */
export function assertClassA(
  account: DeploymentAccount
): asserts account is ClassARelationalAccount {
  if (account.deploymentClass !== 'class_a_relational') {
    throw new Error(
      'ENFORCEMENT VIOLATION: This feature is only available for Class A (Relational) accounts. ' +
      'Institutional accounts cannot access individual-level features.'
    );
  }
}

/**
 * Validate that an account is Class B before allowing institutional features.
 */
export function assertClassB(
  account: DeploymentAccount
): asserts account is ClassBInstitutionalAccount {
  if (account.deploymentClass !== 'class_b_institutional') {
    throw new Error(
      'ENFORCEMENT VIOLATION: This feature requires a Class B (Institutional) account. ' +
      'Please contact sales for enterprise deployment.'
    );
  }
}

/**
 * Check if an operation is allowed for a given deployment class.
 */
export function isOperationAllowed(
  account: DeploymentAccount,
  operation:
    | 'view_individual_data'
    | 'add_named_individual'
    | 'purchase_bundle'
    | 'view_aggregated_dashboard'
    | 'export_individual_report'
    | 'export_aggregate_report'
): boolean {
  if (account.deploymentClass === 'class_a_relational') {
    // Class A can do individual operations, but NOT institutional dashboard
    return operation !== 'view_aggregated_dashboard';
  }

  if (account.deploymentClass === 'class_b_institutional') {
    // Class B can ONLY do aggregate operations
    const allowedForClassB = [
      'view_aggregated_dashboard',
      'export_aggregate_report',
    ];
    return allowedForClassB.includes(operation);
  }

  return false;
}

// =============================================================================
// DEPLOYMENT CLASS GUARDS
// =============================================================================

/**
 * Guard that prevents any individual data from being rendered in Class B.
 * This is the final enforcement layer.
 */
export function guardAgainstIndividualData<T extends Record<string, unknown>>(
  account: DeploymentAccount,
  data: T,
  individualFields: (keyof T)[]
): T | null {
  if (account.deploymentClass === 'class_a_relational') {
    // Class A can see everything
    return data;
  }

  // Class B: Strip all individual fields
  if (account.deploymentClass === 'class_b_institutional') {
    const sanitized = { ...data };

    for (const field of individualFields) {
      if (field in sanitized) {
        // Replace with null or remove
        (sanitized as Record<string, unknown>)[field as string] = null;
      }
    }

    // If ALL fields were individual fields, return null
    const nonNullFields = Object.values(sanitized).filter(v => v !== null);
    if (nonNullFields.length === 0) {
      return null;
    }

    return sanitized;
  }

  // FAIL CLOSED: Unknown deployment class
  return null;
}
