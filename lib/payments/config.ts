/**
 * Payments Configuration
 *
 * Controls payment availability per platform.
 *
 * - Native (iOS/Android): Payments are ALWAYS available via StoreKit/RevenueCat.
 *   No env var needed — Apple requires all purchases go through StoreKit.
 * - Web: Requires explicit EXPO_PUBLIC_PAYMENTS_ENABLED=true (needs Stripe).
 *
 * The PAYMENTS_ENABLED flag is an explicit opt-in for web/testing.
 * On native, RevenueCat handles everything via StoreKit automatically.
 */

import { Platform } from 'react-native';

/**
 * Explicit env flag for payments (primarily for web platform).
 * On native iOS/Android, StoreKit is always available regardless of this flag.
 */
export const PAYMENTS_ENABLED =
  Platform.OS !== 'web' || process.env.EXPO_PUBLIC_PAYMENTS_ENABLED === 'true';

/**
 * Check if payments are available on current platform
 * - Native (iOS/Android): Always true (StoreKit is the only permitted path)
 * - Web: Only if PAYMENTS_ENABLED and Stripe configured
 */
export const PAYMENTS_AVAILABLE = Platform.OS !== 'web' || PAYMENTS_ENABLED;

/**
 * Request Issuance contact email
 * Used when payments are disabled
 */
export const ISSUANCE_REQUEST_EMAIL = 'contact@orbital.health';

/**
 * Request Issuance URL (mailto or form)
 */
export const ISSUANCE_REQUEST_URL = `mailto:${ISSUANCE_REQUEST_EMAIL}?subject=CCI-Q4%20Issuance%20Request`;
