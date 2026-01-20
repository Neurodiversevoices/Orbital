/**
 * Server-Side SKU and Price Validation
 *
 * Validates that purchase requests contain valid product IDs and
 * that the requested entitlements match the product definition.
 *
 * SECURITY: Never trust client-provided SKUs or prices.
 * All validation happens server-side against canonical definitions.
 */

// =============================================================================
// CANONICAL PRODUCT DEFINITIONS
// Server-side source of truth - client cannot modify these
// =============================================================================

export interface ProductDefinition {
  productId: string;
  entitlementId: string;
  type: 'subscription' | 'one_time';
  requiresEntitlement?: string;  // Pre-requisite entitlement
  grantsBundled?: string[];      // Additional entitlements granted
  maxQuantity?: number;          // Max quantity per purchase
}

/**
 * Canonical product catalog
 * This is the ONLY source of truth for what products exist
 */
export const PRODUCT_CATALOG: Record<string, ProductDefinition> = {
  // Pro subscriptions
  'orbital_pro_monthly': {
    productId: 'orbital_pro_monthly',
    entitlementId: 'pro_access',
    type: 'subscription',
  },
  'orbital_pro_annual': {
    productId: 'orbital_pro_annual',
    entitlementId: 'pro_access',
    type: 'subscription',
  },

  // Family subscriptions (requires Pro)
  'orbital_family_monthly': {
    productId: 'orbital_family_monthly',
    entitlementId: 'family_access',
    type: 'subscription',
    requiresEntitlement: 'pro_access',
    grantsBundled: ['pro_access'],
  },
  'orbital_family_annual': {
    productId: 'orbital_family_annual',
    entitlementId: 'family_access',
    type: 'subscription',
    requiresEntitlement: 'pro_access',
    grantsBundled: ['pro_access'],
  },

  // Family extra seats
  'orbital_family_extra_seat_monthly': {
    productId: 'orbital_family_extra_seat_monthly',
    entitlementId: 'family_extra_seat',
    type: 'subscription',
    requiresEntitlement: 'family_access',
    maxQuantity: 10,
  },
  'orbital_family_extra_seat_annual': {
    productId: 'orbital_family_extra_seat_annual',
    entitlementId: 'family_extra_seat',
    type: 'subscription',
    requiresEntitlement: 'family_access',
    maxQuantity: 10,
  },

  // Circle subscriptions
  'orbital_circle_monthly': {
    productId: 'orbital_circle_monthly',
    entitlementId: 'circle_access',
    type: 'subscription',
    grantsBundled: ['pro_access'],
  },
  'orbital_circle_annual': {
    productId: 'orbital_circle_annual',
    entitlementId: 'circle_access',
    type: 'subscription',
    grantsBundled: ['pro_access'],
  },

  // Bundles (annual only)
  'orbital_bundle_10_annual': {
    productId: 'orbital_bundle_10_annual',
    entitlementId: 'bundle_10_access',
    type: 'subscription',
    grantsBundled: ['pro_access'],
  },
  'orbital_bundle_15_annual': {
    productId: 'orbital_bundle_15_annual',
    entitlementId: 'bundle_15_access',
    type: 'subscription',
    grantsBundled: ['pro_access'],
  },
  'orbital_bundle_20_annual': {
    productId: 'orbital_bundle_20_annual',
    entitlementId: 'bundle_20_access',
    type: 'subscription',
    grantsBundled: ['pro_access'],
  },

  // Admin add-on
  'orbital_admin_addon_monthly': {
    productId: 'orbital_admin_addon_monthly',
    entitlementId: 'admin_addon',
    type: 'subscription',
    requiresEntitlement: 'pro_access',
  },
  'orbital_admin_addon_annual': {
    productId: 'orbital_admin_addon_annual',
    entitlementId: 'admin_addon',
    type: 'subscription',
    requiresEntitlement: 'pro_access',
  },

  // CCI (one-time)
  'orbital_cci_free': {
    productId: 'orbital_cci_free',
    entitlementId: 'cci_purchased',
    type: 'one_time',
  },
  'orbital_cci_pro': {
    productId: 'orbital_cci_pro',
    entitlementId: 'cci_purchased',
    type: 'one_time',
    requiresEntitlement: 'pro_access',
  },
  'orbital_cci_circle_all': {
    productId: 'orbital_cci_circle_all',
    entitlementId: 'cci_circle_purchased',
    type: 'one_time',
    requiresEntitlement: 'circle_access',
  },
  'orbital_cci_bundle_all': {
    productId: 'orbital_cci_bundle_all',
    entitlementId: 'cci_bundle_purchased',
    type: 'one_time',
  },

  // QCR (one-time)
  'orbital_qcr_individual': {
    productId: 'orbital_qcr_individual',
    entitlementId: 'qcr_individual',
    type: 'one_time',
  },
  'orbital_qcr_circle': {
    productId: 'orbital_qcr_circle',
    entitlementId: 'qcr_circle',
    type: 'one_time',
    requiresEntitlement: 'circle_access',
  },
  'orbital_qcr_bundle': {
    productId: 'orbital_qcr_bundle',
    entitlementId: 'qcr_bundle',
    type: 'one_time',
  },
};

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  product?: ProductDefinition;
}

/**
 * Validate that a product ID exists in the catalog
 */
export function validateProductId(productId: string): ValidationResult {
  if (!productId || typeof productId !== 'string') {
    return { valid: false, error: 'Missing or invalid product ID' };
  }

  const product = PRODUCT_CATALOG[productId];
  if (!product) {
    return {
      valid: false,
      error: `Unknown product ID: ${productId}`,
    };
  }

  return { valid: true, product };
}

/**
 * Validate purchase request against catalog
 * Checks product exists, prerequisites met, and no manipulation
 */
export function validatePurchaseRequest(
  productId: string,
  userEntitlements: string[] = []
): ValidationResult {
  // First validate product exists
  const productResult = validateProductId(productId);
  if (!productResult.valid) {
    return productResult;
  }

  const product = productResult.product!;

  // Check prerequisites if any
  if (product.requiresEntitlement) {
    const hasPrereq = userEntitlements.includes(product.requiresEntitlement);
    if (!hasPrereq) {
      return {
        valid: false,
        error: `Requires ${product.requiresEntitlement} entitlement`,
        product,
      };
    }
  }

  return { valid: true, product };
}

/**
 * Get the entitlement ID for a product
 * Returns null if product is unknown
 */
export function getEntitlementForProduct(productId: string): string | null {
  const product = PRODUCT_CATALOG[productId];
  return product?.entitlementId || null;
}

/**
 * Get bundled entitlements for a product
 */
export function getBundledEntitlements(productId: string): string[] {
  const product = PRODUCT_CATALOG[productId];
  return product?.grantsBundled || [];
}

/**
 * Check if product is one-time purchase
 */
export function isOneTimeProduct(productId: string): boolean {
  const product = PRODUCT_CATALOG[productId];
  return product?.type === 'one_time';
}

/**
 * Get all valid product IDs
 */
export function getAllProductIds(): string[] {
  return Object.keys(PRODUCT_CATALOG);
}
