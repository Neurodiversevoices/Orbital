/**
 * Payments Configuration
 *
 * Kill-switch for payments. When disabled:
 * - Purchase buttons are hidden/disabled
 * - "Request Issuance" fallback CTA is shown
 *
 * Environment variable: EXPO_PUBLIC_PAYMENTS_ENABLED
 * - "true" = payments enabled (requires valid payment provider)
 * - anything else = payments disabled (fallback mode)
 *
 * On web: RevenueCat doesn't work, so unless Stripe is configured,
 * payments should be disabled.
 */

import { Platform } from 'react-native';

/**
 * Kill-switch for payments
 * Set EXPO_PUBLIC_PAYMENTS_ENABLED=true to enable
 */
export const PAYMENTS_ENABLED = process.env.EXPO_PUBLIC_PAYMENTS_ENABLED === 'true';

/**
 * Check if payments are available on current platform
 * - Native (iOS/Android): RevenueCat available
 * - Web: Only if PAYMENTS_ENABLED and Stripe configured
 */
export const PAYMENTS_AVAILABLE = Platform.OS !== 'web' || PAYMENTS_ENABLED;

/**
 * Request Issuance contact email
 * Used when payments are disabled
 */
export const ISSUANCE_REQUEST_EMAIL = 'contact@orbitalhealth.app';

/**
 * Request Issuance URL — used as SUPPORT fallback only (not a purchase path).
 * Never surfaced on any paywall or purchase screen.
 */
export const ISSUANCE_REQUEST_URL = `mailto:${ISSUANCE_REQUEST_EMAIL}?subject=CCI%20Support%20Request`;

/**
 * Force mock payments in local development.
 * MUST remain false in any build targeting TestFlight or App Store.
 * Only set true explicitly during local dev when testing UI without a sandbox Apple ID.
 */
export const FORCE_MOCK_PAYMENTS = false;
