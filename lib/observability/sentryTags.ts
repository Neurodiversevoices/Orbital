/**
 * Sentry Payment Tagging Helpers
 *
 * Zero-tolerance payment alerting: ALL payment failures must be tagged
 * so Sentry alerts can fire immediately on revenue-critical issues.
 *
 * Usage:
 *   import { setPaymentScope, capturePaymentError } from '../observability/sentryTags';
 *
 *   // At start of payment flow
 *   setPaymentScope({ provider: 'revenuecat', flow: 'purchase', productId: 'pro_quarterly' });
 *
 *   // On error (NOT user cancellation)
 *   capturePaymentError(error, { stage: 'confirm' });
 */

import * as Sentry from '@sentry/react-native';

// =============================================================================
// TYPES
// =============================================================================

export type PaymentProvider = 'revenuecat' | 'stripe' | 'apple' | 'google';

export type PaymentFlow =
  | 'purchase'
  | 'restore'
  | 'checkout'
  | 'subscription'
  | 'upgrade'
  | 'qcr_purchase';

export type PaymentStage =
  | 'start'
  | 'offerings_fetch'
  | 'package_select'
  | 'confirm'
  | 'complete'
  | 'restore'
  | 'failed';

export interface PaymentScopeOptions {
  provider: PaymentProvider;
  flow: PaymentFlow;
  productId?: string;
  stage?: PaymentStage;
}

export interface PaymentErrorOptions {
  stage: PaymentStage;
  productId?: string;
  errorCode?: string;
  additionalContext?: Record<string, unknown>;
}

// =============================================================================
// SCOPE MANAGEMENT
// =============================================================================

/**
 * Set payment-related tags on the current Sentry scope.
 * Call this at the START of any payment flow.
 *
 * These tags enable the "Zero Tolerance Payment Alert" to fire.
 */
export function setPaymentScope(options: PaymentScopeOptions): void {
  Sentry.setTag('feature', 'payment');
  Sentry.setTag('payment.provider', options.provider);
  Sentry.setTag('payment.flow', options.flow);

  if (options.productId) {
    Sentry.setTag('payment.product_id', options.productId);
  }

  if (options.stage) {
    Sentry.setTag('payment.stage', options.stage);
  }

  // Add breadcrumb for flow tracking
  Sentry.addBreadcrumb({
    category: 'payment',
    message: `Payment flow started: ${options.flow}`,
    level: 'info',
    data: {
      provider: options.provider,
      productId: options.productId,
    },
  });
}

/**
 * Update the payment stage tag (call as flow progresses).
 */
export function updatePaymentStage(stage: PaymentStage): void {
  Sentry.setTag('payment.stage', stage);

  Sentry.addBreadcrumb({
    category: 'payment',
    message: `Payment stage: ${stage}`,
    level: 'info',
  });
}

/**
 * Clear payment scope (call after successful completion or user cancel).
 */
export function clearPaymentScope(): void {
  Sentry.setTag('feature', undefined);
  Sentry.setTag('payment.provider', undefined);
  Sentry.setTag('payment.flow', undefined);
  Sentry.setTag('payment.product_id', undefined);
  Sentry.setTag('payment.stage', undefined);
}

// =============================================================================
// ERROR CAPTURE
// =============================================================================

/**
 * Capture a payment error with full tagging for Zero Tolerance alerts.
 *
 * IMPORTANT: Do NOT call this for user cancellations - those are not errors.
 *
 * @param error - The error object
 * @param options - Payment context for the error
 */
export function capturePaymentError(
  error: unknown,
  options: PaymentErrorOptions
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    // Set all payment tags for alerting
    scope.setTag('feature', 'payment');
    scope.setTag('payment.stage', options.stage);

    if (options.productId) {
      scope.setTag('payment.product_id', options.productId);
    }

    if (options.errorCode) {
      scope.setTag('payment.error_code', options.errorCode);
    }

    // Set fingerprint for clean grouping of similar payment failures
    // Groups by: payment + provider + flow + stage
    scope.setFingerprint([
      'payment',
      '{{ tags.payment.provider }}',
      '{{ tags.payment.flow }}',
      options.stage,
    ]);

    // Add extra context
    scope.setExtra('payment_error_details', {
      stage: options.stage,
      productId: options.productId,
      errorCode: options.errorCode,
      timestamp: new Date().toISOString(),
      ...options.additionalContext,
    });

    // Capture at error level (will trigger alert)
    scope.setLevel('error');

    Sentry.captureException(errorObj);
  });
}

/**
 * Check if an error is a user cancellation (should NOT be captured).
 */
export function isUserCancellation(error: unknown): boolean {
  if (!error) return false;

  // RevenueCat user cancellation
  if (typeof error === 'object' && 'userCancelled' in error) {
    return !!(error as { userCancelled?: boolean }).userCancelled;
  }

  // String-based cancellation detection
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  return (
    lowerMessage.includes('user cancelled') ||
    lowerMessage.includes('user canceled') ||
    lowerMessage.includes('cancelled by user') ||
    lowerMessage.includes('canceled by user') ||
    lowerMessage.includes('purchase was cancelled')
  );
}

// =============================================================================
// CONVENIENCE WRAPPERS
// =============================================================================

/**
 * Wrap a payment operation with automatic Sentry tagging.
 *
 * Usage:
 *   const result = await withPaymentTracking(
 *     { provider: 'revenuecat', flow: 'purchase', productId: 'pro_quarterly' },
 *     async () => {
 *       // ... payment logic ...
 *     }
 *   );
 */
export async function withPaymentTracking<T>(
  options: PaymentScopeOptions,
  operation: () => Promise<T>
): Promise<T> {
  setPaymentScope({ ...options, stage: 'start' });

  try {
    const result = await operation();
    updatePaymentStage('complete');
    clearPaymentScope();
    return result;
  } catch (error) {
    // Only capture if NOT a user cancellation
    if (!isUserCancellation(error)) {
      capturePaymentError(error, {
        stage: 'failed',
        productId: options.productId,
      });
    }
    clearPaymentScope();
    throw error;
  }
}

// =============================================================================
// DEV-ONLY VERIFICATION (DO NOT SHIP TO PROD ENABLED)
// =============================================================================

/**
 * DEV-ONLY: Test Sentry alert configuration.
 *
 * Call this manually from a dev screen to verify alerts fire correctly.
 * These events WILL appear in Sentry (even in dev if enabled).
 */
export function __DEV_testSentryAlerts(): void {
  if (!__DEV__) {
    console.warn('[Sentry Test] This function should only be called in development');
    return;
  }

  console.log('[Sentry Test] Sending test events...');

  // Test 1: Generic error (should appear in Issues, but NOT trigger payment alert)
  Sentry.captureException(new Error('TEST: Generic error - verify this appears in Sentry Issues'));

  // Test 2: Payment-tagged error (SHOULD trigger payment alert)
  Sentry.withScope((scope) => {
    scope.setTag('feature', 'payment');
    scope.setTag('payment.provider', 'revenuecat');
    scope.setTag('payment.flow', 'purchase');
    scope.setTag('payment.stage', 'failed');
    scope.setTag('payment.product_id', 'test_product');
    scope.setFingerprint(['payment', 'revenuecat', 'purchase', 'failed']);
    scope.setLevel('error');

    Sentry.captureException(
      new Error('TEST: Payment failure - verify payment alert fires')
    );
  });

  // Test 3: Warning (should be DROPPED by beforeSend)
  Sentry.captureMessage('TEST: Warning level - should NOT appear in Sentry', 'warning');

  console.log('[Sentry Test] Test events sent. Check Sentry dashboard:');
  console.log('  - Generic error: Should appear in Issues');
  console.log('  - Payment error: Should appear AND trigger payment alert');
  console.log('  - Warning: Should NOT appear (filtered by beforeSend)');
}
