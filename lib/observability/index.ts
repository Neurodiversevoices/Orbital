/**
 * Observability Module
 *
 * Sentry integration, payment tagging, and error tracking utilities.
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
