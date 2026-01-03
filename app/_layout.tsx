import 'react-native-gesture-handler'; 

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '../theme';
import { LocaleProvider } from '../lib/hooks/useLocale';
import { AccessibilityProvider } from '../lib/hooks/useAccessibility';
import { DemoModeProvider } from '../lib/hooks/useDemoMode';
import { TermsAcceptanceProvider } from '../lib/hooks/useTermsAcceptance';
import { ErrorBoundary } from '../components';
import { crashReporter } from '../lib/crashReporter';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://bbb78729aee9b642c8d677a48da6379d@o4510642690457600.ingest.us.sentry.io/4510642826772480',
  enabled: !__DEV__,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
});

export default Sentry.wrap(function RootLayout() {
  // Initialize crash reporting on app start
  useEffect(() => {
    crashReporter.init();
    crashReporter.addBreadcrumb('App mounted', 'lifecycle');
  }, []);

  return (
    <ErrorBoundary name="RootLayout">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LocaleProvider>
          <AccessibilityProvider>
            <DemoModeProvider>
              <TermsAcceptanceProvider>
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
              </Stack>
              </TermsAcceptanceProvider>
            </DemoModeProvider>
          </AccessibilityProvider>
        </LocaleProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
});