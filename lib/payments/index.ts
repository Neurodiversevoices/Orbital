/**
 * Payments Module
 *
 * Centralized payment configuration and utilities.
 *
 * STUB IMPLEMENTATION: Uses mockCheckout until Stripe is integrated.
 * All purchases "work" end-to-end by simulating success and granting entitlements.
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
} from './mockCheckout';
