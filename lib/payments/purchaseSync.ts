/**
 * Purchase Sync — Bridge between RevenueCat (StoreKit) and Supabase entitlements
 *
 * After a successful RevenueCat purchase on native iOS/Android, this module
 * syncs the granted entitlement into the Supabase user_entitlements table.
 *
 * This ensures that the richer entitlement model (Pro, Family, Circle, Bundle,
 * Admin, CCI) is authoritative in Supabase regardless of purchase provider.
 */

import { PRODUCT_CATALOG, type ProductInfo } from './mockCheckout';
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import type { ProductId } from '../subscription/pricing';

/**
 * After a successful RevenueCat purchase, write the entitlement to Supabase.
 * This bridges the StoreKit receipt → Supabase entitlement gap.
 *
 * Also grants prerequisite entitlements (e.g., Family auto-grants Pro).
 *
 * IMPORTANT: This function THROWS on failure so the caller can show a visible
 * error and keep the UI locked. Silently swallowing would leave the user with
 * a charged card but no unlocked feature.
 */
export async function syncEntitlementAfterPurchase(productId: string): Promise<void> {
  const product = PRODUCT_CATALOG[productId] as ProductInfo | undefined;
  if (!product) {
    throw new Error(`[purchaseSync] Unknown product: ${productId}`);
  }

  if (!isSupabaseConfigured()) {
    throw new Error('[purchaseSync] Supabase not configured — cannot persist entitlement');
  }

  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('[purchaseSync] No authenticated user — cannot persist entitlement');
  }

  const purchaseId = `rc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Bundled upgrade: Family/Circle purchases auto-grant Pro
  if (
    product.requiresEntitlement === 'pro_access' &&
    (product.entitlementId === 'family_access' || product.entitlementId === 'circle_access')
  ) {
    await upsertEntitlement(supabase, user.id, 'pro_access', purchaseId);
  }

  // Grant the actual entitlement
  await upsertEntitlement(supabase, user.id, product.entitlementId, purchaseId);

  console.log('[purchaseSync] Synced entitlement:', product.entitlementId, 'for product:', productId);
}

/**
 * Sync RevenueCat customer info entitlements to Supabase.
 * Called after restore or on app launch when RevenueCat is available.
 */
export async function syncRevenueCatEntitlements(
  activeEntitlementIds: string[]
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const entitlementId of activeEntitlementIds) {
    // Map RevenueCat entitlement IDs to our canonical entitlement IDs
    // RevenueCat uses 'individual_pro' / 'pro_access' — handle both
    const canonicalId = mapRevenueCatEntitlement(entitlementId);
    if (canonicalId) {
      await upsertEntitlement(supabase, user.id, canonicalId, `rc_restore_${Date.now()}`);
    }
  }
}

function mapRevenueCatEntitlement(rcEntitlementId: string): string | null {
  // Map known RevenueCat entitlement IDs to our canonical entitlement IDs
  const mapping: Record<string, string> = {
    'individual_pro': 'pro_access',
    'pro_access': 'pro_access',
    'family_access': 'family_access',
    'circle_access': 'circle_access',
    'bundle_10_access': 'bundle_10_access',
    'bundle_15_access': 'bundle_15_access',
    'bundle_20_access': 'bundle_20_access',
    'admin_addon': 'admin_addon',
    'cci_purchased': 'cci_purchased',
  };
  return mapping[rcEntitlementId] ?? null;
}

async function upsertEntitlement(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  entitlementId: string,
  purchaseId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_entitlements')
    .upsert(
      {
        user_id: userId,
        entitlement_id: entitlementId,
        source: 'purchase',
        purchase_id: purchaseId,
      },
      { onConflict: 'user_id,entitlement_id' }
    );
  if (error) {
    throw new Error(`[purchaseSync] Supabase upsert failed for ${entitlementId}: ${error.message}`);
  }
}
