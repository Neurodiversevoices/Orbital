import 'react-native-gesture-handler';

// ─── STARTUP TIMER ──────────────────────────────────────────────────────────
// Captured BEFORE any other module evaluation so we can measure true cold-start.
const STARTUP_TS = Date.now();
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  View, Text, StyleSheet, Modal, Pressable,
  Platform, AppState, AppStateStatus, InteractionManager,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

import { colors, spacing, borderRadius } from '../theme';
import { ErrorBoundary } from '../components';
import { useAuth } from '../lib/supabase';

// =============================================================================
// SENTRY CONFIGURATION - Minimal module-scope init (cold-start critical path)
// =============================================================================
// The init itself MUST stay at module scope so native crash handlers install
// before any React code runs. But everything else (tags, heavy callbacks)
// is deferred to after the first frame via setupSentryDeferred().
// =============================================================================

// PII scrub regexes — compiled once, reused in beforeSend
const RE_EMAIL = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const RE_PHONE = /\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g;
const RE_JWT   = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const RE_BEARER = /Bearer\s+[A-Za-z0-9._~+/\-]+=*/gi;
const RE_RECEIPT = /[A-Za-z0-9+/]{40,}={0,2}/g;

function scrubText(text: string): string {
  return text
    .replace(RE_JWT, '[jwt]')
    .replace(RE_BEARER, 'Bearer [redacted]')
    .replace(RE_EMAIL, '[email]')
    .replace(RE_PHONE, '[phone]');
}

Sentry.init({
  dsn: 'https://bbb78729aee9b642c8d677a48da6379d@o4510642690457600.ingest.us.sentry.io/4510642826772480',
  enabled: !__DEV__,
  environment: __DEV__ ? 'development' : 'production',
  release: Constants.expoConfig?.version
    ? `orbital@${Constants.expoConfig.version}`
    : undefined,
  dist: Constants.expoConfig?.ios?.buildNumber
    ?? Constants.expoConfig?.android?.versionCode?.toString()
    ?? undefined,
  sendDefaultPii: false,
  maxBreadcrumbs: 50,
  tracesSampleRate: 0.05,
  enableAutoPerformanceTracing: true,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,

  beforeSend(event) {
    const level = event.level;
    if (level === 'warning' || level === 'info' || level === 'debug' || level === 'log') {
      return null;
    }

    // PII scrub: text fields
    if (event.message) event.message = scrubText(event.message);
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = scrubText(ex.value);
      }
    }
    // PII scrub: user fields
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    // PII scrub: headers
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>;
      if (h['Authorization'] || h['authorization']) { h['Authorization'] = '[redacted]'; delete h['authorization']; }
      if (h['apikey'] || h['Apikey']) { h['apikey'] = '[redacted]'; delete h['Apikey']; }
    }
    // PII scrub: query params
    if (event.request?.url) {
      const q = event.request.url.indexOf('?');
      if (q > 0) event.request.url = event.request.url.substring(0, q) + '?[params_redacted]';
    }
    // PII scrub: receipt blobs
    if (event.extra) {
      const s = JSON.stringify(event.extra);
      if (RE_RECEIPT.test(s)) event.extra = { note: 'receipt/transaction data redacted' };
    }
    // Payment fingerprinting
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

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') return null;
    if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
      if (breadcrumb.data?.url) {
        const q = breadcrumb.data.url.indexOf('?');
        if (q > 0) breadcrumb.data.url = breadcrumb.data.url.substring(0, q) + '?[params_redacted]';
      }
      if (breadcrumb.data) { delete breadcrumb.data['Authorization']; delete breadcrumb.data['authorization']; delete breadcrumb.data['apikey']; }
    }
    return breadcrumb;
  },

  ignoreErrors: [
    'Network request failed', 'Failed to fetch', 'Load failed', 'TypeError: cancelled',
    'User cancelled', 'user cancelled', 'Non-Error promise rejection captured',
  ],
});

Sentry.addBreadcrumb({ category: 'startup', message: 'startup:sentry_init_done', data: { ms: Date.now() - STARTUP_TS } });

// =============================================================================
// GLOBAL UNHANDLED REJECTION HANDLER
// =============================================================================
// Catches promise rejections that escape try/catch boundaries.
// Sentry SDK handles some of these, but this is a safety net for Hermes engine.
// =============================================================================
if (typeof global !== 'undefined') {
  // @ts-ignore — React Native global event (Hermes engine)
  const prevHandler = global.onunhandledrejection;
  // @ts-ignore
  global.onunhandledrejection = (event: { reason: unknown }) => {
    const error = event?.reason;
    if (error instanceof Error) {
      Sentry.captureException(error, { tags: { type: 'unhandled_rejection' } });
    } else if (error !== undefined && error !== null) {
      Sentry.captureMessage(`Unhandled rejection: ${String(error).substring(0, 200)}`, 'error');
    }
    // @ts-ignore
    prevHandler?.(event);
  };
}

/**
 * Deferred Sentry setup — called AFTER first paint via InteractionManager.
 * Moves tag-setting off the critical startup path.
 */
function setupSentryDeferred() {
  Sentry.setTag('app.platform', Platform.OS);
  Sentry.setTag('app.version', Constants.expoConfig?.version ?? 'unknown');
  Sentry.setTag('app.build', Constants.expoConfig?.ios?.buildNumber ?? 'unknown');
  Sentry.setTag('app.review_mode', String(process.env.EXPO_PUBLIC_APP_STORE_REVIEW === '1'));
  Sentry.addBreadcrumb({ category: 'startup', message: 'startup:tags_set', data: { ms: Date.now() - STARTUP_TS } });
}


// =============================================================================
// IDLE TIMEOUT WRAPPER - Auto-logout after inactivity
// =============================================================================

interface IdleTimeoutWrapperProps {
  children: React.ReactNode;
  sessionModule: {
    useIdleTimeout: any;
    updateLastActivity: any;
    logSessionExpired: any;
    createDeviceSession: any;
  } | null;
}

function IdleTimeoutWrapper({ children, sessionModule }: IdleTimeoutWrapperProps) {
  const auth = useAuth();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  const handleTimeout = useCallback(async () => {
    if (auth.isAuthenticated && sessionModule) {
      await sessionModule.logSessionExpired();
      await auth.signOut();
      setShowWarning(false);
      router.replace('/cloud-sync');
    }
  }, [auth, router, sessionModule]);

  const handleWarning = useCallback(() => {
    setShowWarning(true);
  }, []);

  // sessionModule is guaranteed non-null — IdleTimeoutWrapper only renders in Phase 2
  const useIdleTimeout = sessionModule!.useIdleTimeout;
  const idleState = useIdleTimeout({
    enabled: auth.isAuthenticated,
    onTimeout: handleTimeout,
    onWarning: handleWarning,
  });

  // Register device session on auth
  useEffect(() => {
    if (auth.isAuthenticated && sessionModule) {
      sessionModule.createDeviceSession();
    }
  }, [auth.isAuthenticated, sessionModule]);

  // Dismiss warning on activity
  const handleDismissWarning = useCallback(() => {
    sessionModule?.updateLastActivity();
    setShowWarning(false);
  }, [sessionModule]);

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

// =============================================================================
// DEFERRED PROVIDERS — loaded after first frame to avoid watchdog kills
// =============================================================================

// These are lazy-imported so their module-scope code doesn't block cold start.
// InteractionManager.runAfterInteractions gates them until after the first paint.
let LocaleProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
let AccessibilityProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
let DemoModeProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
let AppModeProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
let SubscriptionProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
let TermsAcceptanceProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
let AgeGate: React.ComponentType<{ children: React.ReactNode }> | null = null;

async function loadDeferredProviders() {
  const [locale, a11y, demo, appMode, sub, terms, ageGate, session] = await Promise.all([
    import('../lib/hooks/useLocale'),
    import('../lib/hooks/useAccessibility'),
    import('../lib/hooks/useDemoMode'),
    import('../lib/hooks/useAppMode'),
    import('../lib/subscription'),
    import('../lib/hooks/useTermsAcceptance'),
    import('../components/legal/AgeGate'),
    import('../lib/session'),
  ]);
  LocaleProvider = locale.LocaleProvider;
  AccessibilityProvider = a11y.AccessibilityProvider;
  DemoModeProvider = demo.DemoModeProvider;
  AppModeProvider = appMode.AppModeProvider;
  SubscriptionProvider = sub.SubscriptionProvider;
  TermsAcceptanceProvider = terms.TermsAcceptanceProvider;
  AgeGate = ageGate.AgeGate;
  // Re-export session helpers for IdleTimeoutWrapper
  return session;
}

// =============================================================================
// ROOT LAYOUT — Two-phase startup
// Phase 1: Render Stack immediately (first frame → stops watchdog timer)
// Phase 2: Mount providers + trackers after InteractionManager
// =============================================================================

function RootLayout() {
  const router = useRouter();
  const [providersReady, setProvidersReady] = useState(false);
  const sessionRef = useRef<{
    useIdleTimeout: any;
    updateLastActivity: any;
    logSessionExpired: any;
    createDeviceSession: any;
  } | null>(null);

  // PHASE 1 — First layout effect: breadcrumb + start deferred loading
  useEffect(() => {
    const elapsed = Date.now() - STARTUP_TS;
    Sentry.addBreadcrumb({ category: 'startup', message: 'startup:first_layout_effect', data: { ms: elapsed } });

    // Slow startup guard: if we already burned >2s, flag it
    if (elapsed > 2000) {
      Sentry.addBreadcrumb({ category: 'startup', message: 'startup:slow', data: { ms: elapsed }, level: 'warning' });
      Sentry.captureMessage('Cold start exceeded 2s', { level: 'warning', extra: { elapsedMs: elapsed } });
    }

    Sentry.addBreadcrumb({ category: 'startup', message: 'startup:phase1_done', level: 'info', data: { ms: Date.now() - STARTUP_TS } });

    // Deferred init — runs AFTER first frame is painted
    InteractionManager.runAfterInteractions(async () => {
      Sentry.addBreadcrumb({ category: 'startup', message: 'startup:deferred_begin', data: { ms: Date.now() - STARTUP_TS } });

      try {
        // Load all provider modules in parallel
        Sentry.addBreadcrumb({ category: 'startup', message: 'startup:providers_loading', data: { ms: Date.now() - STARTUP_TS } });
        const session = await loadDeferredProviders();
        sessionRef.current = session;

        // Set Sentry tags (moved off critical path)
        setupSentryDeferred();

        Sentry.addBreadcrumb({ category: 'startup', message: 'startup:providers_ready', data: { ms: Date.now() - STARTUP_TS } });
        setProvidersReady(true);
        Sentry.addBreadcrumb({ category: 'startup', message: 'startup:phase2_done', level: 'info', data: { ms: Date.now() - STARTUP_TS } });
      } catch (err) {
        Sentry.captureException(err);
        // Still show providers — fallback to synchronous import
        setProvidersReady(true);
      }
    });
  }, []);

  // Deep linking (lightweight — stays in phase 1)
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
    return () => { subscription.remove(); };
  }, [router]);

  // ── PHASE 1 RENDER: minimal shell — delivers first frame ASAP ──
  const stackContent = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="tutorial" options={{ presentation: 'modal', animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="accessibility" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="export" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="sharing" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="audit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="legal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="about" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="dashboard" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="data-exit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="team-mode" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="school-zone" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="upgrade" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="your-data" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="why-orbital" options={{ presentation: 'modal', animation: 'fade' }} />
      <Stack.Screen name="qsb" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="enterprise-dashboard" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="account" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="profile-setup" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="active-sessions" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );

  // ── PHASE 2 RENDER: wrap with full provider tree once loaded ──
  if (!providersReady || !LocaleProvider || !AccessibilityProvider || !DemoModeProvider
      || !AppModeProvider || !SubscriptionProvider || !TermsAcceptanceProvider || !AgeGate) {
    // Phase 1: just the navigator — enough to stop the watchdog
    return (
      <ErrorBoundary name="RootLayout">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="light" />
          {stackContent}
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary name="RootLayout">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LocaleProvider>
          <AccessibilityProvider>
            <DemoModeProvider>
            <AppModeProvider>
            <SubscriptionProvider>
              <TermsAcceptanceProvider>
                <AgeGate>
                <IdleTimeoutWrapper sessionModule={sessionRef.current}>
                <StatusBar style="light" />
                <RouteTracker />
                <AppStateTracker />
                {stackContent}
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
