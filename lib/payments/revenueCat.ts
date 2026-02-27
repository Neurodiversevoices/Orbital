/**
 * RevenueCat Purchase Module
 *
 * Production payment handler for iOS/Android.
 * Replaces mockCheckout.ts for all consumer purchases.
 *
 * Integration points:
 * - Reads offerings from RevenueCat (configured at app init in useSubscription)
 * - Searches all offerings for the requested product ID
 * - Returns customerInfo so the caller can sync entitlements
 *
 * After a successful purchase, callers must:
 *   await access.syncWithRevenueCat(Object.keys(result.customerInfo.entitlements.active))
 */

import { Platform } from 'react-native';

// Dynamic import to avoid crashing on web / misconfigured builds
async function getPurchases() {
  const mod = await import('react-native-purchases');
  return mod.default;
}

export interface RCPurchaseResult {
  success: boolean;
  customerInfo?: any;   // RevenueCat CustomerInfo
  userCancelled?: boolean;
  error?: string;
}

/**
 * Find a RevenueCat package by StoreKit/Play product identifier.
 * Searches across ALL offerings so CCI non-consumables (in a
 * dedicated offering) are found even if not in the default offering.
 */
async function findPackage(productId: string): Promise<any | null> {
  const Purchases = await getPurchases();
  const offerings = await Purchases.getOfferings();

  for (const offering of Object.values(offerings.all as Record<string, any>)) {
    const pkg = offering.availablePackages?.find(
      (p: any) => p.product?.identifier === productId,
    );
    if (pkg) return pkg;
  }
  return null;
}

/**
 * Execute a purchase for the given product ID.
 *
 * Returns:
 *   success: true + customerInfo  → caller should sync entitlements
 *   userCancelled: true           → user dismissed sheet; not an error
 *   success: false + error        → real failure, show error to user
 */
export async function executePurchase(productId: string): Promise<RCPurchaseResult> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Native IAP unavailable on web. Use the web checkout instead.' };
  }

  try {
    const Purchases = await getPurchases();
    const pkg = await findPackage(productId);

    if (!pkg) {
      return {
        success: false,
        error: `Product not found in store catalog: ${productId}`,
      };
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (err: any) {
    // RevenueCat sets userCancelled = true when the system sheet is dismissed
    if (err?.userCancelled === true) {
      return { success: false, userCancelled: true };
    }
    return {
      success: false,
      error: err?.message ?? 'Purchase failed',
    };
  }
}

/**
 * Restore previous purchases.
 * Always call syncWithRevenueCat after a successful restore.
 */
export async function restorePurchases(): Promise<RCPurchaseResult> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Restore unavailable on web.' };
  }

  try {
    const Purchases = await getPurchases();
    const customerInfo = await Purchases.restorePurchases();
    const hasAny = Object.keys(customerInfo.entitlements.active).length > 0;
    return { success: hasAny, customerInfo };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message ?? 'Restore failed',
    };
  }
}
