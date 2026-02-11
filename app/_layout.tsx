import 'react-native-gesture-handler';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Modal, Pressable, Platform, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

import { colors, spacing, borderRadius } from '../theme';
import { LocaleProvider } from '../lib/hooks/useLocale';
import { AccessibilityProvider } from '../lib/hooks/useAccessibility';
import { DemoModeProvider } from '../lib/hooks/useDemoMode';
import { AppModeProvider } from '../lib/hooks/useAppMode';
import { SubscriptionProvider } from '../lib/subscription';
import { TermsAcceptanceProvider } from '../lib/hooks/useTermsAcceptance';
import { ErrorBoundary } from '../components';
import { AgeGate } from '../components/legal/AgeGate';
import { useIdleTimeout, updateLastActivity } from '../lib/session';
import { useAuth } from '../lib/supabase';
import { logSessionExpired, createDeviceSession } from '../lib/session';

// =============================================================================
// SENTRY CONFIGURATION - 24/7 Watchdog (Only Bark on Critical Failures)
// =============================================================================
// Noise Filtering: Drop warning/info/debug BEFORE sending to Sentry
// Spike Alert: Configure in Sentry UI for crash-free sessions < 99%
// Zero Tolerance: Payment failures tagged for instant alerting
// =============================================================================

Sentry.init({
  dsn: 'https://bbb78729aee9b642c8d677a48da6379d@o4510642690457600.ingest.us.sentry.io/4510642826772480',

  // Only enabled in production builds (TestFlight + App Store)
  enabled: !__DEV__,

  // Environment tagging for alert filtering (production-only alerts)
  // CRITICAL: Alerts filter on environment=production
  // - Local dev (__DEV__=true): 'development' (alerts disabled anyway)
  // - TestFlight (__DEV__=false): 'production' (alerts WILL fire)
  // - App Store (__DEV__=false): 'production' (alerts WILL fire)
  environment: __DEV__ ? 'development' : 'production',

  // Release + dist for proper symbolication of native crashes
  release: Constants.expoConfig?.version
    ? `orbital@${Constants.expoConfig.version}`
    : undefined,
  dist: Constants.expoConfig?.ios?.buildNumber
    ?? Constants.expoConfig?.android?.versionCode?.toString()
    ?? undefined,

  // PRIVACY: Never send PII (emails, IPs) to Sentry
  sendDefaultPii: false,

  // Breadcrumb cap — enough for diagnostics, not a memory hog
  maxBreadcrumbs: 50,

  // Performance monitoring - modest sample rate (5%)
  // Does NOT affect error capture (errors always captured)
  tracesSampleRate: 0.05,

  // Auto-instrument navigation transitions (Expo Router)
  enableAutoPerformanceTracing: true,

  // Enable session tracking for crash-free rate alerts
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000, // 30 seconds

  // ==========================================================================
  // beforeSend: Filter noise + scrub PII BEFORE sending to Sentry
  // ==========================================================================
  beforeSend(event, hint) {
    // DROP: warning, info, debug levels (noise)
    // KEEP: error, fatal (critical failures only)
    const level = event.level;
    if (level === 'warning' || level === 'info' || level === 'debug' || level === 'log') {
      return null; // Discard - do not send to Sentry
    }

    // ---- PII SCRUBBER (defense-in-depth: regex + structural stripping) ----

    // 1. Strip emails and phone numbers from text fields
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g;
    // 2. Strip JWTs (Supabase access tokens, RevenueCat auth)
    const jwtRegex = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
    // 3. Strip bearer tokens
    const bearerRegex = /Bearer\s+[A-Za-z0-9._~+/\-]+=*/gi;
    // 4. Strip Apple/Google receipt data (base64 blobs > 40 chars)
    const receiptRegex = /[A-Za-z0-9+/]{40,}={0,2}/g;

    function scrubText(text: string): string {
      return text
        .replace(jwtRegex, '[jwt]')
        .replace(bearerRegex, 'Bearer [redacted]')
        .replace(emailRegex, '[email]')
        .replace(phoneRegex, '[phone]');
    }

    if (event.message) {
      event.message = scrubText(event.message);
    }
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) {
          ex.value = scrubText(ex.value);
        }
      }
    }

    // 5. Never send user PII to Sentry (only anonymous ID)
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }

    // 6. Strip authorization headers from request context
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>;
      if (h['Authorization'] || h['authorization']) {
        h['Authorization'] = '[redacted]';
        delete h['authorization'];
      }
      if (h['apikey'] || h['Apikey']) {
        h['apikey'] = '[redacted]';
        delete h['Apikey'];
      }
    }

    // 7. Strip query params from request URLs (may contain tokens/codes)
    if (event.request?.url) {
      const qIdx = event.request.url.indexOf('?');
      if (qIdx > 0) {
        event.request.url = event.request.url.substring(0, qIdx) + '?[params_redacted]';
      }
    }

    // 8. Scrub receipt/transaction payloads from extra context
    if (event.extra) {
      const extraStr = JSON.stringify(event.extra);
      if (receiptRegex.test(extraStr)) {
        // Receipt data found — replace the entire extra with a sanitized version
        event.extra = { note: 'receipt/transaction data redacted' };
      }
    }

    // Attach additional context for payment-related errors
    if (event.tags?.feature === 'payment') {
      event.fingerprint = [
        'payment',
        String(event.tags['payment.provider'] || 'unknown'),
        String(event.tags['payment.flow'] || 'unknown'),
        String(event.tags['payment.stage'] || 'unknown'),
      ];
    }

    return event;
  },

  // ==========================================================================
  // beforeBreadcrumb: Keep breadcrumbs clean
  // ==========================================================================
  beforeBreadcrumb(breadcrumb) {
    // Drop noisy console breadcrumbs in production
    if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') {
      return null;
    }

    // Scrub HTTP breadcrumbs: strip query params and auth headers
    if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
      if (breadcrumb.data?.url) {
        const qIdx = breadcrumb.data.url.indexOf('?');
        if (qIdx > 0) {
          breadcrumb.data.url = breadcrumb.data.url.substring(0, qIdx) + '?[params_redacted]';
        }
      }
      // Remove any authorization/apikey from breadcrumb data
      if (breadcrumb.data) {
        delete breadcrumb.data['Authorization'];
        delete breadcrumb.data['authorization'];
        delete breadcrumb.data['apikey'];
      }
    }

    return breadcrumb;
  },

  // ==========================================================================
  // ignoreErrors: Conservative list - do NOT hide unknown real bugs
  // ==========================================================================
  ignoreErrors: [
    // Network transient errors (user connectivity issues)
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    'TypeError: cancelled',
    // User-initiated cancellations (not errors)
    'User cancelled',
    'user cancelled',
    // React Native specific noise
    'Non-Error promise rejection captured',
  ],
});

// Set initial tags for all future events
Sentry.setTag('app.platform', Platform.OS);
Sentry.setTag('app.version', Constants.expoConfig?.version ?? 'unknown');
Sentry.setTag('app.build', Constants.expoConfig?.ios?.buildNumber ?? 'unknown');
Sentry.setTag('app.review_mode', String(process.env.EXPO_PUBLIC_APP_STORE_REVIEW === '1'));


// =============================================================================
// IDLE TIMEOUT WRAPPER - Auto-logout after inactivity
// =============================================================================

function IdleTimeoutWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  const handleTimeout = useCallback(async () => {
    if (auth.isAuthenticated) {
      await logSessionExpired();
      await auth.signOut();
      setShowWarning(false);
      // Navigate to cloud-sync for re-authentication
      router.replace('/cloud-sync');
    }
  }, [auth, router]);

  const handleWarning = useCallback(() => {
    setShowWarning(true);
  }, []);

  const idleState = useIdleTimeout({
    enabled: auth.isAuthenticated,
    onTimeout: handleTimeout,
    onWarning: handleWarning,
  });

  // Register device session on auth
  useEffect(() => {
    if (auth.isAuthenticated) {
      createDeviceSession();
    }
  }, [auth.isAuthenticated]);

  // Dismiss warning on activity
  const handleDismissWarning = useCallback(() => {
    updateLastActivity();
    setShowWarning(false);
  }, []);

  return (
    <>
      {children}
      <Modal
        visible={showWarning && idleState.showWarning}
        transparent
        animationType="fade"
      >
        <View style={idleStyles.overlay}>
          <View style={idleStyles.card}>
            <Text style={idleStyles.title}>Session Timeout</Text>
            <Text style={idleStyles.message}>
              You will be signed out in {idleState.remainingSeconds} seconds due to inactivity.
            </Text>
            <Pressable style={idleStyles.button} onPress={handleDismissWarning}>
              <Text style={idleStyles.buttonText}>Stay Signed In</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const idleStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#00E5FF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});


// =============================================================================
// ROUTE TRACKER — Tags every Sentry event with the current screen name
// =============================================================================

function RouteTracker() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    // Update Sentry scope tag so every future event includes current route
    Sentry.setTag('route', pathname);

    // Breadcrumb for navigation trail
    if (prevPath.current !== pathname) {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `${prevPath.current} → ${pathname}`,
        level: 'info',
      });
      prevPath.current = pathname;
    }
  }, [pathname]);

  return null;
}

// =============================================================================
// APP STATE TRACKER — Breadcrumbs for foreground/background transitions
// Correlation evidence for OOM kills (iOS terminates backgrounded apps first)
// =============================================================================

function AppStateTracker() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      Sentry.addBreadcrumb({
        category: 'app.lifecycle',
        message: `${appState.current} → ${next}`,
        level: 'info',
      });

      // If returning from background, tag the event as potential OOM survivor
      if (appState.current === 'background' && next === 'active') {
        Sentry.setTag('app.resumed_from_background', 'true');
      }

      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return null;
}

function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    Sentry.addBreadcrumb({ message: 'App mounted', category: 'lifecycle' });
  }, []);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url === 'orbital://log' || url.startsWith('orbital://log')) {
        router.replace('/');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url && (url === 'orbital://log' || url.startsWith('orbital://log'))) {
        router.replace('/');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <ErrorBoundary name="RootLayout">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LocaleProvider>
          <AccessibilityProvider>
            <DemoModeProvider>
            <AppModeProvider>
            <SubscriptionProvider>
              <TermsAcceptanceProvider>
                {/* AGE GATE — LEGAL REQUIRED: Blocks ALL access until 13+ verified */}
                <AgeGate>
                <IdleTimeoutWrapper>
                <StatusBar style="light" />
                <RouteTracker />
                <AppStateTracker />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'fade',
                  }}
                >
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="tutorial"
                    options={{
                      presentation: 'modal',
                      animation: 'fade',
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen
                    name="settings"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="accessibility"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="export"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="sharing"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="audit"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="legal"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="about"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="dashboard"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="data-exit"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="team-mode"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="school-zone"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="upgrade"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="your-data"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="why-orbital"
                    options={{
                      presentation: 'modal',
                      animation: 'fade',
                    }}
                  />
                  <Stack.Screen
                    name="qsb"
                    options={{
                      animation: 'slide_from_right',
                    }}
                  />
                  <Stack.Screen
                    name="enterprise-dashboard"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="account"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                  <Stack.Screen
                    name="profile-setup"
                    options={{
                      presentation: 'fullScreenModal',
                      animation: 'fade',
                      gestureEnabled: false,
                    }}
                  />
                  <Stack.Screen
                    name="active-sessions"
                    options={{
                      presentation: 'modal',
                      animation: 'slide_from_bottom',
                    }}
                  />
                </Stack>
                </IdleTimeoutWrapper>
                </AgeGate>
              </TermsAcceptanceProvider>
            </SubscriptionProvider>
            </AppModeProvider>
            </DemoModeProvider>
          </AccessibilityProvider>
        </LocaleProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
