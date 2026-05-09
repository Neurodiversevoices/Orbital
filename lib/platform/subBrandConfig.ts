/**
 * Orbital Platform — Sub-Brand Configurations
 *
 * Static configuration for each of the 6 Orbital sub-brands. The active
 * config is exposed at runtime via `SubBrandProvider` + `useTrustPosture`.
 *
 * Accent colors are drawn from the canonical capacity spectrum:
 *   crimson #DC2626 → amber #F59E0B → teal #2DD4BF → cyan #06B6D4
 * NO orange. Personal/Health share teal as their human-trust default.
 */

import type { SubBrand, SubBrandConfig } from './types';

// =============================================================================
// INDIVIDUAL CONFIGS
// =============================================================================

export const PERSONAL_CONFIG: SubBrandConfig = {
  id: 'personal',
  label: 'Personal',
  tagline: 'Your capacity, your clarity.',
  posture: {
    memoryDefault: 'off',
    auditLogging: false,
    complianceMode: 'none',
    tenancyIsolation: false,
  },
  themeAccent: '#2DD4BF',
};

export const WORKSPACE_CONFIG: SubBrandConfig = {
  id: 'workspace',
  label: 'Workspace',
  tagline: 'Team capacity, without the surveillance.',
  posture: {
    memoryDefault: 'off',
    auditLogging: true,
    complianceMode: 'none',
    tenancyIsolation: true,
  },
  themeAccent: '#06B6D4',
};

export const ENTERPRISE_CONFIG: SubBrandConfig = {
  id: 'enterprise',
  label: 'Enterprise',
  tagline: 'Org-wide capacity intelligence with SOC 2 controls.',
  posture: {
    memoryDefault: 'off',
    auditLogging: true,
    complianceMode: 'soc2',
    tenancyIsolation: true,
  },
  themeAccent: '#06B6D4',
};

export const HEALTH_CONFIG: SubBrandConfig = {
  id: 'health',
  label: 'Health',
  tagline: 'Clinically-grounded capacity, HIPAA-aligned.',
  posture: {
    memoryDefault: 'off',
    auditLogging: true,
    complianceMode: 'hipaa',
    tenancyIsolation: true,
  },
  themeAccent: '#2DD4BF',
};

export const EDU_CONFIG: SubBrandConfig = {
  id: 'edu',
  label: 'Education',
  tagline: 'Student capacity, with FERPA-grade guardrails.',
  posture: {
    memoryDefault: 'off',
    auditLogging: true,
    complianceMode: 'ferpa',
    tenancyIsolation: true,
  },
  themeAccent: '#F59E0B',
};

export const GOV_CONFIG: SubBrandConfig = {
  id: 'gov',
  label: 'Government',
  tagline: 'Mission-critical capacity, FedRAMP-aligned.',
  posture: {
    memoryDefault: 'off',
    auditLogging: true,
    complianceMode: 'fedramp',
    tenancyIsolation: true,
  },
  themeAccent: '#DC2626',
};

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Lookup table — keyed by SubBrand id.
 * Use this when you only have a string id and need the full config.
 */
export const SUB_BRAND_CONFIGS: Record<SubBrand, SubBrandConfig> = {
  personal: PERSONAL_CONFIG,
  workspace: WORKSPACE_CONFIG,
  enterprise: ENTERPRISE_CONFIG,
  health: HEALTH_CONFIG,
  edu: EDU_CONFIG,
  gov: GOV_CONFIG,
};

/**
 * Ordered list — for picker UIs that want a stable, marketing-aligned order.
 */
export const SUB_BRAND_ORDER: ReadonlyArray<SubBrand> = [
  'personal',
  'workspace',
  'enterprise',
  'health',
  'edu',
  'gov',
] as const;

/**
 * The default brand when no preference has been persisted.
 */
export const DEFAULT_SUB_BRAND: SubBrand = 'personal';

/**
 * Convenience: resolve a SubBrand id to its config, falling back to default.
 */
export function getSubBrandConfig(id: SubBrand | null | undefined): SubBrandConfig {
  if (!id) return SUB_BRAND_CONFIGS[DEFAULT_SUB_BRAND];
  return SUB_BRAND_CONFIGS[id] ?? SUB_BRAND_CONFIGS[DEFAULT_SUB_BRAND];
}
