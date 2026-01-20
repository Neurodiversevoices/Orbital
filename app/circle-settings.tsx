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
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Users,
  UserCheck,
  ExternalLink,
  LogOut,
  Shield,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { getUserEntitlements, type UserEntitlements } from '../lib/entitlements';
import {
  circlesGetMyConnections,
  circlesRevokeConnection,
  circlesWipeAll,
} from '../lib/circles';

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

  const [isLeaving, setIsLeaving] = useState(false);

  const executeLeaveCircle = async () => {
    setIsLeaving(true);
    try {
      // Get all connections and revoke each one
      const connections = await circlesGetMyConnections();
      for (const connection of connections) {
        try {
          await circlesRevokeConnection(connection.id);
        } catch (e) {
          // Continue even if one fails - best effort cleanup
          if (__DEV__) console.error('[CircleSettings] Failed to revoke connection:', e);
        }
      }

      // Wipe all local circles data (signals, invites, etc.)
      await circlesWipeAll();

      // Refresh entitlements to reflect change
      await loadEntitlements();

      if (Platform.OS === 'web') {
        window.alert('You have left the Circle.');
      } else {
        Alert.alert('Done', 'You have left the Circle.');
      }
      router.back();
    } catch (error) {
      if (__DEV__) console.error('[CircleSettings] Leave circle failed:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to leave Circle. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to leave Circle. Please try again.');
      }
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLeaveCircle = () => {
    const message = 'Are you sure you want to leave this Circle? You will lose access to shared capacity insights and all connections will be revoked.';

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        executeLeaveCircle();
      }
    } else {
      Alert.alert(
        'Leave Circle',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: executeLeaveCircle,
          },
        ]
      );
    }
  };

  const handleViewCircle = () => {
    // Navigate to Briefings tab with Circles view
    router.push('/(tabs)/brief');
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
          <Text style={styles.headerTitle}>Circle Membership</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Users color="rgba(255,255,255,0.3)" size={48} />
          <Text style={styles.emptyStateText}>No Active Circle</Text>
          <Text style={styles.emptyStateSubtext}>
            Join or create a Circle from the Pricing page
          </Text>
          <Pressable
            style={styles.upgradeButton}
            onPress={() => router.push('/upgrade')}
          >
            <Text style={styles.upgradeButtonText}>View Plans</Text>
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
        <Text style={styles.headerTitle}>Circle Membership</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Circle Info Card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.circleCard}>
            <View style={styles.circleHeader}>
              <View style={styles.circleIconContainer}>
                <Users color="#00E5FF" size={24} />
              </View>
              <View style={styles.circleInfo}>
                <Text style={styles.circleName}>{circleName}</Text>
                <Text style={styles.circleMeta}>{memberCount} members</Text>
              </View>
            </View>

            {/* Role Badge */}
            <View style={styles.roleBadge}>
              <UserCheck color="#10B981" size={14} />
              <Text style={styles.roleBadgeText}>{circleRole}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACTIONS</Text>

            {/* View Circle */}
            <Pressable style={styles.actionRow} onPress={handleViewCircle}>
              <View style={styles.actionIconContainer}>
                <ExternalLink color="#00E5FF" size={18} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>View Circle</Text>
                <Text style={styles.actionSublabel}>Open in Briefings tab</Text>
              </View>
            </Pressable>

            {/* Privacy Info */}
            <Pressable style={styles.actionRow} onPress={() => router.push('/security-controls')}>
              <View style={styles.actionIconContainer}>
                <Shield color="rgba(255,255,255,0.5)" size={18} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Privacy & Permissions</Text>
                <Text style={styles.actionSublabel}>What Circle members can see</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Leave Circle */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MEMBERSHIP</Text>
            <Pressable
              style={[styles.dangerRow, isLeaving && styles.dangerRowDisabled]}
              onPress={handleLeaveCircle}
              disabled={isLeaving}
            >
              <View style={styles.dangerIconContainer}>
                <LogOut color={isLeaving ? 'rgba(244,67,54,0.5)' : '#F44336'} size={18} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.dangerLabel, isLeaving && styles.dangerLabelDisabled]}>
                  {isLeaving ? 'Leaving...' : 'Leave Circle'}
                </Text>
                <Text style={styles.dangerSublabel}>Remove yourself from this Circle</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Info Box */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>About Circles</Text>
            <Text style={styles.infoText}>
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
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  upgradeButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#00E5FF',
    borderRadius: borderRadius.md,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  circleCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
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
    backgroundColor: 'rgba(0,229,255,0.1)',
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
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: spacing.md,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    color: 'rgba(255,255,255,0.9)',
  },
  actionSublabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.3)',
  },
  dangerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(244,67,54,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F44336',
  },
  dangerSublabel: {
    fontSize: 12,
    color: 'rgba(244,67,54,0.6)',
    marginTop: 2,
  },
  dangerRowDisabled: {
    opacity: 0.6,
  },
  dangerLabelDisabled: {
    color: 'rgba(244,67,54,0.5)',
  },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 20,
  },
});
