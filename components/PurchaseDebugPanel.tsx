/**
 * Purchase Debug Panel — Review Mode Only
 *
 * Shows StoreKit/RevenueCat diagnostic information to help
 * Apple reviewers verify that IAP is functioning correctly.
 *
 * Only renders when IS_REVIEW_MODE is true.
 * Shows NO sensitive data — no emails, no receipts, no user IDs.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { IS_REVIEW_MODE } from '../lib/reviewMode';
import { useSubscription } from '../lib/subscription';
import { colors } from '../theme';

export function PurchaseDebugPanel() {
  const { isAvailable, isPro, status, isLoading, error } = useSubscription();

  // Only render in review mode
  if (!IS_REVIEW_MODE) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>StoreKit Diagnostics</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Platform:</Text>
        <Text style={styles.value}>{Platform.OS}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Products loaded:</Text>
        <Text style={[styles.value, isAvailable ? styles.ok : styles.warn]}>
          {isLoading ? 'loading...' : isAvailable ? 'yes' : 'no'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Subscription status:</Text>
        <Text style={styles.value}>{status}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Pro active:</Text>
        <Text style={[styles.value, isPro ? styles.ok : styles.neutral]}>
          {isPro ? 'yes' : 'no'}
        </Text>
      </View>
      {error && (
        <View style={styles.row}>
          <Text style={styles.label}>Error:</Text>
          <Text style={[styles.value, styles.warn]} numberOfLines={2}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  value: {
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ok: { color: '#4CAF50' },
  warn: { color: '#FF9800' },
  neutral: { color: 'rgba(255, 255, 255, 0.6)' },
});
