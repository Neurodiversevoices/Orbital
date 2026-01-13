/**
 * Mock Checkout System
 *
 * STUB IMPLEMENTATION: No real banking yet.
 * All purchases "work" end-to-end by simulating success and granting entitlements.
 *
 * When Stripe is integrated, replace the `executePurchase` implementation
 * while keeping the same interface.
 *
 * INTEGRATION POINT: Replace `simulatePurchase` with Stripe Checkout Session
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRODUCT_IDS,
  PRO_PRICING,
  FAMILY_ADDON_PRICING,
  FAMILY_EXTRA_SEAT_PRICING,
  CIRCLE_PRICING,
  BUNDLE_PRICING,
  ADMIN_ADDON_PRICING,
  CCI_PRICING,
  getCCIPrice,
  ProductId,
} from '../subscription/pricing';

// =============================================================================
// TYPES
// =============================================================================

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface PurchaseIntent {
  id: string;
  productId: ProductId;
  productName: string;
  price: number;
  billingCycle: 'monthly' | 'annual' | 'one_time';
  userId: string;
  createdAt: string;
  status: PurchaseStatus;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface PurchaseResult {
  success: boolean;
  purchaseId: string;
  entitlementGranted?: string;
  error?: string;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  PURCHASE_INTENTS: '@orbital:purchase_intents',
  GRANTED_ENTITLEMENTS: '@orbital:granted_entitlements',
} as const;

// =============================================================================
// PRODUCT CATALOG (for mock checkout display)
// =============================================================================

export interface ProductInfo {
  id: ProductId;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'annual' | 'one_time';
  entitlementId: string;
  requiresEntitlement?: string; // Prerequisite entitlement
}

export const PRODUCT_CATALOG: Record<string, ProductInfo> = {
  // Pro Subscription
  [PRODUCT_IDS.PRO_MONTHLY]: {
    id: PRODUCT_IDS.PRO_MONTHLY,
    name: 'Pro (Monthly)',
    description: 'Unlimited signals, full pattern history, required for Circles',
    price: PRO_PRICING.monthly,
    billingCycle: 'monthly',
    entitlementId: 'pro_access',
  },
  [PRODUCT_IDS.PRO_ANNUAL]: {
    id: PRODUCT_IDS.PRO_ANNUAL,
    name: 'Pro (Annual)',
    description: 'Unlimited signals, full pattern history, required for Circles',
    price: PRO_PRICING.annual,
    billingCycle: 'annual',
    entitlementId: 'pro_access',
  },

  // Family Add-on
  [PRODUCT_IDS.FAMILY_MONTHLY]: {
    id: PRODUCT_IDS.FAMILY_MONTHLY,
    name: 'Family Add-on (Monthly)',
    description: 'Add household members to your Pro subscription',
    price: FAMILY_ADDON_PRICING.monthly,
    billingCycle: 'monthly',
    entitlementId: 'family_access',
    requiresEntitlement: 'pro_access',
  },
  [PRODUCT_IDS.FAMILY_ANNUAL]: {
    id: PRODUCT_IDS.FAMILY_ANNUAL,
    name: 'Family Add-on (Annual)',
    description: 'Add household members to your Pro subscription',
    price: FAMILY_ADDON_PRICING.annual,
    billingCycle: 'annual',
    entitlementId: 'family_access',
    requiresEntitlement: 'pro_access',
  },

  // Family Extra Seat (beyond base 5)
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY]: {
    id: PRODUCT_IDS.FAMILY_EXTRA_SEAT_MONTHLY,
    name: 'Family Extra Member (Monthly)',
    description: 'Add one additional family member beyond the base 5',
    price: FAMILY_EXTRA_SEAT_PRICING.monthly,
    billingCycle: 'monthly',
    entitlementId: 'family_extra_seat',
    requiresEntitlement: 'family_access',
  },
  [PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL]: {
    id: PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL,
    name: 'Family Extra Member (Annual)',
    description: 'Add one additional family member beyond the base 5',
    price: FAMILY_EXTRA_SEAT_PRICING.annual,
    billingCycle: 'annual',
    entitlementId: 'family_extra_seat',
    requiresEntitlement: 'family_access',
  },

  // Circle
  [PRODUCT_IDS.CIRCLE_MONTHLY]: {
    id: PRODUCT_IDS.CIRCLE_MONTHLY,
    name: 'Circle (Monthly)',
    description: 'Create a circle with up to 5 buddies (all must be Pro)',
    price: CIRCLE_PRICING.monthly,
    billingCycle: 'monthly',
    entitlementId: 'circle_access',
    requiresEntitlement: 'pro_access',
  },
  [PRODUCT_IDS.CIRCLE_ANNUAL]: {
    id: PRODUCT_IDS.CIRCLE_ANNUAL,
    name: 'Circle (Annual)',
    description: 'Create a circle with up to 5 buddies (all must be Pro)',
    price: CIRCLE_PRICING.annual,
    billingCycle: 'annual',
    entitlementId: 'circle_access',
    requiresEntitlement: 'pro_access',
  },

  // Bundles (Annual-only)
  [PRODUCT_IDS.BUNDLE_10_ANNUAL]: {
    id: PRODUCT_IDS.BUNDLE_10_ANNUAL,
    name: '10-Seat Bundle (Annual)',
    description: '10 Pro seats for your group',
    price: BUNDLE_PRICING.bundle_10.annual,
    billingCycle: 'annual',
    entitlementId: 'bundle_10_access',
  },
  [PRODUCT_IDS.BUNDLE_15_ANNUAL]: {
    id: PRODUCT_IDS.BUNDLE_15_ANNUAL,
    name: '15-Seat Bundle (Annual)',
    description: '15 Pro seats for your group',
    price: BUNDLE_PRICING.bundle_15.annual,
    billingCycle: 'annual',
    entitlementId: 'bundle_15_access',
  },
  [PRODUCT_IDS.BUNDLE_20_ANNUAL]: {
    id: PRODUCT_IDS.BUNDLE_20_ANNUAL,
    name: '20-Seat Bundle (Annual)',
    description: '20 Pro seats for your group',
    price: BUNDLE_PRICING.bundle_20.annual,
    billingCycle: 'annual',
    entitlementId: 'bundle_20_access',
  },

  // Admin Add-on
  [PRODUCT_IDS.ADMIN_ADDON_MONTHLY]: {
    id: PRODUCT_IDS.ADMIN_ADDON_MONTHLY,
    name: 'Admin Add-on (Monthly)',
    description: 'READ-ONLY access to member pattern history (consent-gated)',
    price: ADMIN_ADDON_PRICING.monthly,
    billingCycle: 'monthly',
    entitlementId: 'admin_addon',
    requiresEntitlement: 'circle_access', // Must have Circle or Bundle
  },
  [PRODUCT_IDS.ADMIN_ADDON_ANNUAL]: {
    id: PRODUCT_IDS.ADMIN_ADDON_ANNUAL,
    name: 'Admin Add-on (Annual)',
    description: 'READ-ONLY access to member pattern history (consent-gated)',
    price: ADMIN_ADDON_PRICING.annual,
    billingCycle: 'annual',
    entitlementId: 'admin_addon',
    requiresEntitlement: 'circle_access',
  },

  // CCI-Q4 (tiered pricing handled separately)
  [PRODUCT_IDS.CCI_FREE]: {
    id: PRODUCT_IDS.CCI_FREE,
    name: 'CCI-Q4 Issuance (Free User)',
    description: 'Clinical Capacity Instrument quarterly issuance',
    price: CCI_PRICING.freeUser,
    billingCycle: 'one_time',
    entitlementId: 'cci_purchased',
  },
  [PRODUCT_IDS.CCI_PRO]: {
    id: PRODUCT_IDS.CCI_PRO,
    name: 'CCI-Q4 Issuance (Pro User)',
    description: 'Clinical Capacity Instrument quarterly issuance',
    price: CCI_PRICING.proUser,
    billingCycle: 'one_time',
    entitlementId: 'cci_purchased',
  },
};

// =============================================================================
// MOCK CHECKOUT IMPLEMENTATION
// =============================================================================

/**
 * Generate unique purchase ID
 */
function generatePurchaseId(): string {
  return `purch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Record purchase intent (for audit trail)
 */
async function recordPurchaseIntent(intent: PurchaseIntent): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASE_INTENTS);
    const intents: PurchaseIntent[] = existing ? JSON.parse(existing) : [];
    intents.push(intent);
    await AsyncStorage.setItem(STORAGE_KEYS.PURCHASE_INTENTS, JSON.stringify(intents));
  } catch {
    // Non-fatal - purchase still valid
  }
}

/**
 * Update purchase intent status
 */
async function updatePurchaseStatus(
  purchaseId: string,
  status: PurchaseStatus
): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASE_INTENTS);
    if (!existing) return;

    const intents: PurchaseIntent[] = JSON.parse(existing);
    const intent = intents.find(i => i.id === purchaseId);
    if (intent) {
      intent.status = status;
      if (status === 'completed') {
        intent.completedAt = new Date().toISOString();
      }
    }
    await AsyncStorage.setItem(STORAGE_KEYS.PURCHASE_INTENTS, JSON.stringify(intents));
  } catch {
    // Non-fatal
  }
}

/**
 * Grant entitlement to user (mock implementation)
 */
async function grantEntitlement(entitlementId: string): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.GRANTED_ENTITLEMENTS);
    const entitlements: string[] = existing ? JSON.parse(existing) : [];
    if (!entitlements.includes(entitlementId)) {
      entitlements.push(entitlementId);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.GRANTED_ENTITLEMENTS, JSON.stringify(entitlements));
  } catch {
    throw new Error('Failed to grant entitlement');
  }
}

/**
 * Get all granted entitlements
 * NOTE: Respects QA Free Mode — returns empty array if enabled
 */
export async function getGrantedEntitlements(): Promise<string[]> {
  // Check QA Free Mode first
  const { isQAFreeModeEnabled, overrideGrantedEntitlements } = await import('../access/qaFreeMode');

  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.GRANTED_ENTITLEMENTS);
    const entitlements = existing ? JSON.parse(existing) : [];

    // Apply QA Free Mode override
    if (isQAFreeModeEnabled()) {
      return overrideGrantedEntitlements(entitlements);
    }

    return entitlements;
  } catch {
    return [];
  }
}

/**
 * Check if user has a specific entitlement
 * NOTE: Respects QA Free Mode — returns false for all if enabled
 */
export async function hasEntitlement(entitlementId: string): Promise<boolean> {
  // Check QA Free Mode first
  const { isQAFreeModeEnabled } = await import('../access/qaFreeMode');

  if (isQAFreeModeEnabled()) {
    return false; // QA Free Mode blocks all entitlements
  }

  const entitlements = await getGrantedEntitlements();
  return entitlements.includes(entitlementId);
}

/**
 * Simulate purchase delay (realistic UX)
 */
function simulateProcessingDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 1500));
}

/**
 * Execute a purchase (STUB - will be replaced by Stripe)
 *
 * STRIPE INTEGRATION POINT:
 * Replace the body of this function with:
 * 1. Create Stripe Checkout Session
 * 2. Redirect to Stripe Checkout
 * 3. Handle success/cancel webhooks
 * 4. Grant entitlement on webhook confirmation
 */
export async function executePurchase(
  productId: ProductId,
  userId: string = 'demo_user'
): Promise<PurchaseResult> {
  const product = PRODUCT_CATALOG[productId];

  if (!product) {
    return {
      success: false,
      purchaseId: '',
      error: 'Product not found',
    };
  }

  // Check prerequisite entitlements
  if (product.requiresEntitlement) {
    let hasPrereq = await hasEntitlement(product.requiresEntitlement);

    // Special case: Admin Add-on can be purchased with Circle OR any Bundle
    if (!hasPrereq && product.entitlementId === 'admin_addon') {
      const hasBundle10 = await hasEntitlement('bundle_10_access');
      const hasBundle15 = await hasEntitlement('bundle_15_access');
      const hasBundle20 = await hasEntitlement('bundle_20_access');
      hasPrereq = hasBundle10 || hasBundle15 || hasBundle20;
    }

    if (!hasPrereq) {
      return {
        success: false,
        purchaseId: '',
        error: `Requires Circle or Bundle first`,
      };
    }
  }

  // Create purchase intent
  const purchaseId = generatePurchaseId();
  const intent: PurchaseIntent = {
    id: purchaseId,
    productId,
    productName: product.name,
    price: product.price,
    billingCycle: product.billingCycle,
    userId,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  await recordPurchaseIntent(intent);

  // Simulate processing
  await simulateProcessingDelay();

  // MOCK: Always succeed (in production, this would be Stripe webhook)
  try {
    await grantEntitlement(product.entitlementId);
    await updatePurchaseStatus(purchaseId, 'completed');

    return {
      success: true,
      purchaseId,
      entitlementGranted: product.entitlementId,
    };
  } catch (error) {
    await updatePurchaseStatus(purchaseId, 'failed');
    return {
      success: false,
      purchaseId,
      error: error instanceof Error ? error.message : 'Purchase failed',
    };
  }
}

/**
 * Get purchase history
 */
export async function getPurchaseHistory(): Promise<PurchaseIntent[]> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASE_INTENTS);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all mock data (for testing)
 */
export async function clearMockData(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.PURCHASE_INTENTS,
    STORAGE_KEYS.GRANTED_ENTITLEMENTS,
  ]);
}

/**
 * Get product info by ID
 */
export function getProductInfo(productId: ProductId): ProductInfo | undefined {
  return PRODUCT_CATALOG[productId];
}
