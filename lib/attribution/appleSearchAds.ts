/**
 * Apple Search Ads Attribution
 *
 * v1 posture: **no** App Tracking Transparency prompt — `NSUserTrackingUsageDescription` is
 * **not** in `app.json`. Do not call `requestTrackingPermissionsAsync` until that changes.
 *
 * Active pieces:
 * - AdServices token path via RevenueCat (no IDFA required for that lane)
 * - Purchase breadcrumbs for observability
 *
 * If you re-enable ATT, add the plist string first, then uncomment the prompt in
 * `requestATTPermission` below.
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
 *
 * NOTE: ATT prompt is DISABLED for v1.
 * NSUserTrackingUsageDescription is not present in the v1 Info.plist.
 * Apple will reject any build where requestTrackingPermissionsAsync() is
 * called without that plist key. Re-enable in the next native build once
 * NSUserTrackingUsageDescription has been added to app.json ios.infoPlist.
 */
async function requestATTPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  // DISABLED: ATT deferred to post-v1. Calling requestTrackingPermissionsAsync()
  // without NSUserTrackingUsageDescription in Info.plist causes App Store rejection.
  // Remove this early-return guard once the plist key is added.
  if (__DEV__) console.warn('[Attribution] ATT prompt skipped — deferred to post-v1 (no NSUserTrackingUsageDescription in v1 binary)');
  return 'unavailable';

  // --- Code below is preserved for when ATT is re-enabled post-v1 ---
  // if (Platform.OS !== 'ios') return 'unavailable';
  //
  // try {
  //   const TrackingModule = await import('expo-tracking-transparency');
  //   const { status } = await TrackingModule.requestTrackingPermissionsAsync();
  //   Sentry.addBreadcrumb({ category: 'attribution', message: `ATT prompt result: ${status}`, level: 'info' });
  //   return status === 'granted' ? 'granted' : 'denied';
  // } catch {
  //   if (__DEV__) console.warn('[Attribution] ATT module not available');
  //   return 'unavailable';
  // }
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

    if (__DEV__) console.warn('[Attribution] RevenueCat AdServices attribution enabled');
  } catch {
    // RevenueCat not configured yet — this is fine, will be called
    // again on next app launch after configure() succeeds
    if (__DEV__) console.warn('[Attribution] RevenueCat attribution setup skipped (SDK not ready)');
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
    console.warn('[Attribution] Purchase event recorded', event.type);
  }
}
