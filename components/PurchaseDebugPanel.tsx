/**
 * Purchase Debug Panel — Review Mode Only
 *
 * Shows StoreKit/RevenueCat diagnostic information to help
 * Apple reviewers verify that IAP is functioning correctly.
 *
 * Only renders when IS_REVIEW_MODE is true.
 * Shows NO sensitive data — no emails, no receipts, no user IDs.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { IS_REVIEW_MODE } from '../lib/reviewMode';
import { useSubscription } from '../lib/subscription';
import { PRODUCT_IDS } from '../lib/subscription/pricing';
import { colors } from '../theme';

// Count configured product IDs (for display only)
const CONFIGURED_PRODUCT_COUNT = Object.keys(PRODUCT_IDS).length;

export function PurchaseDebugPanel() {
  const { isAvailable, isPro, status, isLoading, error } = useSubscription();
  const [lastPurchaseStatus, setLastPurchaseStatus] = useState<string>('none');

  // Only render in review mode
  if (!IS_REVIEW_MODE) return null;

  // Track purchase events via console (non-invasive)
  useEffect(() => {
    if (isPro) setLastPurchaseStatus('subscribed');
    else if (error) setLastPurchaseStatus(`error: ${error}`);
  }, [isPro, error]);

  const storeReady = !isLoading && isAvailable;
  const storeBlocked = !isLoading && !isAvailable;

  return (
    <View style={[styles.container, storeBlocked && styles.containerError]}>
      <Text style={styles.title}>StoreKit Diagnostics</Text>
      <Row label="Platform" value={Platform.OS} />
      <Row label="Products loaded" value={isLoading ? 'loading...' : isAvailable ? 'yes' : 'NO'} ok={storeReady} warn={storeBlocked} />
      <Row label="Configured IDs" value={String(CONFIGURED_PRODUCT_COUNT)} />
      <Row label="Subscription" value={status} />
      <Row label="Pro active" value={isPro ? 'yes' : 'no'} ok={isPro} />
      <Row label="Last purchase" value={lastPurchaseStatus} warn={lastPurchaseStatus.startsWith('error')} />
      {error && <Row label="Error" value={error} warn />}
      {storeBlocked && (
        <Text style={styles.blockNotice}>
          Purchase buttons are disabled. StoreKit must initialise before review.
        </Text>
      )}
    </View>
  );
}

function Row({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={[styles.value, ok && styles.ok, warn && styles.warn]} numberOfLines={2}>{value}</Text>
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
  containerError: {
    borderColor: '#FF9800',
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
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
    maxWidth: '60%',
    textAlign: 'right',
  },
  ok: { color: '#4CAF50' },
  warn: { color: '#FF9800' },
  blockNotice: {
    marginTop: 8,
    fontSize: 11,
    color: '#FF9800',
    fontStyle: 'italic',
  },
});
