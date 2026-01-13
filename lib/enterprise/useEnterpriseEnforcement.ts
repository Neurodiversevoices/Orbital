/**
 * Enterprise Enforcement Hook
 *
 * Provides React integration for enterprise hardening enforcement points.
 * This hook must be used at signup, checkout, and API boundaries.
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DeploymentClass,
  DeploymentAccount,
  EnforcementResult,
  DomainCheckResult,
} from './types';
import {
  checkDomainRestriction,
  enforceAtSignup,
  enforceAtCheckout,
  enforceAtAPI,
  initializeRestrictedDomainRegistry,
} from './restrictedDomains';
import {
  determineDeploymentClass,
  provisionClassAAccount,
  provisionClassBAccount,
} from './deploymentClass';
import {
  hasAcceptedTerms,
  recordTermsAcceptance,
  requireTermsAcceptance,
  logGroupCreationConsent,
} from './termsEnforcement';
import { processAgeOnboarding, createAgeCohortRecord } from './ageCohort';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  DEPLOYMENT_ACCOUNT: '@orbital:deployment_account',
  AGE_COHORT: '@orbital:age_cohort',
} as const;

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseEnterpriseEnforcementReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  deploymentClass: DeploymentClass | null;
  account: DeploymentAccount | null;

  // Domain checking
  checkDomain: (email: string) => Promise<DomainCheckResult>;

  // Signup enforcement
  enforceSignup: (email: string) => Promise<EnforcementResult>;

  // Checkout enforcement
  enforceCheckout: (email: string, productType: 'bundle' | 'institutional') => Promise<EnforcementResult>;

  // Account provisioning
  provisionAccount: (params: {
    email: string;
    bundleSize?: 5 | 10 | 20 | 50;
    contractId?: string;
    requestedSeats?: number;
    consentAcknowledged?: boolean;
  }) => Promise<EnforcementResult & { account?: DeploymentAccount }>;

  // Terms enforcement
  checkTermsAcceptance: (userId: string) => Promise<boolean>;
  acceptTerms: (userId: string, termsDocumentHash: string) => Promise<void>;

  // Consent logging (Class A only)
  logConsent: (userId: string, groupId: string) => Promise<void>;

  // Age processing
  processAge: (yearOfBirth: number | null) => Promise<void>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useEnterpriseEnforcement(): UseEnterpriseEnforcementReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deploymentClass, setDeploymentClass] = useState<DeploymentClass | null>(null);
  const [account, setAccount] = useState<DeploymentAccount | null>(null);

  // Initialize on mount
  useEffect(() => {
    async function init() {
      try {
        await initializeRestrictedDomainRegistry();

        // Load existing account if present
        const storedAccount = await AsyncStorage.getItem(STORAGE_KEYS.DEPLOYMENT_ACCOUNT);
        if (storedAccount) {
          const parsed = JSON.parse(storedAccount) as DeploymentAccount;
          setAccount(parsed);
          setDeploymentClass(parsed.deploymentClass);
        }

        setIsInitialized(true);
      } catch {
        if (__DEV__) console.error('[EnterpriseEnforcement] Initialization failed');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Domain check
  const checkDomain = useCallback(async (email: string): Promise<DomainCheckResult> => {
    return checkDomainRestriction(email);
  }, []);

  // Signup enforcement
  const enforceSignup = useCallback(async (email: string): Promise<EnforcementResult> => {
    setIsLoading(true);
    try {
      const result = await enforceAtSignup(email);

      if (result.allowed) {
        const detectedClass = await determineDeploymentClass(email);
        setDeploymentClass(detectedClass);
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Checkout enforcement
  const enforceCheckout = useCallback(async (
    email: string,
    productType: 'bundle' | 'institutional'
  ): Promise<EnforcementResult> => {
    setIsLoading(true);
    try {
      // First check domain restriction
      const domainResult = await enforceAtCheckout(email);
      if (!domainResult.allowed) {
        return domainResult;
      }

      // Then check if product type matches deployment class
      const detectedClass = await determineDeploymentClass(email);

      if (productType === 'bundle' && detectedClass === 'class_b_institutional') {
        return {
          allowed: false,
          reason: 'Bundle purchases are not available for institutional accounts. Please contact sales.',
          failClosed: true,
          enforcementPoint: 'checkout_flow',
          timestamp: new Date().toISOString(),
        };
      }

      if (productType === 'institutional' && detectedClass === 'class_a_relational') {
        return {
          allowed: false,
          reason: 'Institutional deployment requires enterprise agreement. Please contact sales.',
          failClosed: true,
          enforcementPoint: 'checkout_flow',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        allowed: true,
        reason: 'Checkout permitted',
        failClosed: false,
        enforcementPoint: 'checkout_flow',
        timestamp: new Date().toISOString(),
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Account provisioning
  const provisionAccount = useCallback(async (params: {
    email: string;
    bundleSize?: 5 | 10 | 20 | 50;
    contractId?: string;
    requestedSeats?: number;
    consentAcknowledged?: boolean;
  }): Promise<EnforcementResult & { account?: DeploymentAccount }> => {
    setIsLoading(true);
    try {
      const detectedClass = await determineDeploymentClass(params.email);

      if (detectedClass === 'class_a_relational') {
        if (!params.bundleSize) {
          return {
            allowed: false,
            reason: 'Bundle size required for Class A account',
            failClosed: true,
            enforcementPoint: 'backend_provisioning',
            timestamp: new Date().toISOString(),
          };
        }

        const result = await provisionClassAAccount({
          ownerId: params.email, // Would be actual user ID in production
          bundleSize: params.bundleSize,
          consentAcknowledged: params.consentAcknowledged || false,
          email: params.email,
        });

        if (result.allowed && result.account) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.DEPLOYMENT_ACCOUNT,
            JSON.stringify(result.account)
          );
          setAccount(result.account);
          setDeploymentClass('class_a_relational');
        }

        return result;
      }

      if (detectedClass === 'class_b_institutional') {
        if (!params.contractId || !params.requestedSeats) {
          return {
            allowed: false,
            reason: 'Contract ID and seat count required for Class B account',
            failClosed: true,
            enforcementPoint: 'backend_provisioning',
            timestamp: new Date().toISOString(),
          };
        }

        const result = await provisionClassBAccount({
          contractId: params.contractId,
          requestedSeats: params.requestedSeats,
        });

        if (result.allowed && result.account) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.DEPLOYMENT_ACCOUNT,
            JSON.stringify(result.account)
          );
          setAccount(result.account);
          setDeploymentClass('class_b_institutional');
        }

        return result;
      }

      return {
        allowed: false,
        reason: 'Unknown deployment class',
        failClosed: true,
        enforcementPoint: 'backend_provisioning',
        timestamp: new Date().toISOString(),
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Terms acceptance check
  const checkTermsAcceptance = useCallback(async (userId: string): Promise<boolean> => {
    if (!deploymentClass) return false;
    return hasAcceptedTerms(userId, deploymentClass);
  }, [deploymentClass]);

  // Accept terms
  const acceptTerms = useCallback(async (
    userId: string,
    termsDocumentHash: string
  ): Promise<void> => {
    if (!deploymentClass) return;
    await recordTermsAcceptance({
      userId,
      deploymentClass,
      termsDocumentHash,
    });
  }, [deploymentClass]);

  // Log consent (Class A only)
  const logConsent = useCallback(async (
    userId: string,
    groupId: string
  ): Promise<void> => {
    if (deploymentClass !== 'class_a_relational') {
      throw new Error('Consent logging is only available for Class A accounts');
    }
    await logGroupCreationConsent({ userId, groupId });
  }, [deploymentClass]);

  // Process age (YOB → Cohort → Purge)
  const processAge = useCallback(async (yearOfBirth: number | null): Promise<void> => {
    const result = processAgeOnboarding(yearOfBirth);
    const record = createAgeCohortRecord(result);

    await AsyncStorage.setItem(STORAGE_KEYS.AGE_COHORT, JSON.stringify(record));

    // YOB is now purged - only cohort is stored
  }, []);

  return {
    isInitialized,
    isLoading,
    deploymentClass,
    account,
    checkDomain,
    enforceSignup,
    enforceCheckout,
    provisionAccount,
    checkTermsAcceptance,
    acceptTerms,
    logConsent,
    processAge,
  };
}

// =============================================================================
// STANDALONE ENFORCEMENT FUNCTIONS (For non-React contexts)
// =============================================================================

/**
 * Server-side signup enforcement.
 * Use this in API routes or edge functions.
 */
export async function serverEnforceSignup(email: string): Promise<EnforcementResult> {
  await initializeRestrictedDomainRegistry();
  return enforceAtSignup(email);
}

/**
 * Server-side checkout enforcement.
 * Use this in API routes or edge functions.
 */
export async function serverEnforceCheckout(email: string): Promise<EnforcementResult> {
  await initializeRestrictedDomainRegistry();
  return enforceAtCheckout(email);
}

/**
 * Server-side API enforcement.
 * Use this as middleware in API routes.
 */
export async function serverEnforceAPI(
  email: string,
  operation: string
): Promise<EnforcementResult> {
  await initializeRestrictedDomainRegistry();
  return enforceAtAPI(email, operation);
}
