import 'react-native-gesture-handler';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';

// =============================================================================
// SPLASH SCREEN — Explicit gating per HIG audit §H1 (closes G3 / Followup #10)
// =============================================================================
// Prevent Expo's default auto-hide so the splash stays visible until BOTH:
//   1. Fonts are loaded (DM Sans + Space Mono)
//   2. Auth state has resolved (auth.isLoading === false)
// hideAsync() is called from RootLayout's effect; .catch on the promise
// silences the "already hidden" error if a sibling path hides it first.
// -----------------------------------------------------------------------------
SplashScreen.preventAutoHideAsync().catch(() => {});

import { colors, spacing, borderRadius } from '../theme';
import { LocaleProvider } from '../lib/hooks/useLocale';
import { AccessibilityProvider } from '../lib/hooks/useAccessibility';
import { SubBrandProvider } from '../lib/platform/SubBrandProvider';
import { DemoModeProvider } from '../lib/hooks/useDemoMode';
import { AppModeProvider } from '../lib/hooks/useAppMode';
import { SubscriptionProvider } from '../lib/subscription';
import { TermsAcceptanceProvider } from '../lib/hooks/useTermsAcceptance';
import { ErrorBoundary } from '../components';
import { AgeGate } from '../components/legal/AgeGate';
import { useIdleTimeout, updateLastActivity } from '../lib/session';
import { useAuth } from '../lib/supabase';
import { logSessionExpired, createDeviceSession } from '../lib/session';
import { isDevAutoLoginEnabled, performDevAutoLogin } from '../lib/dev/autoLogin';

// =============================================================================
// COLD-LAUNCH TIMING — Breadcrumbs for Sentry startup trace
// =============================================================================
const LAUNCH_T0 = Date.now();

function startupBreadcrumb(phase: string) {
  const elapsed = Date.now() - LAUNCH_T0;
  Sentry.addBreadcrumb({
    message: phase,
    category: 'startup',
    level: 'info',
    data: { ms: elapsed },
  });
}

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

  // Release tracking for regression detection
  release: Constants.expoConfig?.version
    ? `orbital@${Constants.expoConfig.version}`
    : undefined,

  // Performance monitoring - modest sample rate (5%)
  // Does NOT affect error capture (errors always captured)
  tracesSampleRate: 0.05,

  // Enable session tracking for crash-free rate alerts
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000, // 30 seconds

  // ==========================================================================
  // beforeSend: Filter noise BEFORE it reaches Sentry + scrub PII
  // ==========================================================================
  beforeSend(event, hint) {
    // DROP: warning, info, debug levels (noise)
    // KEEP: error, fatal (critical failures only)
    const level = event.level;
    if (level === 'warning' || level === 'info' || level === 'debug' || level === 'log') {
      return null; // Discard - do not send to Sentry
    }

    // ------------------------------------------------------------------------
    // PII SCRUBBER — strip emails / phone numbers from exception messages and
    // local variables before they ship to Sentry. Audit followup #3.
    //
    // Email pattern: matches local-part@domain.tld
    // Phone pattern: matches a leading "+" or digit followed by 7+ chars of
    //   digits / spaces / parens / dots / hyphens. Applied ONLY to message
    //   strings (not numeric IDs) to avoid false positives.
    // ------------------------------------------------------------------------
    const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
    const PHONE_RE = /(\+?\d[\d\s().-]{7,})/g;

    const scrubString = (s: unknown): unknown => {
      if (typeof s !== 'string') return s;
      return s.replace(EMAIL_RE, '[email]').replace(PHONE_RE, '[phone]');
    };

    try {
      // Scrub top-level event message (if any)
      if (event.message && typeof event.message === 'string') {
        event.message = scrubString(event.message) as string;
      }

      // Scrub exception values + frame vars
      const exceptions = event.exception?.values;
      if (Array.isArray(exceptions)) {
        for (const ex of exceptions) {
          if (typeof ex.value === 'string') {
            ex.value = scrubString(ex.value) as string;
          }
          const frames = ex.stacktrace?.frames;
          if (Array.isArray(frames)) {
            for (const frame of frames) {
              if (frame.vars && typeof frame.vars === 'object') {
                for (const k of Object.keys(frame.vars)) {
                  frame.vars[k] = scrubString(frame.vars[k]);
                }
              }
            }
          }
        }
      }
    } catch {
      // If scrubbing throws, do not block the event; better to send a slightly
      // PII-leaky error than to silently lose crash visibility.
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

  // Integrations configuration
  integrations: (integrations) => {
    return integrations.filter((integration) => {
      // Keep default integrations, filter if needed
      return true;
    });
  },
});

// Phase 1: all module-level imports resolved + Sentry.init() complete
startupBreadcrumb('startup:module_ready');

// =============================================================================
// STARTUP PHASE MARKER — fires breadcrumb once on mount
// =============================================================================

const firedPhases = new Set<string>();

function StartupPhase({ phase, onFired }: { phase: string; onFired?: () => void }) {
  useEffect(() => {
    if (!firedPhases.has(phase)) {
      firedPhases.add(phase);
      startupBreadcrumb(phase);
      onFired?.();
    }
  }, [phase, onFired]);
  return null;
}

// =============================================================================
// IDLE TIMEOUT WRAPPER - Auto-logout after inactivity
// =============================================================================

function IdleTimeoutWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  // Store auth + router in refs so handleTimeout never triggers effect re-runs.
  // useAuth() returns a new object every render; without this the entire
  // IdleTimeout effect chain re-fires on every render → infinite loop.
  const authRef = useRef(auth);
  const routerRef = useRef(router);
  useEffect(() => { authRef.current = auth; }, [auth]);
  useEffect(() => { routerRef.current = router; }, [router]);

  const handleTimeout = useCallback(async () => {
    if (authRef.current.isAuthenticated) {
      await logSessionExpired();
      await authRef.current.signOut();
      setShowWarning(false);
      // Navigate to auth gate for re-authentication
      routerRef.current.replace('/auth');
    }
  }, []);

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

// =============================================================================
// AUTH GATE — Redirects unauthenticated users to /auth. No exceptions.
// Must live inside the navigation tree so useRouter/useSegments work.
// =============================================================================

function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const autoLoginAttempted = useRef(false);

  // DEV AUTO-LOGIN: Sign in automatically before any routing decisions.
  // Fires once on mount when EXPO_PUBLIC_DEV_AUTO_LOGIN=true.
  useEffect(() => {
    if (!isDevAutoLoginEnabled()) return;
    if (autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;

    performDevAutoLogin().then((success) => {
      if (success) {
        // Force navigate to home after auto-login establishes session.
        // The auth state listener in useAuth will pick up the new session.
        router.replace('/(tabs)');
      }
    });
  }, [router]);

  useEffect(() => {
    // DEV AUTO-LOGIN active: routing is handled by the auto-login effect above.
    // Skip the normal auth gate entirely so it doesn't fight the redirect.
    if (isDevAutoLoginEnabled()) return;

    // DEV ONLY: skip auth gate so we can see screens past login in the simulator.
    if (__DEV__) return;

    if (auth.isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!auth.isAuthenticated && !inAuthGroup) {
      // Not signed in and not on the auth screen — redirect to auth
      router.replace('/auth');
    } else if (auth.isAuthenticated && inAuthGroup) {
      // Signed in but still on the auth screen — push to tabs
      router.replace('/(tabs)');
    }
  }, [auth.isLoading, auth.isAuthenticated, segments, router]);

  return <>{children}</>;
}

const idleStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,22,36,0.5)',
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
    borderColor: colors.hairline,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


function RootLayout() {
  const router = useRouter();
  const auth = useAuth();
  const startupTracked = useRef(false);
  const splashHidden = useRef(false);
  const [providersReady, setProvidersReady] = useState(false);

  // -------------------------------------------------------------------------
  // Font loading — gates the splash (HIG §H1). The auth screen has its own
  // useFonts call for its placeholder logic; that path is unchanged. expo-font
  // shares its loading cache across calls, so this hook does not duplicate
  // network/disk work.
  // -------------------------------------------------------------------------
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    if (!startupTracked.current) {
      startupBreadcrumb('startup:first_layout_effect');
      startupTracked.current = true;
    }
    Sentry.addBreadcrumb({ message: 'App mounted', category: 'lifecycle' });
  }, []);

  // -------------------------------------------------------------------------
  // Hide splash once fonts are loaded AND auth has resolved.
  // hideAsync() can throw if the splash was already hidden by another path
  // (e.g. a fast-failing native init), so we wrap in try/catch and also gate
  // on splashHidden.current to avoid the "already hidden" warning on re-renders.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (splashHidden.current) return;
    if (!fontsLoaded) return;
    if (auth.isLoading) return;

    splashHidden.current = true;
    (async () => {
      try {
        await SplashScreen.hideAsync();
        startupBreadcrumb('startup:splash_hidden');
      } catch {
        // Splash may have been hidden by another path; ignore.
      }
    })();
  }, [fontsLoaded, auth.isLoading]);

  // Phase 2 complete: fires ONLY after providersReady=true is committed to the UI
  useEffect(() => {
    if (providersReady && !firedPhases.has('phase2_done')) {
      firedPhases.add('phase2_done');
      startupBreadcrumb('phase2_done');
    }
  }, [providersReady]);

  useEffect(() => {
    // Forward Supabase recovery params (in URL query OR fragment) to the
    // reset-password screen so it can establish a recovery session before
    // allowing a password change. Followup #9.
    const buildResetPath = (rawUrl: string): string => {
      try {
        const queryIdx = rawUrl.indexOf('?');
        const fragIdx = rawUrl.indexOf('#');
        const tail =
          queryIdx >= 0
            ? rawUrl.slice(queryIdx + 1)
            : fragIdx >= 0
              ? rawUrl.slice(fragIdx + 1)
              : '';
        return tail ? `/reset-password?${tail}` : '/reset-password';
      } catch {
        return '/reset-password';
      }
    };

    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url === 'orbital://log' || url.startsWith('orbital://log')) {
        router.replace('/');
      }
      if (url.startsWith('orbital://reset-password')) {
        router.replace(buildResetPath(url));
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url && (url === 'orbital://log' || url.startsWith('orbital://log'))) {
        router.replace('/');
      }
      if (url && url.startsWith('orbital://reset-password')) {
        router.replace(buildResetPath(url));
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <ErrorBoundary name="RootLayout">
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={() => {
          if (!firedPhases.has('startup:stack_visible')) {
            firedPhases.add('startup:stack_visible');
            startupBreadcrumb('startup:stack_visible');
          }
        }}>
        <StartupPhase phase="deferred_begin" />
        <LocaleProvider>
          <AccessibilityProvider>
            <SubBrandProvider>
            <DemoModeProvider>
            <AppModeProvider>
            <SubscriptionProvider>
              <TermsAcceptanceProvider>
                <StartupPhase phase="providers_ready" onFired={() => setProvidersReady(true)} />
                {/* AGE GATE — LEGAL REQUIRED: Blocks ALL access until 13+ verified */}
                <AgeGate>
                <AuthGate>
                <IdleTimeoutWrapper>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'fade',
                  }}
                >
                  <Stack.Screen
                    name="auth"
                    options={{
                      animation: 'fade',
                      gestureEnabled: false,
                    }}
                  />
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
                </AuthGate>
                </AgeGate>
              </TermsAcceptanceProvider>
            </SubscriptionProvider>
            </AppModeProvider>
            </DemoModeProvider>
            </SubBrandProvider>
          </AccessibilityProvider>
        </LocaleProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
