/**
 * revenueCatCheckout — shim that delegates to the mock checkout implementation.
 *
 * Stub introduced 2026-05-09 to satisfy imports from lib/entitlements/index.ts
 * and lib/payments/index.ts. The native RevenueCat path is wired in production
 * via scripts/setup-revenuecat.js; this module re-exports the existing mock
 * surface so the type check resolves until the native bridge is wired in TS.
 */

export {
  executePurchase,
  getGrantedEntitlements,
  hasEntitlement,
  getPurchaseHistory,
  getProductInfo,
  clearMockData,
  PRODUCT_CATALOG,
} from './mockCheckout';

export type {
  PurchaseIntent,
  PurchaseResult,
  ProductInfo,
} from './mockCheckout';
