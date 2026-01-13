/**
 * Orbital Access Control Module
 *
 * Centralized entitlement checking for all subscription tiers,
 * sponsor codes, bundles, and org mode bypass.
 */

export * from './types';
export * from './entitlements';
export { validateSponsorCode, generateTestCode, clearRedeemedCodes } from './sponsorCodes';

// QA Free Mode — Founder testing override (legacy)
export {
  initializeQAFreeMode,
  isQAFreeModeEnabled,
  isQAFreeModeInitialized,
  enableQAFreeMode,
  disableQAFreeMode,
  toggleQAFreeMode,
  shouldOverrideEntitlement,
  overrideGrantedEntitlements,
  getQAFreeModeStatus,
  QA_FREE_MODE_RESTRICTIONS,
  QA_FREE_MODE_LIMITS,
} from './qaFreeMode';

// FREE USER VIEW — Hard override for testing real user experience
export {
  initializeForcedRoleView,
  getForcedRole,
  isForcedRoleInitialized,
  isFreeUserViewActive,
  enableFreeUserView,
  disableFreeUserView,
  setForcedRole,
  shouldBlockOrgBypass,
  getOverriddenBaseTier,
  getOverriddenFeatures,
  shouldHideRoute,
  shouldShowOrganizationTab,
  shouldShowBriefingsOrgGlobal,
  shouldShowSentinelDemo,
  shouldShowCCIIssuance,
  getForcedRoleViewStatus,
  getFreeUserViewBanner,
  FREE_ROLE_RESTRICTIONS,
} from './forcedRoleView';
export type { ForcedRole } from './forcedRoleView';
