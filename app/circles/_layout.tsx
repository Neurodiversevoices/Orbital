/**
 * CIRCLES LAYOUT
 *
 * Stack navigator for all Circles screens.
 *
 * DOCTRINE: Circles requires Pro subscription.
 * This layout gates all Circles screens behind Pro entitlement.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserEntitlements, type UserEntitlements } from '../../lib/entitlements';
import { PrimaryButton, SecondaryButton, Muted } from './_ui';

// =============================================================================
// PRO GATE COMPONENT
// =============================================================================

function CirclesProGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntitlements = useCallback(async () => {
    try {
      const ent = await getUserEntitlements();
      setEntitlements(ent);
    } catch {
      setEntitlements(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check entitlements on mount and focus (in case user upgraded)
  useEffect(() => {
    loadEntitlements();
  }, [loadEntitlements]);

  useFocusEffect(
    useCallback(() => {
      loadEntitlements();
    }, [loadEntitlements])
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#19D3FF" />
          <Text style={styles.loadingText}>Checking subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Pro gate: require Pro subscription
  if (!entitlements?.isPro) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.upgradePrompt}>
          <Text style={styles.title}>Orbital Circles</Text>
          <Text style={styles.subtitle}>Pro Subscription Required</Text>

          <View style={styles.card}>
            <Text style={styles.description}>
              Circles enables live capacity sharing with trusted connections.
              Share your current state as a simple color signal — no history,
              no timestamps, peer-to-peer consent.
            </Text>

            <View style={styles.featureList}>
              <Text style={styles.feature}>• Live color signals (cyan/amber/red)</Text>
              <Text style={styles.feature}>• Up to 25 trusted connections</Text>
              <Text style={styles.feature}>• No history or timeline</Text>
              <Text style={styles.feature}>• Bidirectional consent required</Text>
              <Text style={styles.feature}>• Instant revocation</Text>
            </View>
          </View>

          <PrimaryButton
            label="Upgrade to Pro"
            onPress={() => router.push('/upgrade')}
          />

          <SecondaryButton
            label="Go Back"
            onPress={() => router.back()}
          />

          <Muted>
            Your existing connections and settings are preserved.
            Upgrade anytime to resume sharing.
          </Muted>
        </View>
      </SafeAreaView>
    );
  }

  // Pro active: render Circles screens
  return <>{children}</>;
}

// =============================================================================
// LAYOUT
// =============================================================================

export default function CirclesLayout() {
  return (
    <CirclesProGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B1220' },
          animation: 'slide_from_right',
        }}
      />
    </CirclesProGate>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#B9C6E4',
    marginTop: 12,
    fontSize: 14,
  },
  upgradePrompt: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#19D3FF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#111B33',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  description: {
    color: '#B9C6E4',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
  },
  feature: {
    color: '#D8E5FF',
    fontSize: 14,
    lineHeight: 20,
  },
});
