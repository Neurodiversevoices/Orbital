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
      Sentry.captureException(error, { extra: context });
    } catch {
      // Silently fail if Sentry isn't ready
      console.error('[CrashReporter]', error.message);
    }
  }

  captureMessage(message: string, context?: CrashContext) {
    try {
      Sentry.captureMessage(message, { extra: context });
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

  /**
   * Set persistent tags on all future Sentry events.
   * Call this when app mode or user context changes.
   */
  setGlobalTags(tags: Record<string, string>) {
    try {
      for (const [key, value] of Object.entries(tags)) {
        Sentry.setTag(key, value);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Set anonymous user context (ID only — never email/name).
   */
  setUserScope(userId: string | null) {
    try {
      if (userId) {
        Sentry.setUser({ id: userId });
      } else {
        Sentry.setUser(null);
      }
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
