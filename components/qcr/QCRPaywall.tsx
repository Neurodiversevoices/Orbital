/**
 * QCR Paywall Component
 *
 * Institutional paywall for QCR subscription.
 * No consumer framing — individuals purchase at institutional price.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { FileText, Check, X, RefreshCw } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { QCR_PRICING } from '../../lib/qcr/types';

interface QCRPaywallProps {
  visible: boolean;
  onClose: () => void;
  onPurchase: (productId: 'quarterly') => Promise<boolean>;
  onRestore: () => Promise<boolean>;
  error?: string | null;
}

export function QCRPaywall({
  visible,
  onClose,
  onPurchase,
  onRestore,
  error,
}: QCRPaywallProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    const success = await onPurchase('quarterly');
    setIsPurchasing(false);
    if (success) {
      onClose();
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    const success = await onRestore();
    setIsRestoring(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.container}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <FileText size={28} color="#00E5FF" />
                </View>
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <X size={20} color="rgba(255,255,255,0.5)" />
                </Pressable>
              </View>

              {/* Title */}
              <Text style={styles.title}>Quarterly Capacity Report</Text>
              <Text style={styles.subtitle}>
                Institutional-grade reporting for clinical documentation
              </Text>

              {/* Features */}
              <View style={styles.features}>
                {[
                  'Record depth and coverage analysis',
                  'Pattern metrics (stability, volatility, recovery lag)',
                  'Driver frequency with strain correlation',
                  'State distribution with observation counts',
                  'Notable episode identification',
                  'Clinical observations (neutral language)',
                  'PDF export (EHR attachment ready)',
                ].map((feature, index) => (
                  <Animated.View
                    key={feature}
                    entering={FadeInDown.delay(index * 50)}
                    style={styles.featureRow}
                  >
                    <Check size={14} color="#00E5FF" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </Animated.View>
                ))}
              </View>

              {/* Pricing */}
              <View style={styles.pricingCard}>
                <Text style={styles.pricingLabel}>Institutional Access</Text>
                <Text style={styles.pricingAmount}>{QCR_PRICING.quarterly.label}</Text>
                <Text style={styles.pricingPeriod}>Billed quarterly</Text>
                <Text style={styles.pricingNote}>
                  Clinical reporting tier — no consumer discount
                </Text>
              </View>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Purchase Button */}
              <Pressable
                style={[styles.purchaseButton, isPurchasing && styles.buttonDisabled]}
                onPress={handlePurchase}
                disabled={isPurchasing || isRestoring}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    Enable Quarterly Reports
                  </Text>
                )}
              </Pressable>

              {/* Restore */}
              <Pressable
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isPurchasing || isRestoring}
              >
                {isRestoring ? (
                  <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
                ) : (
                  <>
                    <RefreshCw size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.restoreText}>Restore Purchase</Text>
                  </>
                )}
              </Pressable>

              {/* Disclaimer */}
              <Text style={styles.disclaimer}>
                Payment will be charged to your Apple ID account. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00E5FF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.lg,
  },
  features: {
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  pricingCard: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pricingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  pricingAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00E5FF',
    marginBottom: 4,
  },
  pricingPeriod: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  pricingNote: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#F4433615',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    textAlign: 'center',
  },
  purchaseButton: {
    backgroundColor: '#00E5FF',
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  restoreText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  disclaimer: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 14,
  },
});
