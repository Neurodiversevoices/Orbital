/**
 * Orbital Pricing Configuration — FINAL LOCK (February 2026)
 *
 * Single source of truth for all B2C subscription tiers and artifacts.
 *
 * TIER LADDER (B2C): Free → Pro → Family → Family+ → Circles → CCI
 *
 * PRO (INDIVIDUAL):
 * - Pro: $29/mo | $290/yr (required for Circles/Bundles participation)
 *
 * FAMILY (standalone — full Pro features for all seats):
 * - Family:  $49/mo | $490/yr — 5 seats
 * - Family+: $69/mo | $690/yr — 8 seats
 *
 * CIRCLES (container, requires Pro for all members):
 * - Circle: $79/mo | $790/yr (5 buddies max)
 *
 * PRO BUNDLES (Annual-only, small groups & communities):
 * - 10-Seat: $2,700/yr
 * - 15-Seat: $4,000/yr
 * - 20-Seat: $5,200/yr
 *
 * ADMIN ADD-ON (optional for Circle/Bundle):
 * - Admin: $29/mo | $290/yr (read-only history access, consent-gated)
 *
 * CCI MILESTONE TIERS (one-time, by duration):
 * - 30-day:  $99  (orbital_cci_30)
 * - 60-day:  $149 (orbital_cci_60)
 * - 90-day:  $199 (orbital_cci_90)
 * - Bundle:  $349 (orbital_cci_bundle)
 *
 * CHECKOUT RULES:
 * - Annual plans are DEFAULT-SELECTED
 * - Monthly is secondary option
 * - Upgrades allowed, silent downgrades BLOCKED
 * - Bundles are ANNUAL-ONLY
 */

// =============================================================================
// PRODUCT IDENTIFIERS (RevenueCat / App Store Connect)
// =============================================================================

export const PRODUCT_IDS = {
  // Pro (Individual) - Required for Circles/Bundles
  PRO_MONTHLY: 'orbital_pro_monthly',
  PRO_ANNUAL: 'orbital_pro_annual',

  // Family — standalone, full Pro features for all seats (5 seats)
  FAMILY_MONTHLY: 'orbital_family_monthly',
  FAMILY_ANNUAL: 'orbital_family_annual',

  // Family+ — standalone, full Pro features for all seats (8 seats)
  FAMILY_PLUS_MONTHLY: 'orbital_family_plus_monthly',
  FAMILY_PLUS_ANNUAL: 'orbital_family_plus_annual',

  // Circle (5 buddies max, all must be Pro)
  CIRCLE_MONTHLY: 'orbital_circle_monthly',
  CIRCLE_ANNUAL: 'orbital_circle_annual',

  // Bundles (Annual-only, B2C groups)
  BUNDLE_10_ANNUAL: 'orbital_bundle_10_annual',
  BUNDLE_15_ANNUAL: 'orbital_bundle_15_annual',
  BUNDLE_20_ANNUAL: 'orbital_bundle_20_annual',

  // Admin Add-on (for Circle/Bundle, consent-gated)
  ADMIN_ADDON_MONTHLY: 'orbital_admin_addon_monthly',
  ADMIN_ADDON_ANNUAL: 'orbital_admin_addon_annual',

  // CCI Milestone Tiers (one-time, by duration)
  CCI_30: 'orbital_cci_30',        // $99  — 30-day report
  CCI_60: 'orbital_cci_60',        // $149 — 60-day report
  CCI_90: 'orbital_cci_90',        // $199 — 90-day report
  CCI_BUNDLE: 'orbital_cci_bundle', // $349 — full bundle

  // CCI Group (all members on one CCI)
  CCI_CIRCLE_ALL: 'orbital_cci_circle_all',  // $399 for all circle members
  CCI_BUNDLE_ALL: 'orbital_cci_bundle_all',  // $999 for all bundle members

  // Legacy IDs (keep for migration)
  INDIVIDUAL_MONTHLY: 'orbital_individual_monthly',
  INDIVIDUAL_ANNUAL: 'orbital_individual_annual',
  FAMILY_EXTRA_SEAT_MONTHLY: 'orbital_family_extra_seat_monthly',  // Legacy (removed)
  FAMILY_EXTRA_SEAT_ANNUAL: 'orbital_family_extra_seat_annual',    // Legacy (removed)
  CCI_FREE: 'orbital_cci_free',    // Legacy (replaced by CCI_90)
  CCI_PRO: 'orbital_cci_pro',      // Legacy (replaced by CCI_60)
  BUNDLE_10_MONTHLY: 'orbital_bundle_10_monthly',  // Legacy (bundles now annual-only)
  BUNDLE_25_MONTHLY: 'orbital_bundle_25_monthly',  // Legacy
  BUNDLE_25_ANNUAL: 'orbital_bundle_25_annual',    // Legacy (replaced by 15/20)
  QCR_INDIVIDUAL: 'orbital_qcr_individual',
  QCR_CIRCLE: 'orbital_qcr_circle',
  QCR_BUNDLE: 'orbital_qcr_bundle',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

// =============================================================================
// STARTER TIER (Free tier limits)
// =============================================================================

export const STARTER_TIER = {
  id: 'starter',
  name: 'Starter',
  limits: {
    maxSignalsPerMonth: Infinity,  // Unlimited signals for all users
    maxPatternHistoryDays: 7,      // Free users see 7 days; Pro unlocks full history
  },
} as const;

// =============================================================================
// ENTITLEMENT IDENTIFIERS (RevenueCat)
// =============================================================================

export const ENTITLEMENTS = {
  // B2C Tier Entitlements
  FREE: 'free_access',
  PRO: 'pro_access',              // $29/mo | $290/yr - Required for Circles/Bundles
  FAMILY: 'family_access',        // Standalone 5-seat plan, full Pro features
  FAMILY_PLUS: 'family_plus_access', // Standalone 8-seat plan, full Pro features
  CIRCLE: 'circle_access',        // 5 buddies max, all must be Pro
  BUNDLE_10: 'bundle_10_access',  // Annual-only
  BUNDLE_15: 'bundle_15_access',  // Annual-only
  BUNDLE_20: 'bundle_20_access',  // Annual-only

  // Add-on Entitlements
  ADMIN_ADDON: 'admin_addon',     // READ-ONLY history access, consent-gated

  // CCI Entitlements
  CCI_PURCHASED: 'cci_purchased', // User has purchased CCI issuance

  // Legacy entitlements (keep for migration / PRICING_TIERS compatibility)
  INDIVIDUAL: 'individual_access',
  FAMILY_EXTRA_SEAT: 'family_extra_seat',  // Legacy (per-seat add-on, removed)
  BUNDLE_25: 'bundle_25_access',       // Legacy (replaced by 15/20)
  ADMIN_DASHBOARD: 'admin_dashboard',
  SHARED_VISIBILITY: 'shared_visibility',
  QCR: 'qcr_access',
  QCR_INDIVIDUAL: 'qcr_individual',
  QCR_CIRCLE: 'qcr_circle',
  QCR_BUNDLE: 'qcr_bundle',
} as const;

export type EntitlementId = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];

// =============================================================================
// PRICING CONFIGURATION — HARD LOCK
// =============================================================================

export interface PlanPricing {
  monthly: number;
  annual: number;
  annualSavingsPercent: number;
}

export interface PricingTier {
  id: string;
  name: string;
  shortName: string;
  description: string;
  pricing: PlanPricing;
  seats: number;
  features: string[];
  entitlements: EntitlementId[];
  hasSharedVisibility: boolean;
  hasAdminDashboard: boolean;
  isBundle: boolean;
  expansionPricing?: PlanPricing; // For Circle expansion seats
  productIds: {
    monthly: ProductId;
    annual: ProductId;
  };
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  // ===========================================================================
  // INDIVIDUAL / PRO (Solo / Lone Wolf)
  // ===========================================================================
  individual: {
    id: 'individual',
    name: 'Pro',
    shortName: 'Pro',
    description: 'Private capacity tracking for personal use',
    pricing: {
      monthly: 29,
      annual: 290,
      annualSavingsPercent: 17,
    },
    seats: 1,
    features: [
      'Unlimited capacity signals',
      'Full pattern history',
      'Trend analysis',
      'Data export (CSV/PDF)',
      'Private use only',
      'No shared visibility',
    ],
    entitlements: [ENTITLEMENTS.PRO],
    hasSharedVisibility: false,
    hasAdminDashboard: false,
    isBundle: false,
    productIds: {
      monthly: PRODUCT_IDS.PRO_MONTHLY,
      annual: PRODUCT_IDS.PRO_ANNUAL,
    },
  },

  // ===========================================================================
  // FAMILY — Standalone, full Pro features for all seats (5 seats)
  // ===========================================================================
  family: {
    id: 'family',
    name: 'Family',
    shortName: 'Family',
    description: 'Full Pro for the whole household',
    pricing: {
      monthly: 49,
      annual: 490,
      annualSavingsPercent: 17,
    },
    seats: 5,
    features: [
      'Unlimited signals',
      '90-day history',
      'Cloud sync',
      'Shared household view',
      'Full Pro features for every seat',
    ],
    entitlements: [ENTITLEMENTS.FAMILY],
    hasSharedVisibility: true,
    hasAdminDashboard: false,
    isBundle: false,
    productIds: {
      monthly: PRODUCT_IDS.FAMILY_MONTHLY,
      annual: PRODUCT_IDS.FAMILY_ANNUAL,
    },
  },

  // ===========================================================================
  // FAMILY+ — Standalone, full Pro features for all seats (8 seats)
  // ===========================================================================
  family_plus: {
    id: 'family_plus',
    name: 'Family+',
    shortName: 'Family+',
    description: 'For larger or blended families',
    pricing: {
      monthly: 69,
      annual: 690,
      annualSavingsPercent: 17,
    },
    seats: 8,
    features: [
      'Unlimited signals',
      '90-day history',
      'Cloud sync',
      'Shared household view',
      'Full Pro features for every seat',
    ],
    entitlements: [ENTITLEMENTS.FAMILY_PLUS],
    hasSharedVisibility: true,
    hasAdminDashboard: false,
    isBundle: false,
    productIds: {
      monthly: PRODUCT_IDS.FAMILY_PLUS_MONTHLY,
      annual: PRODUCT_IDS.FAMILY_PLUS_ANNUAL,
    },
  },

  // ===========================================================================
  // CIRCLE (5 Seats Included)
  // ===========================================================================
  circle: {
    id: 'circle',
    name: 'Circle',
    shortName: 'Circle',
    description: 'Mesh visibility for families and trusted groups',
    pricing: {
      monthly: 79,
      annual: 790,
      annualSavingsPercent: 17,
    },
    seats: 5,
    features: [
      '5 seats included',
      'Mesh visibility (all-see-all)',
      'Named individuals',
      'Mandatory consent per member',
      'Pattern sharing',
      'Circle-level insights',
    ],
    entitlements: [ENTITLEMENTS.CIRCLE, ENTITLEMENTS.SHARED_VISIBILITY],
    hasSharedVisibility: true,
    hasAdminDashboard: false,
    isBundle: false,
    expansionPricing: {
      monthly: 10,
      annual: 100,
      annualSavingsPercent: 17,
    },
    productIds: {
      monthly: PRODUCT_IDS.CIRCLE_MONTHLY,
      annual: PRODUCT_IDS.CIRCLE_ANNUAL,
    },
  },

  // ===========================================================================
  // 10-SEAT PRO BUNDLE (ANNUAL-ONLY, small groups & communities)
  // ===========================================================================
  bundle_10: {
    id: 'bundle_10',
    name: '10 Seats',
    shortName: 'Bundle 10',
    description: 'Full Pro access for each member',
    pricing: {
      monthly: 0, // ANNUAL-ONLY
      annual: 2700,
      annualSavingsPercent: 0,
    },
    seats: 10,
    features: [
      '10 seats included',
      'Full Pro access per seat',
      'Annual billing only',
    ],
    entitlements: [
      ENTITLEMENTS.BUNDLE_10,
      ENTITLEMENTS.SHARED_VISIBILITY,
      ENTITLEMENTS.ADMIN_DASHBOARD,
    ],
    hasSharedVisibility: true,
    hasAdminDashboard: true,
    isBundle: true,
    productIds: {
      monthly: PRODUCT_IDS.BUNDLE_10_ANNUAL, // No monthly - use annual
      annual: PRODUCT_IDS.BUNDLE_10_ANNUAL,
    },
  },

  // ===========================================================================
  // 15-SEAT PRO BUNDLE (ANNUAL-ONLY, small groups & communities)
  // ===========================================================================
  bundle_15: {
    id: 'bundle_15',
    name: '15 Seats',
    shortName: 'Bundle 15',
    description: 'Full Pro access for each member',
    pricing: {
      monthly: 0, // ANNUAL-ONLY
      annual: 4000,
      annualSavingsPercent: 0,
    },
    seats: 15,
    features: [
      '15 seats included',
      'Full Pro access per seat',
      'Annual billing only',
    ],
    entitlements: [
      ENTITLEMENTS.BUNDLE_15,
      ENTITLEMENTS.SHARED_VISIBILITY,
      ENTITLEMENTS.ADMIN_DASHBOARD,
    ],
    hasSharedVisibility: true,
    hasAdminDashboard: true,
    isBundle: true,
    productIds: {
      monthly: PRODUCT_IDS.BUNDLE_15_ANNUAL, // No monthly - use annual
      annual: PRODUCT_IDS.BUNDLE_15_ANNUAL,
    },
  },

  // ===========================================================================
  // 20-SEAT PRO BUNDLE (ANNUAL-ONLY, small groups & communities)
  // ===========================================================================
  bundle_20: {
    id: 'bundle_20',
    name: '20 Seats',
    shortName: 'Bundle 20',
    description: 'Full Pro access for each member',
    pricing: {
      monthly: 0, // ANNUAL-ONLY
      annual: 5200,
      annualSavingsPercent: 0,
    },
    seats: 20,
    features: [
      '20 seats included',
      'Full Pro access per seat',
      'Annual billing only',
    ],
    entitlements: [
      ENTITLEMENTS.BUNDLE_20,
      ENTITLEMENTS.SHARED_VISIBILITY,
      ENTITLEMENTS.ADMIN_DASHBOARD,
    ],
    hasSharedVisibility: true,
    hasAdminDashboard: true,
    isBundle: true,
    productIds: {
      monthly: PRODUCT_IDS.BUNDLE_20_ANNUAL, // No monthly - use annual
      annual: PRODUCT_IDS.BUNDLE_20_ANNUAL,
    },
  },
};

// =============================================================================
// QCR (QUARTERLY CAPACITY REPORT) — PDF ARTIFACTS
// =============================================================================

export interface QCRProduct {
  id: string;
  productId: ProductId;
  name: string;
  price: number; // One-time
  scope: 'individual' | 'circle' | 'bundle';
  description: string;
  features: string[];
  requiredEntitlement: EntitlementId;
}

export const QCR_PRODUCTS: Record<string, QCRProduct> = {
  // ===========================================================================
  // INDIVIDUAL QCR ($149)
  // ===========================================================================
  qcr_individual: {
    id: 'qcr_individual',
    productId: PRODUCT_IDS.QCR_INDIVIDUAL,
    name: 'Individual QCR',
    price: 149,
    scope: 'individual',
    description: 'Personal quarterly capacity analysis',
    features: [
      'Covers one person only',
      '90-day pattern synthesis',
      'Resilience metrics',
      'Recovery velocity analysis',
      'Clinical-grade PDF export',
      'EHR-attachment ready',
    ],
    requiredEntitlement: ENTITLEMENTS.INDIVIDUAL,
  },

  // ===========================================================================
  // CIRCLE QCR ($299)
  // ===========================================================================
  qcr_circle: {
    id: 'qcr_circle',
    productId: PRODUCT_IDS.QCR_CIRCLE,
    name: 'Circle QCR',
    price: 299,
    scope: 'circle',
    description: 'Circle-wide capacity analysis with relational dynamics',
    features: [
      'Covers entire Circle (≤5 people)',
      'Relational dynamics analysis',
      'Synchronization patterns',
      'Load distribution insights',
      'Circle-level trend synthesis',
      'Individual + aggregate views',
    ],
    requiredEntitlement: ENTITLEMENTS.CIRCLE,
  },

  // ===========================================================================
  // BUNDLE QCR ($499)
  // ===========================================================================
  qcr_bundle: {
    id: 'qcr_bundle',
    productId: PRODUCT_IDS.QCR_BUNDLE,
    name: 'Bundle QCR',
    price: 499,
    scope: 'bundle',
    description: 'Program-level capacity analysis for administrators',
    features: [
      'Program-level analysis',
      'Admin-facing insights',
      'Aggregate capacity trends',
      'Load distribution by cohort',
      'Intervention timing recommendations',
      'Deterministic templates only (no open-ended AI)',
    ],
    requiredEntitlement: ENTITLEMENTS.ADMIN_DASHBOARD,
  },
};

// =============================================================================
// CHECKOUT CONFIGURATION
// =============================================================================

export const CHECKOUT_CONFIG = {
  // Annual is default-selected
  defaultBillingCycle: 'annual' as const,

  // Downgrade rules
  allowUpgrade: true,
  allowDowngrade: false, // Silent downgrades BLOCKED

  // QCR scope matching
  qcrScopeMustMatchAccount: true,

  // Bundle QCR availability
  bundleQcrRequiresAdminRole: true,
};

// =============================================================================
// B2C ADD-ON PRICING — CANONICAL SOURCE
// =============================================================================

/**
 * Pro subscription pricing (required for Circles/Bundles participation)
 */
export const PRO_PRICING = {
  monthly: 29,
  annual: 290,
  annualSavingsPercent: 17,
} as const;

/**
 * Family plan pricing (standalone — full Pro features for all seats)
 * 5 seats included
 */
export const FAMILY_PRICING = {
  monthly: 49,
  annual: 490,
  annualSavingsPercent: 17,
  seats: 5,
} as const;

/**
 * Family+ plan pricing (standalone — full Pro features for all seats)
 * 8 seats included, for larger or blended families
 */
export const FAMILY_PLUS_PRICING = {
  monthly: 69,
  annual: 690,
  annualSavingsPercent: 17,
  seats: 8,
} as const;

/**
 * Circle pricing (5 buddies max, all must be Pro)
 */
export const CIRCLE_PRICING = {
  monthly: 79,
  annual: 790,
  annualSavingsPercent: 17,
  maxBuddies: 5,
} as const;

/**
 * Pro Bundle pricing (ANNUAL-ONLY, small groups & communities)
 * Each seat = full Pro access
 */
export const BUNDLE_PRICING = {
  bundle_10: { annual: 2700, seats: 10 },
  bundle_15: { annual: 4000, seats: 15 },
  bundle_20: { annual: 5200, seats: 20 },
} as const;

/**
 * Admin add-on pricing (READ-ONLY history access, consent-gated)
 */
export const ADMIN_ADDON_PRICING = {
  monthly: 29,
  annual: 290,
  annualSavingsPercent: 17,
} as const;

/**
 * CCI milestone tier pricing (one-time, by report duration)
 */
export const CCI_PRICING = {
  thirtyDay: 99,   // 30-day report  — orbital_cci_30
  sixtyDay: 149,   // 60-day report  — orbital_cci_60
  ninetyDay: 199,  // 90-day report  — orbital_cci_90
  bundle: 349,     // Full bundle    — orbital_cci_bundle
} as const;

/**
 * CCI Group pricing (all members on one CCI)
 * - Circle: $399 for all circle members together
 * - Bundle: $999 flat rate for any bundle size
 */
export const CCI_GROUP_PRICING = {
  circleAll: 399,   // All circle members on one CCI
  bundleAll: 999,   // All bundle members on one CCI (flat)
} as const;

/**
 * Get CCI price by milestone duration
 */
export function getCCIPrice(days: 30 | 60 | 90 | 'bundle'): number {
  if (days === 30) return CCI_PRICING.thirtyDay;
  if (days === 60) return CCI_PRICING.sixtyDay;
  if (days === 90) return CCI_PRICING.ninetyDay;
  return CCI_PRICING.bundle;
}

/**
 * Get CCI product ID by milestone duration
 */
export function getCCIProductId(days: 30 | 60 | 90 | 'bundle'): ProductId {
  if (days === 30) return PRODUCT_IDS.CCI_30;
  if (days === 60) return PRODUCT_IDS.CCI_60;
  if (days === 90) return PRODUCT_IDS.CCI_90;
  return PRODUCT_IDS.CCI_BUNDLE;
}

/**
 * Get CCI group price (all members on one CCI)
 */
export function getCCIGroupPrice(type: 'circle' | 'bundle'): number {
  return type === 'circle' ? CCI_GROUP_PRICING.circleAll : CCI_GROUP_PRICING.bundleAll;
}

/**
 * Get CCI group product ID
 */
export function getCCIGroupProductId(type: 'circle' | 'bundle'): ProductId {
  return type === 'circle' ? PRODUCT_IDS.CCI_CIRCLE_ALL : PRODUCT_IDS.CCI_BUNDLE_ALL;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price for display
 */
export function formatPrice(price: number, period?: 'month' | 'year'): string {
  const formatted = price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (period === 'month') return `${formatted}/mo`;
  if (period === 'year') return `${formatted}/yr`;
  return formatted;
}

/**
 * Get tier by ID
 */
export function getTier(tierId: string): PricingTier | undefined {
  return PRICING_TIERS[tierId];
}

/**
 * Get QCR product by scope
 */
export function getQCRByScope(scope: 'individual' | 'circle' | 'bundle'): QCRProduct | undefined {
  return Object.values(QCR_PRODUCTS).find(qcr => qcr.scope === scope);
}

/**
 * Check if QCR scope matches account type
 */
export function validateQCRScope(
  qcrScope: 'individual' | 'circle' | 'bundle',
  userEntitlements: EntitlementId[]
): boolean {
  const qcr = getQCRByScope(qcrScope);
  if (!qcr) return false;
  return userEntitlements.includes(qcr.requiredEntitlement);
}

/**
 * Calculate Circle expansion cost
 */
export function calculateCircleExpansionCost(
  additionalSeats: number,
  billingCycle: 'monthly' | 'annual'
): number {
  const expansion = PRICING_TIERS.circle.expansionPricing;
  if (!expansion) return 0;

  return billingCycle === 'monthly'
    ? expansion.monthly * additionalSeats
    : expansion.annual * additionalSeats;
}

/**
 * Get all bundles
 */
export function getBundles(): PricingTier[] {
  return Object.values(PRICING_TIERS).filter(tier => tier.isBundle);
}

/**
 * Check if tier has Admin Dashboard access
 */
export function hasAdminDashboard(tierId: string): boolean {
  const tier = PRICING_TIERS[tierId];
  return tier?.hasAdminDashboard ?? false;
}

/**
 * Check if upgrade is allowed
 */
export function canUpgrade(fromTierId: string, toTierId: string): boolean {
  const from = PRICING_TIERS[fromTierId];
  const to = PRICING_TIERS[toTierId];
  if (!from || !to) return false;

  // Can always upgrade to higher pricing
  return to.pricing.monthly > from.pricing.monthly;
}

/**
 * Check if downgrade is allowed (always false per checkout rules)
 */
export function canDowngrade(_fromTierId: string, _toTierId: string): boolean {
  return CHECKOUT_CONFIG.allowDowngrade;
}
