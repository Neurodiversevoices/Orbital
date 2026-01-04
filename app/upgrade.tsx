/**
 * Upgrade to Pro (Beta) Screen
 *
 * Lightweight subscription screen for Individual Pro tier.
 * $9/month beta pricing.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Sparkles,
  Infinity,
  History,
  Check,
  RefreshCw,
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { useSubscription, FREE_TIER_LIMITS } from '../lib/subscription';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function UpgradeScreen() {
  const router = useRouter();
  const {
    isPro,
    isLoading,
    isAvailable,
    purchase,
    restore,
    expirationDate,
    error,
  } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handlePurchase = useCallback(async () => {
    if (!isAvailable) {
      Alert.alert(
        'Not Available',
        'In-app purchases are not available on this device. Please try again on a mobile device.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsPurchasing(true);
    const success = await purchase();
    setIsPurchasing(false);

    if (success) {
      Alert.alert(
        'Welcome to Pro!',
        'Thank you for supporting Orbital. You now have unlimited access.',
        [{ text: 'Continue', onPress: () => router.back() }]
      );
    }
  }, [isAvailable, purchase, router]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    const success = await restore();
    setIsRestoring(false);

    if (success) {
      Alert.alert(
        'Restored!',
        'Your subscription has been restored.',
        [{ text: 'Continue', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        'No Purchase Found',
        'We couldn\'t find a previous purchase to restore.',
        [{ text: 'OK' }]
      );
    }
  }, [restore, router]);

  const buttonScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15 });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00E5FF" size="large" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Already Pro
  if (isPro) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>Pro</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.textPrimary} size={24} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.proActiveCard}>
            <Sparkles size={48} color="#00E5FF" />
            <Text style={styles.proActiveTitle}>You're Pro!</Text>
            <Text style={styles.proActiveSubtitle}>
              Thank you for supporting Orbital
            </Text>
            {expirationDate && (
              <Text style={styles.expirationText}>
                Renews: {expirationDate.toLocaleDateString()}
              </Text>
            )}
          </Animated.View>

          <Pressable
            style={styles.manageButton}
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Upgrade</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.hero}>
          <View style={styles.betaBadge}>
            <Text style={styles.betaBadgeText}>BETA</Text>
          </View>
          <Text style={styles.heroTitle}>Orbital Pro</Text>
          <Text style={styles.heroSubtitle}>
            Support early access · $9/month · Cancel anytime
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.features}>
          <Text style={styles.featuresTitle}>What you get</Text>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Infinity size={20} color="#00E5FF" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>Unlimited Signals</Text>
              <Text style={styles.featureDescription}>
                Free tier: {FREE_TIER_LIMITS.maxSignalsPerMonth}/month
              </Text>
            </View>
            <Check size={18} color="#00E5FF" />
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <History size={20} color="#00E5FF" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>Full Pattern History</Text>
              <Text style={styles.featureDescription}>
                Free tier: {FREE_TIER_LIMITS.maxPatternHistoryDays} days
              </Text>
            </View>
            <Check size={18} color="#00E5FF" />
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Sparkles size={20} color="#00E5FF" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>Support Development</Text>
              <Text style={styles.featureDescription}>
                Help shape the future of Orbital
              </Text>
            </View>
            <Check size={18} color="#00E5FF" />
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.ctaContainer}>
          <AnimatedPressable
            onPress={handlePurchase}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isPurchasing || !isAvailable}
            style={[styles.ctaButton, buttonStyle, !isAvailable && styles.ctaButtonDisabled]}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.ctaButtonText}>
                {isAvailable ? 'Subscribe · $9/month' : 'Not Available'}
              </Text>
            )}
          </AnimatedPressable>

          {!isAvailable && (
            <Text style={styles.unavailableText}>
              In-app purchases require a mobile device
            </Text>
          )}

          <Pressable
            onPress={handleRestore}
            disabled={isRestoring}
            style={styles.restoreButton}
          >
            {isRestoring ? (
              <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
            ) : (
              <>
                <RefreshCw size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.restoreButtonText}>Restore Purchase</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Payment is charged to your Apple ID account. Subscription
            automatically renews unless cancelled at least 24 hours before the
            end of the current period.
          </Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => Linking.openURL('https://orbital.health/terms')}>
              <Text style={styles.footerLink}>Terms</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable onPress={() => Linking.openURL('https://orbital.health/privacy')}>
              <Text style={styles.footerLink}>Privacy</Text>
            </Pressable>
          </View>
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
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
  betaBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  betaBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00E5FF',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  features: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  featureDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  ctaContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ctaButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
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
  unavailableText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.sm,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  restoreButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: spacing.sm,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerLink: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  footerDot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Pro Active State
  proActiveCard: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  proActiveTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00E5FF',
    marginTop: spacing.md,
  },
  proActiveSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.xs,
  },
  expirationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.md,
  },
  manageButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});
