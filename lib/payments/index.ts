/**
 * Payments Module
 *
 * Centralized payment configuration and utilities.
 *
 * STRIPE INTEGRATION:
 * - Web: Uses Stripe Checkout for real payments
 * - Entitlements granted ONLY after Stripe confirms payment
 * - mockCheckout still used for entitlement storage (will migrate to DB)
 *
 * DEV/TEST MODE:
 * - Set STRIPE_SECRET_KEY for API routes
 * - Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY for client
 * - Use Stripe test cards (4242 4242 4242 4242)
 */

export {
  PAYMENTS_ENABLED,
  PAYMENTS_AVAILABLE,
  ISSUANCE_REQUEST_EMAIL,
  ISSUANCE_REQUEST_URL,
} from './config';

// Entitlement storage (mock for now, will migrate to DB)
export {
  executePurchase,
  getGrantedEntitlements,
  hasEntitlement,
  grantEntitlement,
  getPurchaseHistory,
  getProductInfo,
  clearMockData,
  PRODUCT_CATALOG,
  type PurchaseIntent,
  type PurchaseResult,
  type ProductInfo,
} from './mockCheckout';

// Stripe Checkout (web payments)
export {
  isStripeConfigured,
  initiateStripeCheckout,
  verifyStripeSession,
  redirectToStripeCheckout,
  createCustomerPortalSession,
  redirectToCustomerPortal,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICE_IDS,
  PRODUCT_ENTITLEMENTS,
  type CheckoutSessionRequest,
  type CheckoutSessionResponse,
  type VerifySessionRequest,
  type VerifySessionResponse,
  type CustomerPortalRequest,
  type CustomerPortalResponse,
} from './stripe';
