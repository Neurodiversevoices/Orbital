/**
 * Payments Module
 *
 * Centralized payment configuration and utilities.
 * Uses RevenueCat for real IAP via StoreKit / Google Play.
 */

export {
  PAYMENTS_ENABLED,
  PAYMENTS_AVAILABLE,
  ISSUANCE_REQUEST_EMAIL,
  ISSUANCE_REQUEST_URL,
} from './config';

export {
  executePurchase,
  getGrantedEntitlements,
  hasEntitlement,
  getPurchaseHistory,
  getProductInfo,
  clearMockData,
  PRODUCT_CATALOG,
  type PurchaseIntent,
  type PurchaseResult,
  type ProductInfo,
} from './revenueCatCheckout';
