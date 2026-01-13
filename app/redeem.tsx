/**
 * Sponsor Code Redemption Screen
 *
 * Allows users to redeem sponsor seat codes for Individual or Pro access.
 * Uses HMAC-signed codes for offline validation.
 *
 * Code Format: XXXX-XXXX-XXXX-XXXX
 * - First char indicates tier (C=Core, P=Pro)
 * - Codes are validated locally with checksum verification
 * - Nonces prevent replay attacks
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Gift, Check, AlertCircle, Shield, Calendar } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { useAccess, generateTestCode } from '../lib/access';

export default function RedeemScreen() {
  const router = useRouter();
  const { redeemSponsorCode, sponsorExpiration, tierLabel, isSponsored } = useAccess();
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tier: string; expiresAt: Date } | null>(null);

  // Format code as user types (auto-insert dashes)
  const handleCodeChange = useCallback((text: string) => {
    // Remove all non-alphanumeric characters
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Format with dashes every 4 characters
    let formatted = '';
    for (let i = 0; i < clean.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += '-';
      }
      formatted += clean[i];
    }

    setCode(formatted);
    setError(null);
    setSuccess(null);
  }, []);

  const handleRedeem = useCallback(async () => {
    if (!code.trim()) {
      setError('Please enter a sponsor code');
      return;
    }

    // Normalize code: uppercase, remove dashes/spaces
    const normalizedCode = code.toUpperCase().replace(/[-\s]/g, '');

    if (normalizedCode.length < 16) {
      setError('Invalid code format. Code should be 16 characters.');
      return;
    }

    setIsRedeeming(true);
    setError(null);

    try {
      const result = await redeemSponsorCode(normalizedCode);

      if (result.success && result.tier && result.expiresAt) {
        setSuccess({ tier: result.tier, expiresAt: result.expiresAt });
      } else {
        setError(result.error || 'Failed to redeem code');
      }
    } catch (err) {
      setError('Failed to redeem code. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  }, [code, redeemSponsorCode]);

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  // DEV: Generate test codes (remove in production)
  const handleGenerateTestCore = useCallback(() => {
    const testCode = generateTestCode('core');
    setCode(testCode);
    setError(null);
    setSuccess(null);
  }, []);

  const handleGenerateTestPro = useCallback(() => {
    const testCode = generateTestCode('pro');
    setCode(testCode);
    setError(null);
    setSuccess(null);
  }, []);

  // If already sponsored, show current status
  if (isSponsored && !success) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Sponsored Access</Text>
            <Pressable onPress={() => router.back()} style={styles.closeButton}>
              <X color={colors.textPrimary} size={24} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.activeCard}>
              <View style={styles.activeIconContainer}>
                <Shield size={32} color="#4CAF50" />
              </View>
              <Text style={styles.activeTitle}>Active Sponsored Access</Text>
              <Text style={styles.activeTier}>{tierLabel}</Text>
              {sponsorExpiration && (
                <View style={styles.expirationRow}>
                  <Calendar size={14} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.expirationText}>
                    Valid until {sponsorExpiration.toLocaleDateString()}
                  </Text>
                </View>
              )}
            </Animated.View>

            <Pressable style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Success state
  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Code Redeemed</Text>
            <Pressable onPress={handleDone} style={styles.closeButton}>
              <X color={colors.textPrimary} size={24} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.successCard}>
              <View style={styles.successIconContainer}>
                <Check size={32} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>Welcome to Orbital!</Text>
              <Text style={styles.successTier}>
                {success.tier === 'Pro' ? 'Pro + Insights' : 'Core'} Access Activated
              </Text>
              <View style={styles.expirationRow}>
                <Calendar size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.expirationText}>
                  Valid until {success.expiresAt.toLocaleDateString()}
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.successFeatures}>
              <Text style={styles.successFeaturesTitle}>Your access includes:</Text>
              <View style={styles.featureRow}>
                <Check size={14} color="#00E5FF" />
                <Text style={styles.featureText}>Unlimited capacity signals</Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={14} color="#00E5FF" />
                <Text style={styles.featureText}>
                  {success.tier === 'Pro' ? 'Unlimited' : '90-day'} pattern history
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={14} color="#00E5FF" />
                <Text style={styles.featureText}>QSB Strategic Brief</Text>
              </View>
              {success.tier === 'Pro' && (
                <View style={styles.featureRow}>
                  <Check size={14} color="#00E5FF" />
                  <Text style={styles.featureText}>Executive reports</Text>
                </View>
              )}
            </Animated.View>

            <Pressable style={styles.ctaButton} onPress={handleDone}>
              <Text style={styles.ctaButtonText}>Get Started</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Redemption form
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>Redeem Code</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.textPrimary} size={24} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Hero */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.hero}>
            <View style={styles.iconContainer}>
              <Gift size={32} color="#00E5FF" />
            </View>
            <Text style={styles.heroTitle}>Sponsor Code</Text>
            <Text style={styles.heroSubtitle}>
              Enter your sponsor code to activate your subscription
            </Text>
          </Animated.View>

          {/* Input */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={19} // 16 chars + 3 dashes
              keyboardType="default"
            />

            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </Animated.View>

          {/* Info */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.infoCard}>
            <Text style={styles.infoTitle}>Sponsor Seat Types</Text>
            <View style={styles.infoRow}>
              <Check size={14} color="#00E5FF" />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Core ($200/yr)</Text> - Individual access for one year
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Check size={14} color="#00E5FF" />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Pro + Insights ($349/yr)</Text> - Pro access with full analytics
              </Text>
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.ctaContainer}>
            <Pressable
              style={[styles.ctaButton, (!code.trim() || code.length < 19) && styles.ctaButtonDisabled]}
              onPress={handleRedeem}
              disabled={isRedeeming || !code.trim() || code.length < 19}
            >
              {isRedeeming ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.ctaButtonText}>Redeem Sponsor Code</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* DEV: Test Code Generation (remove in production) */}
          {__DEV__ && (
            <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.devSection}>
              <Text style={styles.devLabel}>DEV: Generate Test Codes</Text>
              <View style={styles.devButtons}>
                <Pressable style={styles.devButton} onPress={handleGenerateTestCore}>
                  <Text style={styles.devButtonText}>Core Code</Text>
                </Pressable>
                <Pressable style={styles.devButton} onPress={handleGenerateTestPro}>
                  <Text style={styles.devButtonText}>Pro Code</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Sponsor codes are provided by organizations that have purchased
              seat packages. If you received a code, enter it above to activate
              your subscription.
            </Text>
            <Text style={styles.footerContact}>
              Questions? Contact contact@orbital.health
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  ctaContainer: {
    marginBottom: spacing.lg,
  },
  ctaButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  footerContact: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  // Success State
  successCard: {
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(76,175,80,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: spacing.xs,
  },
  successTier: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.md,
  },
  expirationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expirationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  successFeatures: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  successFeaturesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  doneButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },

  // Active Sponsored State
  activeCard: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  activeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(76,175,80,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.xs,
  },
  activeTier: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: spacing.md,
  },

  // DEV Section
  devSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
  },
  devLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  devButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  devButton: {
    flex: 1,
    backgroundColor: 'rgba(255,152,0,0.2)',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  devButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9800',
  },
});
