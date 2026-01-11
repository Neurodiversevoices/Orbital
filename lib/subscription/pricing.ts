/**
 * Orbital Pricing Configuration — FINAL LOCK (January 2026)
 *
 * Single source of truth for all subscription tiers and QCR artifacts.
 *
 * CLASS A SUBSCRIPTION PLANS:
 * - Individual: $29/mo | $290/yr (private use, no shared visibility)
 * - Circle: $79/mo | $790/yr (5 seats, mesh visibility, +$10/mo per expansion)
 * - 10-Seat Bundle: $399/mo | $3,990/yr (includes Admin Dashboard)
 * - 25-Seat Bundle: $899/mo | $8,990/yr (includes Admin Dashboard)
 *
 * QCR (PDF ARTIFACTS):
 * - Individual QCR: $149 one-time
 * - Circle QCR: $299 one-time
 * - Bundle QCR: $499 one-time
 *
 * CHECKOUT RULES:
 * - Annual plans are DEFAULT-SELECTED
 * - Monthly is secondary option
 * - Upgrades allowed, silent downgrades BLOCKED
 */

// =============================================================================
// PRODUCT IDENTIFIERS (RevenueCat / App Store Connect)
// =============================================================================

export const PRODUCT_IDS = {
  // Individual (Solo / Lone Wolf)
  INDIVIDUAL_MONTHLY: 'orbital_individual_monthly',
  INDIVIDUAL_ANNUAL: 'orbital_individual_annual',

  // Circle (5 seats included)
  CIRCLE_MONTHLY: 'orbital_circle_monthly',
  CIRCLE_ANNUAL: 'orbital_circle_annual',

  // Circle Expansion Seats
  CIRCLE_EXPANSION_MONTHLY: 'orbital_circle_expansion_monthly',
  CIRCLE_EXPANSION_ANNUAL: 'orbital_circle_expansion_annual',

  // Bundles (Class A, Consented, Named)
  BUNDLE_10_MONTHLY: 'orbital_bundle_10_monthly',
  BUNDLE_10_ANNUAL: 'orbital_bundle_10_annual',
  BUNDLE_25_MONTHLY: 'orbital_bundle_25_monthly',
  BUNDLE_25_ANNUAL: 'orbital_bundle_25_annual',

  // QCR (PDF Artifacts — One-Time Purchase)
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
    maxSignalsPerMonth: 10,
    maxPatternHistoryDays: 7,
  },
} as const;

// =============================================================================
// ENTITLEMENT IDENTIFIERS (RevenueCat)
// =============================================================================

export const ENTITLEMENTS = {
  // Plan entitlements
  INDIVIDUAL: 'individual_access',
  CIRCLE: 'circle_access',
  BUNDLE_10: 'bundle_10_access',
  BUNDLE_25: 'bundle_25_access',

  // Feature entitlements
  ADMIN_DASHBOARD: 'admin_dashboard',
  SHARED_VISIBILITY: 'shared_visibility',

  // QCR entitlements
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
  // INDIVIDUAL (Solo / Lone Wolf)
  // ===========================================================================
  individual: {
    id: 'individual',
    name: 'Individual',
    shortName: 'Solo',
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
    entitlements: [ENTITLEMENTS.INDIVIDUAL],
    hasSharedVisibility: false,
    hasAdminDashboard: false,
    isBundle: false,
    productIds: {
      monthly: PRODUCT_IDS.INDIVIDUAL_MONTHLY,
      annual: PRODUCT_IDS.INDIVIDUAL_ANNUAL,
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
  // 10-SEAT BUNDLE (Class A, Consented, Named)
  // ===========================================================================
  bundle_10: {
    id: 'bundle_10',
    name: '10-Seat Bundle',
    shortName: 'Bundle 10',
    description: 'Program-level capacity tracking with Admin Dashboard',
    pricing: {
      monthly: 399,
      annual: 3990,
      annualSavingsPercent: 17,
    },
    seats: 10,
    features: [
      '10 seats included',
      'Admin Dashboard (hub visibility)',
      'Named individuals with consent',
      'Program-level insights',
      'Aggregate reporting',
      'Still Class A (NOT Institutional)',
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
      monthly: PRODUCT_IDS.BUNDLE_10_MONTHLY,
      annual: PRODUCT_IDS.BUNDLE_10_ANNUAL,
    },
  },

  // ===========================================================================
  // 25-SEAT BUNDLE (Class A, Consented, Named)
  // ===========================================================================
  bundle_25: {
    id: 'bundle_25',
    name: '25-Seat Bundle',
    shortName: 'Bundle 25',
    description: 'Extended program capacity with full admin capabilities',
    pricing: {
      monthly: 899,
      annual: 8990,
      annualSavingsPercent: 17,
    },
    seats: 25,
    features: [
      '25 seats included',
      'Admin Dashboard (hub visibility)',
      'Named individuals with consent',
      'Program-level insights',
      'Aggregate reporting',
      'Priority support',
      'Still Class A (NOT Institutional)',
    ],
    entitlements: [
      ENTITLEMENTS.BUNDLE_25,
      ENTITLEMENTS.SHARED_VISIBILITY,
      ENTITLEMENTS.ADMIN_DASHBOARD,
    ],
    hasSharedVisibility: true,
    hasAdminDashboard: true,
    isBundle: true,
    productIds: {
      monthly: PRODUCT_IDS.BUNDLE_25_MONTHLY,
      annual: PRODUCT_IDS.BUNDLE_25_ANNUAL,
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
