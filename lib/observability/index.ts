/**
 * Observability Module
 *
 * Sentry integration, payment tagging, error tracking, and product analytics.
 */

export {
  setPaymentScope,
  updatePaymentStage,
  clearPaymentScope,
  capturePaymentError,
  isUserCancellation,
  withPaymentTracking,
  __DEV_testSentryAlerts,
} from './sentryTags';

export type {
  PaymentProvider,
  PaymentFlow,
  PaymentStage,
  PaymentScopeOptions,
  PaymentErrorOptions,
} from './sentryTags';

// Product analytics
export {
  trackEvent,
  trackScreen,
  trackTutorialStarted,
  trackTutorialStepViewed,
  trackTutorialSkipped,
  trackTutorialCompleted,
  trackPatternTeaseViewed,
  trackPatternTeaseUpgradeTapped,
  trackUpgradeCtaTapped,
  trackUpgradeScreenViewed,
} from './analytics';

export type {
  AnalyticsEventName,
  AnalyticsEventProperties,
} from './analytics';
