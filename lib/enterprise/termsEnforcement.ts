/**
 * Terms & In-Product Legal Enforcement
 *
 * Separate Terms of Use:
 * - Class A Terms (Relational)
 * - Class B Terms (Institutional)
 *
 * In-App Reinforcement:
 * - Institutional Dashboard Header
 * - Relational Group Creation Consent
 */

import {
  DeploymentClass,
  TermsAcceptance,
  ClassAConsentRecord,
  TERMS_VERSION_CLASS_A,
  TERMS_VERSION_CLASS_B,
} from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  TERMS_ACCEPTANCE: '@orbital:terms_acceptance_v2',
  CONSENT_RECORDS: '@orbital:consent_records',
} as const;

// =============================================================================
// TERMS CONTENT
// =============================================================================

/**
 * Class A (Relational) Terms - Key Provisions
 */
export const CLASS_A_TERMS = {
  version: TERMS_VERSION_CLASS_A,
  title: 'Orbital Relational Terms of Use',
  keyProvisions: [
    'Participation in any Orbital group is entirely voluntary.',
    'Your capacity signals are shared only with individuals you explicitly approve.',
    'Participation must never be contingent on employment, education, or any other obligation.',
    'You may leave any group at any time without consequence.',
    'Your data remains yours. You can export or delete it at any time.',
    'Orbital will never sell your individual data to third parties.',
  ],
  acknowledgmentRequired: true,
  prohibitions: [
    'Employment-contingent monitoring is strictly prohibited.',
    'Using Orbital to surveil employees without explicit voluntary consent is prohibited.',
    'Coercing participation in any form is prohibited.',
  ],
} as const;

/**
 * Class B (Institutional) Terms - Key Provisions
 */
export const CLASS_B_TERMS = {
  version: TERMS_VERSION_CLASS_B,
  title: 'Orbital Institutional Terms of Use',
  keyProvisions: [
    'All data displayed is aggregated and anonymized.',
    'Individual identities are never visible in any dashboard or report.',
    'Minimum participant thresholds (K-anonymity) are enforced at all times.',
    'Data cannot be used to identify, evaluate, or take action against individuals.',
    'This tool is for organizational capacity planning only.',
    'Individual performance assessment using this data is prohibited.',
  ],
  dataHandling: [
    'Signals are delayed by 5 minutes to prevent temporal inference.',
    'Views with fewer than 5 participants show "Insufficient Data".',
    'Individual notes and free-text fields are not available in institutional deployments.',
    'Exports comply with K-anonymity requirements.',
  ],
  contractRequired: true,
} as const;

// =============================================================================
// DASHBOARD HEADERS (IN-PRODUCT REINFORCEMENT)
// =============================================================================

/**
 * Institutional Dashboard Header - REQUIRED on every dashboard view.
 */
export const INSTITUTIONAL_DASHBOARD_HEADER = {
  text: 'This dashboard displays anonymized, aggregated capacity signals. Individual identities are never visible.',
  style: 'banner' as const,
  dismissible: false, // CANNOT be dismissed
  color: '#3B82F6', // Blue - informational
} as const;

/**
 * Relational Group Header - Shown when viewing shared groups.
 */
export const RELATIONAL_GROUP_HEADER = {
  text: 'This group shows capacity signals from members who have explicitly chosen to share with you.',
  style: 'subtle' as const,
  dismissible: true,
  color: '#10B981', // Green - consent-based
} as const;

// =============================================================================
// CONSENT ACKNOWLEDGMENT (CLASS A ONLY)
// =============================================================================

/**
 * Consent text that must be acknowledged when creating a Class A group.
 */
export const GROUP_CREATION_CONSENT_TEXT =
  'I understand that:\n\n' +
  '• All members of this group are participating voluntarily\n' +
  '• Participation is not contingent on employment or any other obligation\n' +
  '• Members can leave at any time without consequence\n' +
  '• I will not use this group for performance monitoring or surveillance\n\n' +
  'By creating this group, I agree to these terms.';

/**
 * Log consent acknowledgment for group creation.
 */
export async function logGroupCreationConsent(params: {
  userId: string;
  groupId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<ClassAConsentRecord> {
  const record: ClassAConsentRecord = {
    userId: params.userId,
    groupId: params.groupId,
    consentType: 'explicit_acknowledgment',
    acknowledgmentText: GROUP_CREATION_CONSENT_TEXT,
    acknowledgedAt: new Date().toISOString(),
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };

  // Store consent record
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.CONSENT_RECORDS);
    const records: ClassAConsentRecord[] = existing ? JSON.parse(existing) : [];
    records.push(record);
    await AsyncStorage.setItem(STORAGE_KEYS.CONSENT_RECORDS, JSON.stringify(records));
  } catch {
    // Log failure but don't block - consent was given
    if (__DEV__) console.error('[TermsEnforcement] Failed to store consent record');
  }

  return record;
}

/**
 * Get all consent records for a user.
 */
export async function getConsentRecords(userId: string): Promise<ClassAConsentRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CONSENT_RECORDS);
    if (!data) return [];

    const records: ClassAConsentRecord[] = JSON.parse(data);
    return records.filter(r => r.userId === userId);
  } catch {
    return [];
  }
}

// =============================================================================
// TERMS ACCEPTANCE
// =============================================================================

/**
 * Check if user has accepted terms for a deployment class.
 */
export async function hasAcceptedTerms(
  userId: string,
  deploymentClass: DeploymentClass
): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTANCE);
    if (!data) return false;

    const acceptances: TermsAcceptance[] = JSON.parse(data);
    const requiredVersion =
      deploymentClass === 'class_a_relational'
        ? TERMS_VERSION_CLASS_A
        : TERMS_VERSION_CLASS_B;

    return acceptances.some(
      a =>
        a.userId === userId &&
        a.deploymentClass === deploymentClass &&
        a.termsVersion === requiredVersion
    );
  } catch {
    return false;
  }
}

/**
 * Record terms acceptance.
 */
export async function recordTermsAcceptance(params: {
  userId: string;
  deploymentClass: DeploymentClass;
  termsDocumentHash: string;
}): Promise<TermsAcceptance> {
  const termsVersion =
    params.deploymentClass === 'class_a_relational'
      ? TERMS_VERSION_CLASS_A
      : TERMS_VERSION_CLASS_B;

  const acceptance: TermsAcceptance = {
    userId: params.userId,
    deploymentClass: params.deploymentClass,
    termsVersion,
    acceptedAt: new Date().toISOString(),
    termsDocumentHash: params.termsDocumentHash,
  };

  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTANCE);
    const acceptances: TermsAcceptance[] = existing ? JSON.parse(existing) : [];
    acceptances.push(acceptance);
    await AsyncStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTANCE, JSON.stringify(acceptances));
  } catch {
    if (__DEV__) console.error('[TermsEnforcement] Failed to store terms acceptance');
  }

  return acceptance;
}

/**
 * Get required terms version for a deployment class.
 */
export function getRequiredTermsVersion(deploymentClass: DeploymentClass): string {
  return deploymentClass === 'class_a_relational'
    ? TERMS_VERSION_CLASS_A
    : TERMS_VERSION_CLASS_B;
}

/**
 * Get terms content for a deployment class.
 */
export function getTermsContent(deploymentClass: DeploymentClass): typeof CLASS_A_TERMS | typeof CLASS_B_TERMS {
  return deploymentClass === 'class_a_relational' ? CLASS_A_TERMS : CLASS_B_TERMS;
}

// =============================================================================
// ENFORCEMENT GATES
// =============================================================================

/**
 * Gate that requires terms acceptance before proceeding.
 */
export async function requireTermsAcceptance(
  userId: string,
  deploymentClass: DeploymentClass
): Promise<{ allowed: boolean; reason: string }> {
  const hasAccepted = await hasAcceptedTerms(userId, deploymentClass);

  if (!hasAccepted) {
    return {
      allowed: false,
      reason: `Terms acceptance required for ${deploymentClass}. Please review and accept the terms to continue.`,
    };
  }

  return {
    allowed: true,
    reason: 'Terms accepted',
  };
}

/**
 * Gate that requires consent acknowledgment before group creation.
 */
export async function requireGroupCreationConsent(
  userId: string,
  groupId: string
): Promise<{ allowed: boolean; consentRequired: boolean }> {
  const records = await getConsentRecords(userId);
  const hasConsent = records.some(r => r.groupId === groupId);

  if (!hasConsent) {
    return {
      allowed: false,
      consentRequired: true,
    };
  }

  return {
    allowed: true,
    consentRequired: false,
  };
}

// =============================================================================
// ANTI-SCOPE CREEP ENFORCEMENT
// =============================================================================

/**
 * Fields that are PROHIBITED in institutional schemas.
 * This list is enforced at the schema level.
 */
export const PROHIBITED_INSTITUTIONAL_FIELDS = [
  'individualNotes',
  'personalNotes',
  'notes',
  'performanceScore',
  'performanceRating',
  'evaluation',
  'assessment',
  'freeTextCommentary',
  'commentary',
  'userName',
  'userFullName',
  'firstName',
  'lastName',
  'userAvatar',
  'avatarUrl',
  'userEmail',
  'email',
  'individualTimeline',
  'personalTimeline',
  'employeeId',
  'staffId',
] as const;

/**
 * Check if a field name is prohibited in institutional contexts.
 */
export function isProhibitedInstitutionalField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase();
  return PROHIBITED_INSTITUTIONAL_FIELDS.some(
    prohibited => normalized.includes(prohibited.toLowerCase())
  );
}

/**
 * Validate a schema object against institutional prohibitions.
 */
export function validateInstitutionalSchema(
  schemaFields: string[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const field of schemaFields) {
    if (isProhibitedInstitutionalField(field)) {
      violations.push(field);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// =============================================================================
// LEGAL NOTICES
// =============================================================================

/**
 * Privacy notice for institutional users.
 */
export const INSTITUTIONAL_PRIVACY_NOTICE = {
  title: 'Your Privacy in Orbital',
  sections: [
    {
      heading: 'What We Collect',
      content:
        'We collect only anonymized capacity signals. Your identity is never linked to your signals in any report or dashboard.',
    },
    {
      heading: 'K-Anonymity Protection',
      content:
        'Views with fewer than 5 participants are automatically suppressed. Your data is never shown in isolation.',
    },
    {
      heading: 'No Individual Tracking',
      content:
        'Your employer/organization cannot see your individual signals, notes, or patterns. Only aggregate trends are visible.',
    },
    {
      heading: 'Your Rights',
      content:
        'You can request a copy of your data or request deletion at any time. Contact privacy@orbitalhealth.app.',
    },
  ],
} as const;

/**
 * Get privacy notice for display.
 */
export function getPrivacyNotice(): typeof INSTITUTIONAL_PRIVACY_NOTICE {
  return INSTITUTIONAL_PRIVACY_NOTICE;
}
