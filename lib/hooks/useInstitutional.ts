import { useState, useEffect, useCallback } from 'react';
import {
  InstitutionalConfig,
  InstitutionalTier,
  InstitutionalFeature,
} from '../../types';
import {
  getInstitutionalConfig,
  saveInstitutionalConfig,
  activateInstitutionalTier,
  hasFeature,
  isEnterpriseMode,
} from '../storage';

interface UseInstitutionalReturn {
  config: InstitutionalConfig | null;
  isLoading: boolean;
  tier: InstitutionalTier;
  isEnterprise: boolean;
  isPilot: boolean;
  isFamily: boolean;
  hasExecutiveReports: boolean;
  hasExtendedHistory: boolean;
  hasAdvancedSharing: boolean;
  hasAuditTrail: boolean;
  hasSensoryAlerts: boolean;
  hasComplianceExport: boolean;
  checkFeature: (feature: InstitutionalFeature) => boolean;
  activateTier: (
    tier: InstitutionalTier,
    orgDetails?: { orgId: string; orgName: string; licenseExpiresAt?: number }
  ) => Promise<void>;
  updateConfig: (updates: Partial<InstitutionalConfig>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useInstitutional(): UseInstitutionalReturn {
  const [config, setConfig] = useState<InstitutionalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await getInstitutionalConfig();
      setConfig(cfg);
    } catch (error) {
      console.error('[Orbital] Failed to load institutional config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const activateTier = useCallback(
    async (
      tier: InstitutionalTier,
      orgDetails?: { orgId: string; orgName: string; licenseExpiresAt?: number }
    ) => {
      const newConfig = await activateInstitutionalTier(tier, orgDetails);
      setConfig(newConfig);
    },
    []
  );

  const updateConfig = useCallback(async (updates: Partial<InstitutionalConfig>) => {
    await saveInstitutionalConfig(updates);
    await loadConfig();
  }, [loadConfig]);

  const checkFeature = useCallback(
    (feature: InstitutionalFeature): boolean => {
      if (!config) return false;
      return hasFeature(config, feature);
    },
    [config]
  );

  const tier = config?.tier || 'personal';
  const isEnterprise = config ? isEnterpriseMode(config) : false;

  return {
    config,
    isLoading,
    tier,
    isEnterprise,
    isPilot: tier === 'pilot',
    isFamily: tier === 'family',
    hasExecutiveReports: checkFeature('executive_reports'),
    hasExtendedHistory: checkFeature('extended_history'),
    hasAdvancedSharing: checkFeature('advanced_sharing'),
    hasAuditTrail: checkFeature('audit_trail'),
    hasSensoryAlerts: checkFeature('sensory_alerts'),
    hasComplianceExport: checkFeature('compliance_export'),
    checkFeature,
    activateTier,
    updateConfig,
    refresh: loadConfig,
  };
}
