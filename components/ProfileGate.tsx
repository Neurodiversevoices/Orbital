/**
 * ProfileGate
 *
 * Onboarding gate that forces authenticated users to create a profile
 * before accessing the app. Redirects to /create-profile if no profile exists.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { colors, spacing } from '../theme';
import { useAuth } from '../lib/supabase';
import { getMyProfile } from '../lib/db/profiles';
import { isSupabaseConfigured } from '../lib/supabase/client';

// Routes that don't require a profile (auth flow, legal, etc.)
const BYPASS_ROUTES = [
  '/create-profile',
  '/cloud-sync',
  '/legal',
  '/terms',
  '/privacy',
  '/about',
];

interface ProfileGateProps {
  children: React.ReactNode;
}

export function ProfileGate({ children }: ProfileGateProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isChecking, setIsChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkProfile() {
      // Skip if not configured or not authenticated
      if (!isSupabaseConfigured() || !auth.isAuthenticated || !auth.user?.id) {
        setIsChecking(false);
        setHasProfile(true); // Allow access for non-authenticated users
        return;
      }

      // Skip check for bypass routes
      const shouldBypass = BYPASS_ROUTES.some(route => pathname.startsWith(route));
      if (shouldBypass) {
        setIsChecking(false);
        setHasProfile(true);
        return;
      }

      try {
        const profile = await getMyProfile(auth.user.id);
        setHasProfile(profile !== null);

        // Redirect to create-profile if no profile
        if (profile === null) {
          router.replace('/create-profile');
        }
      } catch (error) {
        console.error('[ProfileGate] Error checking profile:', error);
        // On error, allow access but log the issue
        setHasProfile(true);
      } finally {
        setIsChecking(false);
      }
    }

    checkProfile();
  }, [auth.isAuthenticated, auth.user?.id, pathname, router]);

  // Show loading while checking
  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // If we don't have a profile and we're not on a bypass route, show loading
  // (router.replace should navigate us away)
  if (!hasProfile && !BYPASS_ROUTES.some(route => pathname.startsWith(route))) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Setting up...</Text>
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
    gap: spacing.md,
  },
  text: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
