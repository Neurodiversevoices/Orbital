/**
 * Circle Membership Settings
 *
 * Secondary management screen for Circle membership.
 * Primary Circle access is via Briefings tab.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Users,
  UserCheck,
  ExternalLink,
  Shield,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { getUserEntitlements, type UserEntitlements } from '../lib/entitlements';

export default function CircleSettingsScreen() {
  const router = useRouter();
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntitlements();
  }, []);

  const loadEntitlements = async () => {
    setIsLoading(true);
    try {
      const ent = await getUserEntitlements();
      setEntitlements(ent);
    } catch {
      setEntitlements(null);
    }
    setIsLoading(false);
  };

  const handleViewCircle = () => {
    // Navigate to Briefings (now a non-tab route after 5-tab restructure)
    router.push('/brief');
  };

  // Demo data - in production, this would come from Circle membership
  const circleName = 'Sensory Support Group';
  const circleRole = 'Member'; // or 'Circle Coordinator'
  const memberCount = 5;

  if (!entitlements?.hasCircle) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.textPrimary} size={24} />
          </Pressable>
          <Text maxFontSizeMultiplier={1.5} style={styles.headerTitle}>Circle Membership</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Users color={colors.textTertiary} size={48} />
          <Text maxFontSizeMultiplier={1.5} style={styles.emptyStateText}>No Active Circle</Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.emptyStateSubtext}>
            Join or create a Circle from the Pricing page
          </Text>
          <Pressable
            style={styles.upgradeButton}
            onPress={() => router.push('/upgrade')}
          >
            <Text maxFontSizeMultiplier={1.5} style={styles.upgradeButtonText}>View Plans</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
        <Text maxFontSizeMultiplier={1.5} style={styles.headerTitle}>Circle Membership</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Circle Info Card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.circleCard}>
            <View style={styles.circleHeader}>
              <View style={styles.circleIconContainer}>
                <Users color="#0E8C7B" size={24} />
              </View>
              <View style={styles.circleInfo}>
                <Text maxFontSizeMultiplier={1.5} style={styles.circleName}>{circleName}</Text>
                <Text maxFontSizeMultiplier={1.5} style={styles.circleMeta}>{memberCount} members</Text>
              </View>
            </View>

            {/* Role Badge */}
            <View style={styles.roleBadge}>
              <UserCheck color="#0E8C7B" size={14} />
              <Text maxFontSizeMultiplier={1.5} style={styles.roleBadgeText}>{circleRole}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.section}>
            <Text maxFontSizeMultiplier={1.5} style={styles.sectionLabel}>ACTIONS</Text>

            {/* View Circle */}
            <Pressable style={styles.actionRow} onPress={handleViewCircle}>
              <View style={styles.actionIconContainer}>
                <ExternalLink color="#0E8C7B" size={18} />
              </View>
              <View style={styles.actionContent}>
                <Text maxFontSizeMultiplier={1.5} style={styles.actionLabel}>View Circle</Text>
                <Text maxFontSizeMultiplier={1.5} style={styles.actionSublabel}>Open in Briefings tab</Text>
              </View>
            </Pressable>

            {/* Privacy Info */}
            <Pressable style={styles.actionRow} onPress={() => router.push('/security-controls')}>
              <View style={styles.actionIconContainer}>
                <Shield color={colors.textSecondary} size={18} />
              </View>
              <View style={styles.actionContent}>
                <Text maxFontSizeMultiplier={1.5} style={styles.actionLabel}>Privacy & Permissions</Text>
                <Text maxFontSizeMultiplier={1.5} style={styles.actionSublabel}>What Circle members can see</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Info Box */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={styles.infoBox}>
            <Text maxFontSizeMultiplier={1.5} style={styles.infoTitle}>About Circles</Text>
            <Text maxFontSizeMultiplier={1.5} style={styles.infoText}>
              Circles enable trusted groups to share capacity awareness without exposing
              individual data. Each member controls what they share.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  upgradeButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  circleCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  circleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(45,212,191,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  circleMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: spacing.md,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0E8C7B',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  actionSublabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  dangerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#DC2626',
  },
  dangerSublabel: {
    fontSize: 12,
    color: 'rgba(220,38,38,0.6)',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: colors.textTertiary,
    lineHeight: 20,
  },
});
