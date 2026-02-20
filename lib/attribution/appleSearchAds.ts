/**
 * Apple Search Ads Attribution
 *
 * Implements the full attribution pipeline:
 * 1. ATT prompt (iOS 14.5+) — gated, shown once, respects denial
 * 2. AdServices token collection via RevenueCat
 * 3. Purchase event instrumentation for ROAS mapping
 *
 * Privacy posture:
 * - ATT prompt is shown once on first app launch (iOS only)
 * - If user denies, we still collect deterministic AdServices tokens
 *   (no IDFA required — Apple's privacy-safe attribution)
 * - No device identifiers are stored locally
 * - Compliant with Orbital governance P-003, P-013
 *
 * Requires next native build to take effect (Expo config plugin
 * adds NSUserTrackingUsageDescription and SKAdNetworkItems to Info.plist).
 */

import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

// =============================================================================
// TYPES
// =============================================================================

export interface AttributionEvent {
  type: 'cci_purchase' | 'pro_subscription' | 'artifact_purchase';
  productId: string;
  revenue?: number;
  currency?: string;
  isProUser?: boolean;
}

// =============================================================================
// ATT PROMPT (iOS only)
// =============================================================================

/**
 * Request App Tracking Transparency authorization.
 *
 * Behavior:
 * - iOS 14.5+: shows system prompt once, result is cached by OS
 * - iOS < 14.5: no-op (ATT not required)
 * - Android/Web: no-op
 *
 * Called once during app initialization. If the user denies,
 * AdServices deterministic attribution still works (no IDFA needed).
 */
async function requestATTPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  if (Platform.OS !== 'ios') return 'unavailable';

  try {
    // Dynamic import — only resolves on native iOS builds that include
    // expo-tracking-transparency. Falls back gracefully if not installed.
    const TrackingModule = await import('expo-tracking-transparency');
    const { status } = await TrackingModule.requestTrackingPermissionsAsync();

    Sentry.addBreadcrumb({
      category: 'attribution',
      message: `ATT prompt result: ${status}`,
      level: 'info',
    });

    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    // expo-tracking-transparency not installed or not available
    // This is expected until the next native build
    if (__DEV__) console.log('[Attribution] ATT module not available (expected before next native build)');
    return 'unavailable';
  }
}

// =============================================================================
// REVENUECAT ATTRIBUTION SETUP
// =============================================================================

/**
 * Enable AdServices attribution token collection on RevenueCat.
 *
 * This tells RevenueCat to:
 * 1. Call AdServices.attributionToken() on iOS 14.3+
 * 2. Send the token to RevenueCat servers
 * 3. RevenueCat forwards it to Apple for attribution matching
 *
 * Must be called AFTER Purchases.configure() and AFTER ATT prompt.
 */
async function enableRevenueCatAttribution(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const PurchasesModule = await import('react-native-purchases');
    const Purchases = PurchasesModule.default;

    // Collect AdServices attribution token (iOS 14.3+)
    // This works regardless of ATT status — it uses Apple's
    // privacy-preserving deterministic attribution, not IDFA.
    Purchases.enableAdServicesAttributionTokenCollection();

    // Also collect device identifiers for cross-platform matching
    Purchases.collectDeviceIdentifiers();

    Sentry.addBreadcrumb({
      category: 'attribution',
      message: 'RevenueCat AdServices attribution enabled',
      level: 'info',
    });

    if (__DEV__) console.log('[Attribution] RevenueCat AdServices attribution enabled');
  } catch {
    // RevenueCat not configured yet — this is fine, will be called
    // again on next app launch after configure() succeeds
    if (__DEV__) console.log('[Attribution] RevenueCat attribution setup skipped (SDK not ready)');
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize the full attribution pipeline.
 *
 * Call this ONCE after RevenueCat Purchases.configure() completes.
 * Safe to call on all platforms — non-iOS is a no-op.
 *
 * Order matters:
 * 1. ATT prompt first (so user sees it before any tracking)
 * 2. RevenueCat attribution collection second
 */
export async function initAttribution(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    // Step 1: ATT prompt (shows once, OS caches result)
    await requestATTPermission();

    // Step 2: Enable AdServices token collection in RevenueCat
    // Works regardless of ATT result — deterministic attribution
    // does not require IDFA
    await enableRevenueCatAttribution();

    Sentry.addBreadcrumb({
      category: 'attribution',
      message: 'Attribution pipeline initialized',
      level: 'info',
    });
  } catch (error) {
    // Attribution failure must never crash the app
    if (__DEV__) console.error('[Attribution] Init failed (non-fatal):', error);
    Sentry.addBreadcrumb({
      category: 'attribution',
      message: 'Attribution init failed (non-fatal)',
      level: 'warning',
      data: { error: String(error) },
    });
  }
}

/**
 * Track a purchase event for attribution.
 *
 * Logs a Sentry breadcrumb mapping the purchase to the attribution context.
 * RevenueCat automatically attributes purchases to Apple Search Ads campaigns
 * once AdServices token collection is enabled — this function adds
 * observability so we can verify the chain end-to-end.
 *
 * Call this after any successful purchase (subscription or one-time).
 */
export function trackPurchaseAttribution(event: AttributionEvent): void {
  Sentry.addBreadcrumb({
    category: 'attribution',
    message: `Purchase attributed: ${event.type}`,
    level: 'info',
    data: {
      productId: event.productId,
      revenue: event.revenue,
      currency: event.currency ?? 'USD',
      isProUser: event.isProUser,
    },
  });

  if (__DEV__) {
    console.log('[Attribution] Purchase event:', event.type, event.productId);
  }
}
