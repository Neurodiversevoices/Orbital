import 'react-native-gesture-handler';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
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

// Phase 1: module-level imports complete
startupBreadcrumb('phase1_done');

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
  // beforeSend: Filter noise BEFORE it reaches Sentry
  // ==========================================================================
  beforeSend(event, hint) {
    // DROP: warning, info, debug levels (noise)
    // KEEP: error, fatal (critical failures only)
    const level = event.level;
    if (level === 'warning' || level === 'info' || level === 'debug' || level === 'log') {
      return null; // Discard - do not send to Sentry
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


// =============================================================================
// STARTUP PHASE MARKER — fires breadcrumb once on mount
// =============================================================================

const firedPhases = new Set<string>();

function StartupPhase({ phase }: { phase: string }) {
  useEffect(() => {
    if (!firedPhases.has(phase)) {
      firedPhases.add(phase);
      startupBreadcrumb(phase);
    }
  }, [phase]);
  return null;
}

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


function RootLayout() {
  const router = useRouter();
  const startupTracked = useRef(false);

  useEffect(() => {
    if (!startupTracked.current) {
      startupBreadcrumb('startup:first_layout_effect');
      startupTracked.current = true;
    }
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
        <StartupPhase phase="deferred_begin" />
        <LocaleProvider>
          <AccessibilityProvider>
            <DemoModeProvider>
            <AppModeProvider>
            <SubscriptionProvider>
              <TermsAcceptanceProvider>
                <StartupPhase phase="providers_ready" />
                {/* AGE GATE — LEGAL REQUIRED: Blocks ALL access until 13+ verified */}
                <AgeGate>
                <IdleTimeoutWrapper>
                <StatusBar style="light" />
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
                <StartupPhase phase="phase2_done" />
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
