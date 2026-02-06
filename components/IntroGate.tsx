/**
 * IntroGate
 *
 * Gate component that redirects to the explanatory intro
 * if the user hasn't seen it yet.
 *
 * Appears AFTER age verification but BEFORE terms acceptance.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '../theme';
import { hasSeenIntro } from '../lib/hooks/useIntro';

// Routes that bypass the intro check
const BYPASS_ROUTES = [
  '/intro',
  '/legal',
  '/terms',
  '/privacy',
  '/support',
];

interface IntroGateProps {
  children: React.ReactNode;
}

export function IntroGate({ children }: IntroGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSeen, setHasSeen] = useState(true);

  useEffect(() => {
    async function checkIntro() {
      // Skip check for bypass routes
      const shouldBypass = BYPASS_ROUTES.some(route => pathname.startsWith(route));
      if (shouldBypass) {
        setIsChecking(false);
        setHasSeen(true);
        return;
      }

      try {
        const seen = await hasSeenIntro();
        setHasSeen(seen);

        if (!seen) {
          router.replace('/intro');
        }
      } catch {
        // On error, allow through
        setHasSeen(true);
      } finally {
        setIsChecking(false);
      }
    }

    checkIntro();
  }, [pathname, router]);

  // Show loading while checking
  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If hasn't seen and not on bypass route, show loading (redirect in progress)
  if (!hasSeen && !BYPASS_ROUTES.some(route => pathname.startsWith(route))) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
