/**
 * Product Analytics Tracking
 *
 * Tracks user behavior and feature engagement for product insights.
 * Currently uses Sentry breadcrumbs; can be extended to a dedicated
 * analytics provider (PostHog, Amplitude, Mixpanel) in the future.
 *
 * Usage:
 *   import { trackEvent, trackScreen } from '../observability/analytics';
 *
 *   trackEvent('tutorial_completed', { step_count: 5 });
 *   trackScreen('patterns');
 */

import * as Sentry from '@sentry/react-native';

// =============================================================================
// TYPES
// =============================================================================

export type AnalyticsEventName =
  // Tutorial events
  | 'tutorial_started'
  | 'tutorial_step_viewed'
  | 'tutorial_step_completed'
  | 'tutorial_skipped'
  | 'tutorial_completed'
  // Blurred pattern tease events
  | 'pattern_tease_viewed'
  | 'pattern_tease_upgrade_tapped'
  | 'pattern_tease_dismissed'
  // Upgrade flow events
  | 'upgrade_cta_tapped'
  | 'upgrade_screen_viewed'
  // General engagement
  | 'screen_viewed'
  | 'feature_used';

export interface AnalyticsEventProperties {
  // Tutorial properties
  step?: number;
  step_name?: string;
  step_count?: number;
  skipped_at_step?: number;
  // Pattern tease properties
  time_range?: string;
  days_since_install?: number;
  // Upgrade properties
  source?: string;
  plan?: string;
  // Screen properties
  screen_name?: string;
  // General
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Set to true to enable console logging in development
const DEV_LOGGING = __DEV__;

// Future: Add analytics provider initialization here
// let analyticsProvider: AnalyticsProvider | null = null;

// =============================================================================
// CORE TRACKING FUNCTIONS
// =============================================================================

/**
 * Track a user event with optional properties.
 *
 * @param eventName - The name of the event
 * @param properties - Additional properties for the event
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  properties?: AnalyticsEventProperties
): void {
  if (DEV_LOGGING) {
    console.log(`[Analytics] ${eventName}`, properties || '');
  }

  // Add Sentry breadcrumb for event trail
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: eventName,
    level: 'info',
    data: properties,
  });

  // Future: Send to analytics provider
  // if (analyticsProvider) {
  //   analyticsProvider.track(eventName, properties);
  // }
}

/**
 * Track a screen view.
 *
 * @param screenName - The name of the screen
 * @param properties - Additional properties
 */
export function trackScreen(
  screenName: string,
  properties?: AnalyticsEventProperties
): void {
  trackEvent('screen_viewed', { screen_name: screenName, ...properties });
}

// =============================================================================
// TUTORIAL TRACKING HELPERS
// =============================================================================

/**
 * Track when user starts the tutorial.
 */
export function trackTutorialStarted(): void {
  trackEvent('tutorial_started');
}

/**
 * Track when user views a tutorial step.
 *
 * @param step - The step number (0-indexed)
 * @param stepName - Human-readable step name
 */
export function trackTutorialStepViewed(step: number, stepName: string): void {
  trackEvent('tutorial_step_viewed', { step, step_name: stepName });
}

/**
 * Track when user skips the tutorial.
 *
 * @param skippedAtStep - The step number when user skipped
 * @param totalSteps - Total number of steps in the tutorial
 */
export function trackTutorialSkipped(skippedAtStep: number, totalSteps: number): void {
  trackEvent('tutorial_skipped', {
    skipped_at_step: skippedAtStep,
    step_count: totalSteps,
  });
}

/**
 * Track when user completes the tutorial.
 *
 * @param totalSteps - Total number of steps completed
 */
export function trackTutorialCompleted(totalSteps: number): void {
  trackEvent('tutorial_completed', { step_count: totalSteps });
}

// =============================================================================
// BLURRED PATTERN TEASE TRACKING HELPERS
// =============================================================================

/**
 * Track when blurred pattern tease is shown.
 *
 * @param timeRange - The time range that triggered the tease (e.g., '30d', '90d')
 * @param daysSinceInstall - Days since the user installed the app
 */
export function trackPatternTeaseViewed(
  timeRange: string,
  daysSinceInstall?: number
): void {
  trackEvent('pattern_tease_viewed', {
    time_range: timeRange,
    days_since_install: daysSinceInstall,
  });
}

/**
 * Track when user taps upgrade from the blurred pattern tease.
 *
 * @param timeRange - The time range that triggered the tease
 */
export function trackPatternTeaseUpgradeTapped(timeRange: string): void {
  trackEvent('pattern_tease_upgrade_tapped', {
    time_range: timeRange,
    source: 'pattern_tease',
  });
}

// =============================================================================
// UPGRADE TRACKING HELPERS
// =============================================================================

/**
 * Track when user taps an upgrade CTA.
 *
 * @param source - Where the CTA was shown (e.g., 'pattern_tease', 'settings', 'paywall')
 * @param plan - The plan being promoted (optional)
 */
export function trackUpgradeCtaTapped(source: string, plan?: string): void {
  trackEvent('upgrade_cta_tapped', { source, plan });
}

/**
 * Track when user views the upgrade screen.
 *
 * @param source - Where the user came from
 */
export function trackUpgradeScreenViewed(source?: string): void {
  trackEvent('upgrade_screen_viewed', { source });
}

// =============================================================================
// DEV-ONLY UTILITIES
// =============================================================================

/**
 * DEV-ONLY: Log all tracked events to console.
 * Useful for verifying analytics implementation.
 */
export function __DEV_enableVerboseLogging(): void {
  if (__DEV__) {
    console.log('[Analytics] Verbose logging enabled');
  }
}
