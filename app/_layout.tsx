import 'react-native-gesture-handler';

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import * as Linking from 'expo-linking';

import { colors } from '../theme';
import { LocaleProvider } from '../lib/hooks/useLocale';
import { AccessibilityProvider } from '../lib/hooks/useAccessibility';
import { DemoModeProvider } from '../lib/hooks/useDemoMode';
import { AppModeProvider } from '../lib/hooks/useAppMode';
import { SubscriptionProvider } from '../lib/subscription';
import { TermsAcceptanceProvider } from '../lib/hooks/useTermsAcceptance';
import { ErrorBoundary } from '../components';

// Initialize Sentry - minimal config, no experimental features
Sentry.init({
  dsn: 'https://bbb78729aee9b642c8d677a48da6379d@o4510642690457600.ingest.us.sentry.io/4510642826772480',
  enabled: !__DEV__,
});


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
                </Stack>
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
