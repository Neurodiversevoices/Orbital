/**
 * Mock Checkout System — DEV ONLY
 *
 * STUB IMPLEMENTATION: No real banking. Simulates purchase success.
 *
 * GUARD: This module must never be the active purchase path in production.
 * Production builds use lib/payments/revenueCat.ts.
 * To use mock in local dev: set FORCE_MOCK_PAYMENTS=true in lib/payments/config.ts
 */
if (!__DEV__) {
  // Crash loudly if something accidentally imports this in a production build.
  // A blank catch lets the rest of the module load so tree-shaking still works,
  // but any actual call to executePurchase will fail fast via the product guard below.
  console.error(
    '[mockCheckout] CRITICAL: mockCheckout imported in production build. ' +
    'All purchases through this module are FREE. Fix the import immediately.',
  );
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRODUCT_IDS,
  PRO_PRICING,
  FAMILY_PRICING,
  FAMILY_PLUS_PRICING,
  CIRCLE_PRICING,
  BUNDLE_PRICING,
  ADMIN_ADDON_PRICING,
  CCI_PRICING,
  CCI_PRO_PRICING,
  CCI_GROUP_PRICING,
  getCCIPrice,
  ProductId,
} from '../subscription/pricing';
import { getSupabase, isSupabaseConfigured } from '../supabase/client';

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
// STORAGE KEYS (AsyncStorage fallback)
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

  // Family (standalone — full Pro features, 5 seats)
  [PRODUCT_IDS.FAMILY_MONTHLY]: {
    id: PRODUCT_IDS.FAMILY_MONTHLY,
    name: 'Family (Monthly)',
    description: 'Full Pro for the whole household — 5 seats, no Pro required',
    price: FAMILY_PRICING.monthly,
    billingCycle: 'monthly',
    entitlementId: 'family_access',
  },
  [PRODUCT_IDS.FAMILY_ANNUAL]: {
    id: PRODUCT_IDS.FAMILY_ANNUAL,
    name: 'Family (Annual)',
    description: 'Full Pro for the whole household — 5 seats, no Pro required',
    price: FAMILY_PRICING.annual,
    billingCycle: 'annual',
    entitlementId: 'family_access',
  },

  // Family+ (standalone — full Pro features, 8 seats)
  [PRODUCT_IDS.FAMILY_PLUS_MONTHLY]: {
    id: PRODUCT_IDS.FAMILY_PLUS_MONTHLY,
    name: 'Family+ (Monthly)',
    description: 'Full Pro for larger or blended families — 8 seats',
    price: FAMILY_PLUS_PRICING.monthly,
    billingCycle: 'monthly',
    entitlementId: 'family_plus_access',
  },
  [PRODUCT_IDS.FAMILY_PLUS_ANNUAL]: {
    id: PRODUCT_IDS.FAMILY_PLUS_ANNUAL,
    name: 'Family+ (Annual)',
    description: 'Full Pro for larger or blended families — 8 seats',
    price: FAMILY_PLUS_PRICING.annual,
    billingCycle: 'annual',
    entitlementId: 'family_plus_access',
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

  // CCI Milestone Tiers — Standard (one-time, per-milestone entitlements)
  [PRODUCT_IDS.CCI_30]: {
    id: PRODUCT_IDS.CCI_30,
    name: 'CCI — 30-Day Report',
    description: 'Capacity Instrument — 30-day milestone report',
    price: CCI_PRICING.thirtyDay,
    billingCycle: 'one_time',
    entitlementId: 'cci_30',
  },
  [PRODUCT_IDS.CCI_60]: {
    id: PRODUCT_IDS.CCI_60,
    name: 'CCI — 60-Day Report',
    description: 'Capacity Instrument — 60-day milestone report',
    price: CCI_PRICING.sixtyDay,
    billingCycle: 'one_time',
    entitlementId: 'cci_60',
  },
  [PRODUCT_IDS.CCI_90]: {
    id: PRODUCT_IDS.CCI_90,
    name: 'CCI — 90-Day Report',
    description: 'Capacity Instrument — 90-day milestone report',
    price: CCI_PRICING.ninetyDay,
    billingCycle: 'one_time',
    entitlementId: 'cci_90',
  },
  [PRODUCT_IDS.CCI_BUNDLE]: {
    id: PRODUCT_IDS.CCI_BUNDLE,
    name: 'CCI — All Milestones Bundle',
    description: 'Capacity Instrument — 30 + 60 + 90-day bundle',
    price: CCI_PRICING.bundle,
    billingCycle: 'one_time',
    entitlementId: 'cci_bundle',
  },
  // CCI Milestone Tiers — Pro (discounted SKUs, same entitlements as standard)
  [PRODUCT_IDS.CCI_30_PRO]: {
    id: PRODUCT_IDS.CCI_30_PRO,
    name: 'CCI — 30-Day Report (Pro)',
    description: 'Capacity Instrument — 30-day milestone, Pro price',
    price: CCI_PRO_PRICING.thirtyDay,
    billingCycle: 'one_time',
    entitlementId: 'cci_30',           // Same entitlement as standard — restore works across both
    requiresEntitlement: 'pro_access',
  },
  [PRODUCT_IDS.CCI_60_PRO]: {
    id: PRODUCT_IDS.CCI_60_PRO,
    name: 'CCI — 60-Day Report (Pro)',
    description: 'Capacity Instrument — 60-day milestone, Pro price',
    price: CCI_PRO_PRICING.sixtyDay,
    billingCycle: 'one_time',
    entitlementId: 'cci_60',
    requiresEntitlement: 'pro_access',
  },
  [PRODUCT_IDS.CCI_90_PRO]: {
    id: PRODUCT_IDS.CCI_90_PRO,
    name: 'CCI — 90-Day Report (Pro)',
    description: 'Capacity Instrument — 90-day milestone, Pro price',
    price: CCI_PRO_PRICING.ninetyDay,
    billingCycle: 'one_time',
    entitlementId: 'cci_90',
    requiresEntitlement: 'pro_access',
  },
  [PRODUCT_IDS.CCI_BUNDLE_PRO]: {
    id: PRODUCT_IDS.CCI_BUNDLE_PRO,
    name: 'CCI — All Milestones Bundle (Pro)',
    description: 'Capacity Instrument — 30 + 60 + 90-day bundle, Pro price',
    price: CCI_PRO_PRICING.bundle,
    billingCycle: 'one_time',
    entitlementId: 'cci_bundle',
    requiresEntitlement: 'pro_access',
  },
  [PRODUCT_IDS.CCI_CIRCLE_ALL]: {
    id: PRODUCT_IDS.CCI_CIRCLE_ALL,
    name: 'Circle Aggregate CCI',
    description: 'One CCI covering all Circle members',
    price: CCI_GROUP_PRICING.circleAll,
    billingCycle: 'one_time',
    entitlementId: 'cci_circle_purchased',
    requiresEntitlement: 'circle_access',
  },
  [PRODUCT_IDS.CCI_BUNDLE_ALL]: {
    id: PRODUCT_IDS.CCI_BUNDLE_ALL,
    name: 'Bundle Aggregate CCI',
    description: 'One CCI covering all Bundle seats',
    price: CCI_GROUP_PRICING.bundleAll,
    billingCycle: 'one_time',
    entitlementId: 'cci_bundle_purchased',
  },

  // QCR Products (Quarterly Capacity Reports)
  [PRODUCT_IDS.QCR_INDIVIDUAL]: {
    id: PRODUCT_IDS.QCR_INDIVIDUAL,
    name: 'Individual QCR',
    description: 'Personal quarterly capacity analysis',
    price: 149,
    billingCycle: 'one_time',
    entitlementId: 'qcr_individual',
    requiresEntitlement: 'pro_access',
  },
  [PRODUCT_IDS.QCR_CIRCLE]: {
    id: PRODUCT_IDS.QCR_CIRCLE,
    name: 'Circle QCR',
    description: 'Circle-wide capacity analysis with relational dynamics',
    price: 299,
    billingCycle: 'one_time',
    entitlementId: 'qcr_circle',
    requiresEntitlement: 'circle_access',
  },
  [PRODUCT_IDS.QCR_BUNDLE]: {
    id: PRODUCT_IDS.QCR_BUNDLE,
    name: 'Bundle QCR',
    description: 'Program-level capacity analysis for administrators',
    price: 499,
    billingCycle: 'one_time',
    entitlementId: 'qcr_bundle',
    requiresEntitlement: 'admin_addon',
  },
};

// =============================================================================
// SUPABASE HELPERS
// =============================================================================

/**
 * Get current authenticated user ID from Supabase
 */
async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if we should use Supabase (configured + authenticated)
 */
async function shouldUseSupabase(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return userId !== null;
}

// =============================================================================
// ENTITLEMENT STORAGE (Supabase primary, AsyncStorage fallback)
// =============================================================================

/**
 * Grant entitlement to user
 * Uses Supabase if authenticated, otherwise AsyncStorage
 */
async function grantEntitlement(entitlementId: string, purchaseId?: string): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId && isSupabaseConfigured()) {
    // Use Supabase
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('user_entitlements')
        .upsert({
          user_id: userId,
          entitlement_id: entitlementId,
          source: 'purchase',
          purchase_id: purchaseId,
        }, {
          onConflict: 'user_id,entitlement_id',
        });

      if (error) {
        console.error('[grantEntitlement] Supabase error:', error);
        throw new Error('Failed to grant entitlement');
      }
      console.log('[grantEntitlement] Granted via Supabase:', entitlementId);
      return;
    } catch (e) {
      console.error('[grantEntitlement] Supabase failed, falling back to AsyncStorage:', e);
    }
  }

  // Fallback to AsyncStorage
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.GRANTED_ENTITLEMENTS);
    const entitlements: string[] = existing ? JSON.parse(existing) : [];
    if (!entitlements.includes(entitlementId)) {
      entitlements.push(entitlementId);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.GRANTED_ENTITLEMENTS, JSON.stringify(entitlements));
    console.log('[grantEntitlement] Granted via AsyncStorage:', entitlementId);
  } catch {
    throw new Error('Failed to grant entitlement');
  }
}

/**
 * Get all granted entitlements
 * Reads from Supabase if authenticated, otherwise AsyncStorage
 * NOTE: Respects QA Free Mode — returns empty array if enabled
 */
export async function getGrantedEntitlements(): Promise<string[]> {
  // Check QA Free Mode first
  const { isQAFreeModeEnabled, overrideGrantedEntitlements } = await import('../access/qaFreeMode');

  let entitlements: string[] = [];
  const userId = await getCurrentUserId();

  if (userId && isSupabaseConfigured()) {
    // Use Supabase
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_entitlements')
        .select('entitlement_id')
        .eq('user_id', userId);

      if (!error && data) {
        entitlements = data.map(row => row.entitlement_id);
        console.log('[getGrantedEntitlements] From Supabase:', entitlements);
      }
    } catch (e) {
      console.error('[getGrantedEntitlements] Supabase failed:', e);
    }
  }

  // If no Supabase entitlements, try AsyncStorage
  if (entitlements.length === 0) {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.GRANTED_ENTITLEMENTS);
      entitlements = existing ? JSON.parse(existing) : [];
      if (entitlements.length > 0) {
        console.log('[getGrantedEntitlements] From AsyncStorage:', entitlements);
      }
    } catch {
      entitlements = [];
    }
  }

  // Apply QA Free Mode override
  if (isQAFreeModeEnabled()) {
    return overrideGrantedEntitlements(entitlements);
  }

  return entitlements;
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

// =============================================================================
// PURCHASE HISTORY (Supabase primary, AsyncStorage fallback)
// =============================================================================

/**
 * Record purchase intent (for audit trail)
 */
async function recordPurchaseIntent(intent: PurchaseIntent): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId && isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('purchase_history')
        .insert({
          user_id: userId,
          purchase_id: intent.id,
          product_id: intent.productId,
          product_name: intent.productName,
          price: intent.price,
          billing_cycle: intent.billingCycle,
          status: intent.status,
        });

      if (!error) {
        console.log('[recordPurchaseIntent] Recorded in Supabase');
        return;
      }
    } catch (e) {
      console.error('[recordPurchaseIntent] Supabase failed:', e);
    }
  }

  // Fallback to AsyncStorage
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
  const userId = await getCurrentUserId();

  if (userId && isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const updateData: Record<string, unknown> = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('purchase_history')
        .update(updateData)
        .eq('purchase_id', purchaseId)
        .eq('user_id', userId);

      if (!error) {
        return;
      }
    } catch (e) {
      console.error('[updatePurchaseStatus] Supabase failed:', e);
    }
  }

  // Fallback to AsyncStorage
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

    // BUNDLED UPGRADE: Free users purchasing Family or Circle get Pro automatically
    // This allows direct upgrade path without requiring separate Pro purchase first
    if (!hasPrereq && product.requiresEntitlement === 'pro_access') {
      const isFamilyOrCircle = product.entitlementId === 'family_access' ||
                               product.entitlementId === 'circle_access';
      if (isFamilyOrCircle) {
        // Bundled upgrade: grant Pro as part of the purchase
        await grantEntitlement('pro_access');
        hasPrereq = true; // Continue with purchase
        if (__DEV__) console.log('[MockCheckout] Bundled upgrade: granted pro_access with', product.entitlementId);
      }
    }

    if (!hasPrereq) {
      return {
        success: false,
        purchaseId: '',
        error: `Requires ${product.requiresEntitlement.replace('_', ' ')} first`,
      };
    }
  }

  // Special case: Bundle CCI requires any Bundle entitlement
  if (product.entitlementId === 'cci_bundle_purchased') {
    const hasBundle10 = await hasEntitlement('bundle_10_access');
    const hasBundle15 = await hasEntitlement('bundle_15_access');
    const hasBundle20 = await hasEntitlement('bundle_20_access');
    if (!hasBundle10 && !hasBundle15 && !hasBundle20) {
      return {
        success: false,
        purchaseId: '',
        error: 'Requires Bundle subscription first',
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
    await grantEntitlement(product.entitlementId, purchaseId);
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
  const userId = await getCurrentUserId();

  if (userId && isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('purchase_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(row => ({
          id: row.purchase_id,
          productId: row.product_id as ProductId,
          productName: row.product_name,
          price: row.price,
          billingCycle: row.billing_cycle as 'monthly' | 'annual' | 'one_time',
          userId: row.user_id,
          createdAt: row.created_at,
          status: row.status as PurchaseStatus,
          completedAt: row.completed_at ?? undefined,
        }));
      }
    } catch (e) {
      console.error('[getPurchaseHistory] Supabase failed:', e);
    }
  }

  // Fallback to AsyncStorage
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
