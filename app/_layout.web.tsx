// Web layout: strips native-only guards (AgeGate, Sentry, gesture root).
// Home + Patterns are publicly accessible; auth redirects only on protected routes.
import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useEffect } from 'react';

import { LocaleProvider } from '../lib/hooks/useLocale';
import { DemoModeProvider } from '../lib/hooks/useDemoMode';
import { AppModeProvider } from '../lib/hooks/useAppMode';
import { SubscriptionProvider } from '../lib/subscription';
import { useAuth } from '../lib/supabase';

// Public routes accessible without auth on web
const PUBLIC_ROUTES = ['(tabs)', 'signin', 'auth', 'onboarding', 'log', 'why-orbital', 'pricing', 'legal'];

function WebAuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (auth.isLoading) return;
    const segment = segments[0] as string | undefined;
    // Only redirect to auth when hitting a clearly protected route
    const isPublic = !segment || PUBLIC_ROUTES.some(r => segment === r || segment.startsWith(r));
    if (!auth.isAuthenticated && !isPublic) {
      router.replace('/auth' as any);
    } else if (auth.isAuthenticated && segment === 'auth') {
      router.replace('/(tabs)' as any);
    }
  }, [auth.isLoading, auth.isAuthenticated, segments, router]);

  return <>{children}</>;
}

export default function RootLayoutWeb() {
  return (
    <LocaleProvider>
      <DemoModeProvider>
        <AppModeProvider>
          <SubscriptionProvider>
            <WebAuthGate>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#01020A' }, animation: 'fade' }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="auth" options={{ animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="signin" options={{ animation: 'fade' }} />
              </Stack>
            </WebAuthGate>
          </SubscriptionProvider>
        </AppModeProvider>
      </DemoModeProvider>
    </LocaleProvider>
  );
}
