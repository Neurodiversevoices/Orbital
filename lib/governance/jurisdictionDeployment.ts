import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  JurisdictionCode,
  JurisdictionConfig,
  JURISDICTION_CONFIGS,
  PolicyType,
  RetentionWindow,
} from '../../types';
import { logImmutableAuditEntry } from './immutableAuditLog';

const JURISDICTION_KEY = '@orbital:jurisdiction_config';
const DEPLOYMENT_FLAGS_KEY = '@orbital:deployment_flags';

interface DeploymentFlags {
  jurisdiction: JurisdictionCode;
  dataResidency: string;
  featureFlags: {
    rightToErasure: boolean;
    dataPortability: boolean;
    consentRequired: boolean;
    minorProtections: boolean;
    educationalRecords: boolean;
    healthDataHandling: boolean;
  };
  retentionConstraints: {
    allowedWindows: RetentionWindow[];
    defaultWindow: RetentionWindow;
    minWindow?: RetentionWindow;
  };
  requiredPolicies: PolicyType[];
  configuredAt: number;
  configuredBy: string;
}

// ============================================
// JURISDICTION CONFIGURATION
// ============================================

export async function getCurrentJurisdiction(): Promise<JurisdictionConfig | null> {
  const data = await AsyncStorage.getItem(JURISDICTION_KEY);
  if (!data) return null;
  const code = JSON.parse(data) as JurisdictionCode;
  return JURISDICTION_CONFIGS[code] || null;
}

export async function setJurisdiction(
  code: JurisdictionCode,
  configuredBy: string
): Promise<DeploymentFlags> {
  const config = JURISDICTION_CONFIGS[code];
  if (!config) {
    throw new Error(`Unknown jurisdiction: ${code}`);
  }

  await AsyncStorage.setItem(JURISDICTION_KEY, JSON.stringify(code));

  // Compute allowed retention windows
  const allWindows: RetentionWindow[] = ['1y', '3y', '5y', '7y', 'indefinite'];
  const allowedWindows = allWindows.filter((w) => {
    if (!config.retentionOverrides) return true;
    return config.retentionOverrides[w] !== false;
  });

  const flags: DeploymentFlags = {
    jurisdiction: code,
    dataResidency: config.dataResidency,
    featureFlags: { ...config.features },
    retentionConstraints: {
      allowedWindows,
      defaultWindow: allowedWindows.includes('3y') ? '3y' : allowedWindows[0],
      minWindow: config.features.healthDataHandling ? '3y' : undefined,
    },
    requiredPolicies: [...config.requiredDisclosures],
    configuredAt: Date.now(),
    configuredBy,
  };

  await AsyncStorage.setItem(DEPLOYMENT_FLAGS_KEY, JSON.stringify(flags));

  await logImmutableAuditEntry('config_change', {
    actorType: 'admin',
    actorRef: configuredBy,
    action: `Jurisdiction configured: ${code}`,
    metadata: {
      jurisdiction: code,
      dataResidency: config.dataResidency,
    },
  });

  return flags;
}

export async function getDeploymentFlags(): Promise<DeploymentFlags | null> {
  const data = await AsyncStorage.getItem(DEPLOYMENT_FLAGS_KEY);
  if (!data) return null;
  return JSON.parse(data);
}

// ============================================
// FEATURE FLAG CHECKS
// ============================================

export async function isFeatureEnabled(
  feature: keyof JurisdictionConfig['features']
): Promise<boolean> {
  const flags = await getDeploymentFlags();
  if (!flags) return false;
  return flags.featureFlags[feature];
}

export async function requiresConsent(): Promise<boolean> {
  return isFeatureEnabled('consentRequired');
}

export async function supportsRightToErasure(): Promise<boolean> {
  return isFeatureEnabled('rightToErasure');
}

export async function supportsDataPortability(): Promise<boolean> {
  return isFeatureEnabled('dataPortability');
}

export async function requiresMinorProtections(): Promise<boolean> {
  return isFeatureEnabled('minorProtections');
}

export async function handlesEducationalRecords(): Promise<boolean> {
  return isFeatureEnabled('educationalRecords');
}

export async function handlesHealthData(): Promise<boolean> {
  return isFeatureEnabled('healthDataHandling');
}

// ============================================
// RETENTION CONSTRAINTS
// ============================================

export async function isRetentionWindowAllowed(window: RetentionWindow): Promise<boolean> {
  const flags = await getDeploymentFlags();
  if (!flags) return true; // No jurisdiction set, allow all
  return flags.retentionConstraints.allowedWindows.includes(window);
}

export async function getDefaultRetentionWindow(): Promise<RetentionWindow> {
  const flags = await getDeploymentFlags();
  if (!flags) return '3y';
  return flags.retentionConstraints.defaultWindow;
}

export async function getAllowedRetentionWindows(): Promise<RetentionWindow[]> {
  const flags = await getDeploymentFlags();
  if (!flags) return ['1y', '3y', '5y', '7y', 'indefinite'];
  return flags.retentionConstraints.allowedWindows;
}

// ============================================
// POLICY REQUIREMENTS
// ============================================

export async function getRequiredPolicies(): Promise<PolicyType[]> {
  const flags = await getDeploymentFlags();
  if (!flags) return ['terms_of_service', 'privacy_policy', 'non_diagnostic_disclaimer'];
  return flags.requiredPolicies;
}

export async function isPolicyRequired(policyType: PolicyType): Promise<boolean> {
  const required = await getRequiredPolicies();
  return required.includes(policyType);
}

// ============================================
// DATA RESIDENCY
// ============================================

export async function getDataResidency(): Promise<string | null> {
  const flags = await getDeploymentFlags();
  if (!flags) return null;
  return flags.dataResidency;
}

// ============================================
// JURISDICTION-SPECIFIC BEHAVIOR
// ============================================

export async function getJurisdictionBehavior(): Promise<{
  showErasureOption: boolean;
  showPortabilityOption: boolean;
  requireExplicitConsent: boolean;
  showMinorWarnings: boolean;
  showEducationalDisclaimer: boolean;
  showHealthDisclaimer: boolean;
  dataResidencyNotice: string | null;
}> {
  const flags = await getDeploymentFlags();

  if (!flags) {
    return {
      showErasureOption: false,
      showPortabilityOption: true,
      requireExplicitConsent: false,
      showMinorWarnings: true,
      showEducationalDisclaimer: false,
      showHealthDisclaimer: false,
      dataResidencyNotice: null,
    };
  }

  const residencyNotices: Record<string, string> = {
    US: 'Data stored in the United States.',
    EU: 'Data stored within the European Union in compliance with GDPR.',
    UK: 'Data stored in the United Kingdom.',
    CA: 'Data stored in Canada in compliance with PIPEDA.',
    AU: 'Data stored in Australia in compliance with the Privacy Act.',
  };

  return {
    showErasureOption: flags.featureFlags.rightToErasure,
    showPortabilityOption: flags.featureFlags.dataPortability,
    requireExplicitConsent: flags.featureFlags.consentRequired,
    showMinorWarnings: flags.featureFlags.minorProtections,
    showEducationalDisclaimer: flags.featureFlags.educationalRecords,
    showHealthDisclaimer: flags.featureFlags.healthDataHandling,
    dataResidencyNotice: residencyNotices[flags.dataResidency] || null,
  };
}

// ============================================
// COMPLIANCE CHECKS
// ============================================

export async function validateJurisdictionCompliance(): Promise<{
  isCompliant: boolean;
  issues: string[];
}> {
  const flags = await getDeploymentFlags();
  const issues: string[] = [];

  if (!flags) {
    issues.push('No jurisdiction configured');
    return { isCompliant: false, issues };
  }

  // Check if required policies are in place
  // (In a real implementation, this would check against actual policy records)

  // Check retention constraints
  if (flags.featureFlags.healthDataHandling &&
      flags.retentionConstraints.allowedWindows.includes('1y')) {
    issues.push('Health data handling enabled but 1-year retention allowed');
  }

  // Check consent requirements
  if (flags.featureFlags.consentRequired) {
    // Would check if consent system is properly configured
  }

  return {
    isCompliant: issues.length === 0,
    issues,
  };
}

// ============================================
// JURISDICTION DETECTION (OPTIONAL)
// ============================================

export function detectJurisdictionFromLocale(locale: string): JurisdictionCode {
  const localeMap: Record<string, JurisdictionCode> = {
    'en-US': 'US',
    'en-GB': 'UK',
    'en-AU': 'AU',
    'en-CA': 'CA',
    'es-ES': 'EU_GDPR',
    'es-MX': 'US',
    'de-DE': 'EU_GDPR',
    'fr-FR': 'EU_GDPR',
    'it-IT': 'EU_GDPR',
  };

  return localeMap[locale] || 'US';
}
