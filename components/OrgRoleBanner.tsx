/**
 * Org Role Banner Component
 *
 * Displays clear role clarity when in org-related modes:
 * - Labels user as "Participant"
 * - Explicit: "You are not being evaluated"
 * - Explicit: "Only aggregate patterns are shared"
 *
 * Visible in Today screen and Patterns screen for org modes.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Users, Shield, Eye, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { spacing, borderRadius } from '../theme';
import { AppMode, APP_MODE_CONFIGS } from '../types';

interface OrgRoleBannerProps {
  mode: AppMode;
  orgName?: string | null;
  compact?: boolean;
}

// Modes that should show the org role banner
const ORG_MODES: AppMode[] = ['employer', 'school_district', 'university', 'healthcare'];

export function OrgRoleBanner({ mode, orgName, compact = false }: OrgRoleBannerProps) {
  const router = useRouter();

  // Only show for org modes
  if (!ORG_MODES.includes(mode)) {
    return null;
  }

  const modeConfig = APP_MODE_CONFIGS[mode];

  if (compact) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.compactContainer}>
        <View style={[styles.compactBadge, { backgroundColor: `${modeConfig.accentColor}15` }]}>
          <Users size={12} color={modeConfig.accentColor} />
          <Text style={[styles.compactBadgeText, { color: modeConfig.accentColor }]}>
            Participant
          </Text>
        </View>
        <Text style={styles.compactText}>Your individual data is never shared</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Role Label */}
      <View style={styles.header}>
        <View style={[styles.roleBadge, { backgroundColor: `${modeConfig.accentColor}20` }]}>
          <Users size={14} color={modeConfig.accentColor} />
          <Text style={[styles.roleText, { color: modeConfig.accentColor }]}>
            Participant
          </Text>
        </View>
        {orgName && (
          <Text style={styles.orgName}>{orgName}</Text>
        )}
      </View>

      {/* Reassurance Points */}
      <View style={styles.reassuranceContainer}>
        <View style={styles.reassuranceItem}>
          <View style={styles.reassuranceIcon}>
            <Shield size={14} color="#4CAF50" />
          </View>
          <Text style={styles.reassuranceText}>
            You are <Text style={styles.reassuranceEmphasis}>not being evaluated</Text>
          </Text>
        </View>

        <View style={styles.reassuranceItem}>
          <View style={styles.reassuranceIcon}>
            <Eye size={14} color="#4CAF50" />
          </View>
          <Text style={styles.reassuranceText}>
            Only <Text style={styles.reassuranceEmphasis}>aggregate patterns</Text> are shared
          </Text>
        </View>
      </View>

      {/* Learn More Link */}
      <Pressable style={styles.learnMore} onPress={() => router.push('/your-data')}>
        <Text style={styles.learnMoreText}>Learn about your privacy</Text>
        <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(76,175,80,0.06)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.15)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(76,175,80,0.06)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  compactBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  compactText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orgName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  reassuranceContainer: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  reassuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reassuranceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76,175,80,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassuranceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  reassuranceEmphasis: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  learnMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  learnMoreText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
});
