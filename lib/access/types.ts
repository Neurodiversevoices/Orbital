/**
 * Orbital Access Control Types
 *
 * Centralized type definitions for entitlement system.
 * All access checks flow through this module.
 */

// =============================================================================
// TIER IDENTIFIERS
// =============================================================================

export type BaseTier = 'starter' | 'individual' | 'individual_pro';
export type FamilyAddon = 'family' | 'family_pro';
export type BundleType = 'circle_pack' | 'sponsor_pack' | 'cohort_pack';
export type SponsorSeatType = 'sponsor_seat_core' | 'sponsor_seat_pro';

export type AnyTier = BaseTier | FamilyAddon | BundleType | SponsorSeatType;

// =============================================================================
// ACCESS GRANTS
// =============================================================================

export interface AccessGrant {
  /** Unique grant ID */
  id: string;
  /** Type of access granted */
  tier: AnyTier;
  /** Source of the grant */
  source: 'iap' | 'sponsor_code' | 'bundle_code' | 'org_mode' | 'demo';
  /** When the grant was created */
  grantedAt: number;
  /** When the grant expires (null = never) */
  expiresAt: number | null;
  /** For sponsor/bundle codes: the code that was redeemed */
  redeemedCode?: string;
  /** For sponsor seats: issuing organization hint */
  issuerHint?: string;
}

export interface AccessState {
  /** All active grants */
  grants: AccessGrant[];
  /** RevenueCat entitlements (raw) */
  revenueCatEntitlements: string[];
  /** Current app mode (for bypass logic) */
  currentMode: string;
  /** Last sync timestamp */
  lastSyncAt: number;
}

// =============================================================================
// SPONSOR CODE STRUCTURE
// =============================================================================

export interface SponsorCodePayload {
  /** Version for future-proofing */
  v: 1;
  /** Tier granted: 'core' | 'pro' */
  t: 'core' | 'pro';
  /** Duration in days (typically 365) */
  d: number;
  /** Issued timestamp (Unix seconds) */
  i: number;
  /** Nonce to prevent replay (first 8 chars of UUID) */
  n: string;
  /** Optional issuer hint (org name prefix) */
  o?: string;
}

export interface SponsorCodeValidationResult {
  valid: boolean;
  error?: string;
  payload?: SponsorCodePayload;
  tier?: SponsorSeatType;
  expiresAt?: number;
}

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export interface AccessFeatures {
  /** Unlimited signals (Pro/sponsored) */
  unlimitedSignals: boolean;
  /** Full pattern history (Pro/sponsored) */
  fullPatternHistory: boolean;
  /** QSB Strategic Brief access */
  qsbAccess: boolean;
  /** Family circles feature */
  familyCircles: boolean;
  /** Family-level analytics */
  familyAnalytics: boolean;
  /** Bundle admin features */
  bundleAdmin: boolean;
  /** Executive reports */
  executiveReports: boolean;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

export const ACCESS_STORAGE_KEYS = {
  GRANTS: '@orbital/access_grants',
  REDEEMED_CODES: '@orbital/redeemed_codes',
  LAST_SYNC: '@orbital/access_last_sync',
} as const;
