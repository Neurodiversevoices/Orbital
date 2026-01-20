/**
 * Payments Module
 *
 * Centralized payment configuration and utilities.
 *
 * PAYMENT MODES:
 * - demo: Mock checkout, ephemeral entitlements (AsyncStorage only)
 * - test: Real Stripe checkout with test cards, durable entitlements
 * - live: Real Stripe checkout with real cards, durable entitlements
 *
 * Set EXPO_PUBLIC_PAYMENTS_MODE to control behavior.
 */

// Legacy config exports (for backward compatibility)
export {
  PAYMENTS_ENABLED,
  PAYMENTS_AVAILABLE,
  ISSUANCE_REQUEST_EMAIL,
  ISSUANCE_REQUEST_URL,
} from './config';

// Payment mode (new system)
export {
  getPaymentMode,
  isDemoMode,
  isTestMode,
  isLiveMode,
  shouldUseStripe,
  getStripePublishableKey,
  getApiBaseUrl,
  DEMO_MODE_BANNER,
  DEMO_MODE_NOTICE,
  type PaymentMode,
} from './paymentMode';

// Stripe price IDs
export {
  getStripePriceId,
  hasStripePriceId,
  getAllStripePriceIds,
  getStripeBillingMode,
  getEntitlementForProduct,
  type StripeBillingMode,
  type StripeProductMetadata,
} from './stripePriceIds';

// Stripe checkout (new system)
export {
  executePurchase,
  verifyCheckoutSession,
  isCheckoutAvailable,
  getDemoModeIndicator,
  restorePurchases,
  type CheckoutResult,
  type CheckoutOptions,
} from './stripeCheckout';

// Legacy mock checkout exports (for backward compatibility)
export {
  executePurchase as executeMockPurchase,
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
