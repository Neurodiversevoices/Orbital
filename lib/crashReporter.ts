/**
 * Crash reporting utility - delegates to Sentry
 */

import * as Sentry from '@sentry/react-native';

interface CrashContext {
  component?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

class CrashReporter {
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    // Sentry is already initialized in _layout.tsx
  }

  captureException(error: Error, context?: CrashContext) {
    try {
      Sentry.captureException(error, { extra: context as Record<string, unknown> });
    } catch {
      // Silently fail if Sentry isn't ready
      console.error('[CrashReporter]', error.message);
    }
  }

  captureMessage(message: string, context?: CrashContext) {
    try {
      Sentry.captureMessage(message, { extra: context as Record<string, unknown> });
    } catch {
      console.warn('[CrashReporter]', message);
    }
  }

  addBreadcrumb(message: string, category: string = 'default') {
    try {
      Sentry.addBreadcrumb({ message, category });
    } catch {
      // Ignore
    }
  }
}

export const crashReporter = new CrashReporter();

export function reportComponentError(
  error: Error,
  componentName: string,
  errorInfo?: { componentStack?: string }
) {
  crashReporter.captureException(error, {
    component: componentName,
    extra: { componentStack: errorInfo?.componentStack },
  });
}
