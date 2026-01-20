/**
 * Payment Mode Configuration
 *
 * Environment-based payment mode for Vercel deployment.
 *
 * EXPO_PUBLIC_PAYMENTS_MODE:
 * - "live"  = Real Stripe payments in production
 * - "test"  = Stripe test mode (test cards work)
 * - "demo"  = No real payments, simulated success (default)
 *
 * In demo mode:
 * - Purchase buttons show "DEMO – No charge"
 * - No durable entitlements are granted
 * - AsyncStorage entitlements are ephemeral
 */

export type PaymentMode = 'live' | 'test' | 'demo';

/**
 * Get current payment mode from environment
 * Defaults to 'demo' if not set
 */
export function getPaymentMode(): PaymentMode {
  const mode = process.env.EXPO_PUBLIC_PAYMENTS_MODE;
  if (mode === 'live' || mode === 'test') {
    return mode;
  }
  return 'demo';
}

/**
 * Check if payments are in demo mode
 */
export function isDemoMode(): boolean {
  return getPaymentMode() === 'demo';
}

/**
 * Check if payments are in test mode (Stripe test)
 */
export function isTestMode(): boolean {
  return getPaymentMode() === 'test';
}

/**
 * Check if payments are in live mode (real money)
 */
export function isLiveMode(): boolean {
  return getPaymentMode() === 'live';
}

/**
 * Check if Stripe should be used (test or live mode)
 */
export function shouldUseStripe(): boolean {
  const mode = getPaymentMode();
  return mode === 'live' || mode === 'test';
}

/**
 * Get Stripe publishable key based on mode
 */
export function getStripePublishableKey(): string | null {
  const mode = getPaymentMode();
  if (mode === 'live') {
    return process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE || null;
  }
  if (mode === 'test') {
    return process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || null;
  }
  return null;
}

/**
 * Get the API base URL for checkout
 */
export function getApiBaseUrl(): string {
  // In production, use the Vercel URL
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR
  return process.env.EXPO_PUBLIC_API_URL || '';
}

/**
 * Demo mode banner text
 */
export const DEMO_MODE_BANNER = 'DEMO – No charge';
export const DEMO_MODE_NOTICE = 'Payments are in demo mode. No real charges will be made.';
