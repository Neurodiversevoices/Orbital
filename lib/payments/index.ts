/**
 * Payments Module
 *
 * Centralized payment configuration and utilities.
 *
 * PRODUCTION: executePurchase and restorePurchases use RevenueCat (revenueCat.ts).
 * DEV MOCK:   When FORCE_MOCK_PAYMENTS=true, callers can import mockCheckout directly.
 */

export {
  PAYMENTS_ENABLED,
  PAYMENTS_AVAILABLE,
  ISSUANCE_REQUEST_EMAIL,
  ISSUANCE_REQUEST_URL,
  FORCE_MOCK_PAYMENTS,
} from './config';

// Production purchase entrypoints — RevenueCat backed
export {
  executePurchase,
  restorePurchases,
  type RCPurchaseResult,
} from './revenueCat';

// Entitlement storage and history (Supabase / AsyncStorage backed)
export {
  getGrantedEntitlements,
  hasEntitlement,
  getPurchaseHistory,
  getProductInfo,
  clearMockData,
  PRODUCT_CATALOG,
  type PurchaseIntent,
  type PurchaseResult,
  type ProductInfo,
} from './mockCheckout';
