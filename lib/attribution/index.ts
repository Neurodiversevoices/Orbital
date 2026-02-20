/**
 * Orbital Attribution Module
 *
 * Apple Search Ads attribution pipeline for iOS.
 * Collects AdServices attribution tokens and enables RevenueCat
 * ad attribution for ROAS reporting.
 *
 * Chain:
 *   User taps Search Ad
 *     -> iOS records attribution token (AdServices)
 *       -> App collects token via RevenueCat SDK
 *         -> User purchases (CCI / Pro subscription)
 *           -> RevenueCat attributes revenue to campaign
 *             -> Apple Search Ads shows ROAS
 *
 * This module is iOS-only at runtime. Android imports are safe no-ops.
 */

export {
  initAttribution,
  trackPurchaseAttribution,
  type AttributionEvent,
} from './appleSearchAds';
